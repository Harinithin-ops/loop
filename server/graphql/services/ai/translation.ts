/**
 * AI Auto Translation Service
 * Model: facebook/mbart-large-50-many-to-many-mmt via Hugging Face Inference API
 */

import dotenv from 'dotenv';
dotenv.config();

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_URL = 'https://api-inference.huggingface.co/models/facebook/mbart-large-50-many-to-many-mmt';

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Translates content into the desired target language using Hugging Face
 * @param text The source text to translate
 * @param targetLanguage Target language code (e.g. "en_XX", "es_XX", "fr_XX", "de_DE")
 */
export async function translateText(text: string, targetLanguage: string = "en_XX"): Promise<TranslationResult> {
  if (!HF_API_KEY) {
    console.warn("HF_API_KEY is not defined. Returning source text.");
    return { translatedText: text, sourceLanguage: 'auto', targetLanguage };
  }

  try {
    const response = await fetch(MODEL_URL, {
      headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({
        inputs: text,
        parameters: {
          forced_bos_token: targetLanguage
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (Array.isArray(result) && result[0]?.translation_text) {
      return {
        translatedText: result[0].translation_text,
        sourceLanguage: 'auto',
        targetLanguage
      };
    }

    throw new Error("Invalid response format from translation model");
  } catch (error) {
    console.error('Error in translateText:', error);
    return { translatedText: text, sourceLanguage: 'auto', targetLanguage };
  }
}
