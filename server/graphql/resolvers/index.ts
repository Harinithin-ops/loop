import prisma from '../utils/db';
import { detectFakeNews } from '../services/ai/fakeNews';
import { detectToxicity } from '../services/ai/toxicity';
import { translateText } from '../services/ai/translation';
import { generateImageCaption } from '../services/ai/caption';
import { rankFeed } from '../services/ai/recommendation';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export const resolvers = {
  Query: {
    hello: () => 'Hello from Loop AI Server!',
    me: async (_: any, { userId }: { userId: string }) => {
      return await prisma.user.findUnique({ where: { id: userId } });
    },
    users: async () => {
      return await prisma.user.findMany();
    },
    user: async (_: any, { id }: { id: string }) => {
      return await prisma.user.findUnique({ where: { id } });
    },
    posts: async () => {
      return await prisma.post.findMany({
        orderBy: { createdAt: 'desc' }
      });
    },
    post: async (_: any, { id }: { id: string }) => {
      return await prisma.post.findUnique({ where: { id } });
    },
    feed: async (_: any, { userId }: { userId: string }) => {
      // Get the user and their saves to build a profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { saves: { include: { post: true } }, likes: { include: { post: true } } }
      });
      
      const allPosts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit candidate pool
      });
      
      if (!user) return allPosts;

      // Extract a simplified profile string based on recent interactions
      const profileItems = [
        user.bio || '',
        ...user.saves.map((s: any) => s.post.caption || ''),
        ...user.likes.map((l: any) => l.post.caption || '')
      ];
      
      if (profileItems.join('').trim() === '') return allPosts;

      // Map to format for recommendation engine
      const candidates = allPosts.map((p: any) => ({
        id: p.id,
        content: (p.caption || '') + ' ' + (p.tone || '') + ' ' + (p.type || '')
      }));

      // Get ranked IDs
      const rankedIds = await rankFeed(profileItems.join(' '), candidates);
      
      // Map back to posts and sort by the ranked IDs order
      return allPosts.sort((a: any, b: any) => {
        const aIndex = rankedIds.indexOf(a.id);
        const bIndex = rankedIds.indexOf(b.id);
        return (aIndex > -1 ? aIndex : 999) - (bIndex > -1 ? bIndex : 999);
      });
    },
    comments: async (_: any, { postId }: { postId: string }) => {
      return await prisma.comment.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' }
      });
    },
    chats: async (_: any, { userId }: { userId: string }) => {
      return await prisma.chat.findMany({
        where: { members: { some: { userId } } },
        include: { members: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
      });
    },

    // AI Queries
    detectFakeNews: async (_: any, { content }: { content: string }) => {
      return await detectFakeNews(content);
    },
    detectToxicity: async (_: any, { text }: { text: string }) => {
      return await detectToxicity(text);
    },
    translateText: async (_: any, { text, targetLanguage }: { text: string, targetLanguage?: string }) => {
      return await translateText(text, targetLanguage);
    }
  },

  Mutation: {
    createPost: async (_: any, args: any) => {
      const { authorId, caption, imageUrl, tone, type, location } = args;
      const newPost = await prisma.post.create({
        data: {
          authorId,
          caption,
          imageUrl,
          tone,
          type: type || "FEED",
          location
        }
      });
      return newPost;
    },
    likePost: async (_: any, { userId, postId }: { userId: string, postId: string }) => {
      // Simplistic create or ignore if already liked (could use upsert/find first)
      const existing = await prisma.like.findUnique({
        where: { userId_postId: { userId, postId } }
      });
      if (existing) return existing;

      const like = await prisma.like.create({
        data: { userId, postId }
      });
      pubsub.publish('POST_LIKED', { postLiked: like });
      return like;
    },
    createComment: async (_: any, { authorId, postId, content, parentId }: any) => {
      // Check toxicity before allowing comment
      const toxicity = await detectToxicity(content);
      
      const newComment = await prisma.comment.create({
        data: {
          authorId,
          postId,
          content,
          parentId,
          toxicityScore: toxicity.score
        }
      });
      
      pubsub.publish('COMMENT_ADDED', { commentAdded: newComment });
      return newComment;
    },
    sendMessage: async (_: any, { senderId, chatId, content }: any) => {
      const newMessage = await prisma.message.create({
        data: {
          senderId,
          chatId,
          content
        }
      });
      
      pubsub.publish('MESSAGE_SENT', { messageSent: newMessage });
      return newMessage;
    },
    generateImageCaptionBase64: async (_: any, { imageBufferBase64 }: { imageBufferBase64: string }) => {
      const buffer = Buffer.from(imageBufferBase64, 'base64');
      return await generateImageCaption(buffer);
    }
  },

  Subscription: {
    messageSent: {
      subscribe: () => pubsub.asyncIterableIterator(['MESSAGE_SENT'])
    },
    commentAdded: {
      subscribe: () => pubsub.asyncIterableIterator(['COMMENT_ADDED'])
    },
    postLiked: {
      subscribe: () => pubsub.asyncIterableIterator(['POST_LIKED'])
    }
  },

  // Field Resolvers
  Post: {
    author: async (parent: any) => await prisma.user.findUnique({ where: { id: parent.authorId } }),
    likes: async (parent: any) => await prisma.like.findMany({ where: { postId: parent.id } }),
    comments: async (parent: any) => await prisma.comment.findMany({ where: { postId: parent.id, parentId: null } })
  },
  Comment: {
    author: async (parent: any) => await prisma.user.findUnique({ where: { id: parent.authorId } }),
    post: async (parent: any) => await prisma.post.findUnique({ where: { id: parent.postId } }),
    replies: async (parent: any) => await prisma.comment.findMany({ where: { parentId: parent.id } })
  },
  Message: {
    sender: async (parent: any) => await prisma.user.findUnique({ where: { id: parent.senderId } })
  },
  Chat: {
    messages: async (parent: any) => await prisma.message.findMany({ where: { chatId: parent.id }, orderBy: { createdAt: 'asc' } })
  }
};
