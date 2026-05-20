/**
 * AI Fake News Detection Service
 * Model: hamzab/roberta-fake-news-classification via Hugging Face Inference API
 */

import dotenv from 'dotenv';
dotenv.config();

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_URL = 'https://api-inference.huggingface.co/models/hamzab/roberta-fake-news-classification';

export interface FakeNewsResult {
  isFake: boolean;
  score: number;
  label: string;
}

/**
 * Classifies an article title or summary as real or fake news
 * @param content Text or article snippet to analyze
 */
export async function detectFakeNews(content: string): Promise<FakeNewsResult> {
  if (!HF_API_KEY) {
    console.warn("HF_API_KEY is not defined. Skipping Fake News classification.");
    return { isFake: false, score: 0, label: 'REAL' };
  }

  try {
    const response = await fetch(MODEL_URL, {
      headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ inputs: content }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Process classification output
    // Typically returns: [[{ label: "LABEL_0" (Real/Fake), score: 0.99 }, ...]]
    if (Array.isArray(result) && Array.isArray(result[0])) {
      const predictions = result[0];
      let maxScore = 0;
      let primaryLabel = 'REAL';

      predictions.forEach((pred: { label: string; score: number }) => {
        if (pred.score > maxScore) {
          maxScore = pred.score;
          primaryLabel = pred.label.toUpperCase();
        }
      });

      // Map labels (often models return LABEL_0 and LABEL_1 or FAKE and REAL)
      // We assume label containing "FAKE" or LABEL_0 represents fake, model dependent
      const isFake = primaryLabel.includes('FAKE') || primaryLabel === 'LABEL_0';

      return {
        isFake,
        score: maxScore,
        label: isFake ? 'FAKE' : 'REAL'
      };
    }

    return { isFake: false, score: 0, label: 'REAL' };
  } catch (error) {
    console.error('Error in detectFakeNews:', error);
    return { isFake: false, score: 0, label: 'REAL' };
  }
}
