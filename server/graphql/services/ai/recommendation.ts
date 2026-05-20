/**
 * AI Feed Recommendation Engine Service
 * Model: sentence-transformers/all-MiniLM-L6-v2 via Hugging Face Inference API
 */

import dotenv from 'dotenv';
dotenv.config();

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

export interface PostVector {
  id: string;
  embedding: number[];
}

/**
 * Generates an embedding vector for a given text using Hugging Face
 * @param text The input text (post content, tags, bio, etc.)
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!HF_API_KEY) {
    console.warn("HF_API_KEY is not defined. Returning dummy embedding.");
    return new Array(384).fill(0); // all-MiniLM-L6-v2 outputs 384-dimensional embeddings
  }

  try {
    const response = await fetch(MODEL_URL, {
      headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const embedding = await response.json();
    if (Array.isArray(embedding)) {
      return embedding as number[];
    }
    throw new Error("Invalid response format from embedding model");
  } catch (error) {
    console.error('Error in getEmbedding:', error);
    return new Array(384).fill(0);
  }
}

/**
 * Computes the cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ranks posts based on user interests using embeddings
 * @param userProfileText Consolidated text of user likes, saves, history
 * @param candidatePosts Array of post candidates to rank
 */
export async function rankFeed(
  userProfileText: string,
  candidatePosts: Array<{ id: string; content: string }>
): Promise<string[]> {
  try {
    const userEmbedding = await getEmbedding(userProfileText);
    const scoredPosts = await Promise.all(
      candidatePosts.map(async (post) => {
        const postEmbedding = await getEmbedding(post.content);
        const similarity = cosineSimilarity(userEmbedding, postEmbedding);
        return { id: post.id, similarity };
      })
    );

    // Sort by highest similarity
    scoredPosts.sort((a, b) => b.similarity - a.similarity);
    return scoredPosts.map((p) => p.id);
  } catch (error) {
    console.error('Error ranking feed:', error);
    return candidatePosts.map((p) => p.id);
  }
}
