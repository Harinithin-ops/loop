/**
 * Toxicity Detection Service
 * Model: unitary/toxic-bert via Hugging Face Inference API
 */

import dotenv from 'dotenv';
dotenv.config();

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_URL = 'https://api-inference.huggingface.co/models/unitary/toxic-bert';

export interface ToxicityResult {
  isToxic: boolean;
  score: number;
  label: string;
  details: Record<string, number>;
}

/**
 * Analyzes text for toxicity using Hugging Face
 * @param text The comment or post content to check
 */
export async function detectToxicity(text: string): Promise<ToxicityResult> {
  if (!HF_API_KEY) {
    console.warn("HF_API_KEY is not defined. Skipping AI Toxicity check.");
    return { isToxic: false, score: 0, label: 'neutral', details: {} };
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

    const result = await response.json();
    
    // Process unitary/toxic-bert output structure
    // Typically returns an array of label/score arrays or objects
    if (Array.isArray(result) && Array.isArray(result[0])) {
      const predictions = result[0];
      const details: Record<string, number> = {};
      let maxScore = 0;
      let primaryLabel = 'neutral';

      predictions.forEach((pred: { label: string; score: number }) => {
        details[pred.label] = pred.score;
        if (pred.score > maxScore) {
          maxScore = pred.score;
          primaryLabel = pred.label;
        }
      });

      // Threshold check for toxicity (e.g. > 0.7 for "toxic" labels)
      const toxicLabels = ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'];
      const isToxic = predictions.some(
        (pred: { label: string; score: number }) => toxicLabels.includes(pred.label) && pred.score > 0.7
      );

      return {
        isToxic,
        score: maxScore,
        label: primaryLabel,
        details
      };
    }

    return { isToxic: false, score: 0, label: 'neutral', details: {} };
  } catch (error) {
    console.error('Error in detectToxicity:', error);
    return { isToxic: false, score: 0, label: 'neutral', details: {} };
  }
}
