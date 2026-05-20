export const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    username: String!
    name: String
    avatar: String
    coverBanner: String
    bio: String
    creatorScore: Int!
    isVerified: Boolean!
    createdAt: String!
    updatedAt: String!
    posts: [Post!]!
    followers: [Follower!]!
    following: [Follower!]!
  }

  type Post {
    id: ID!
    caption: String
    imageUrl: String
    tone: String
    type: String!
    location: String
    authorId: String!
    author: User!
    likes: [Like!]!
    comments: [Comment!]!
    createdAt: String!
    updatedAt: String!
  }

  type Comment {
    id: ID!
    content: String!
    toxicityScore: Float
    authorId: String!
    author: User!
    postId: String!
    post: Post!
    parentId: String
    replies: [Comment!]!
    createdAt: String!
  }

  type Like {
    id: ID!
    userId: String!
    postId: String!
    createdAt: String!
  }

  type Follower {
    id: ID!
    followerId: String!
    followingId: String!
    createdAt: String!
  }

  type Chat {
    id: ID!
    name: String
    isGroup: Boolean!
    messages: [Message!]!
    createdAt: String!
  }

  type Message {
    id: ID!
    content: String!
    translatedText: String
    senderId: String!
    sender: User!
    chatId: String!
    createdAt: String!
  }

  type ImageCaptionResult {
    caption: String!
    hashtags: [String!]!
    emojis: [String!]!
  }

  type FakeNewsResult {
    isFake: Boolean!
    score: Float!
    label: String!
  }

  type ToxicityResult {
    isToxic: Boolean!
    score: Float!
    label: String!
  }

  type TranslationResult {
    translatedText: String!
    sourceLanguage: String!
    targetLanguage: String!
  }

  type Query {
    hello: String
    me(userId: ID!): User
    users: [User!]!
    user(id: ID!): User
    posts: [Post!]!
    post(id: ID!): Post
    feed(userId: ID!): [Post!]!
    comments(postId: ID!): [Comment!]!
    chats(userId: ID!): [Chat!]!

    # AI Endpoints
    detectFakeNews(content: String!): FakeNewsResult!
    detectToxicity(text: String!): ToxicityResult!
    translateText(text: String!, targetLanguage: String): TranslationResult!
  }

  type Mutation {
    createPost(authorId: ID!, caption: String, imageUrl: String, tone: String, type: String, location: String): Post!
    likePost(userId: ID!, postId: ID!): Like!
    createComment(authorId: ID!, postId: ID!, content: String!, parentId: ID): Comment!
    sendMessage(senderId: ID!, chatId: ID!, content: String!): Message!
    generateImageCaptionBase64(imageBufferBase64: String!): ImageCaptionResult!
  }

  type Subscription {
    messageSent(chatId: ID!): Message!
    commentAdded(postId: ID!): Comment!
    postLiked(postId: ID!): Like!
  }
`;
