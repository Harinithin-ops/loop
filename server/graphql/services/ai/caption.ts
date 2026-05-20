/**
 * AI Image Caption Generator Service
 * Model: Salesforce/blip-image-captioning-base via Hugging Face Inference API
 */

import dotenv from 'dotenv';
dotenv.config();

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_URL = 'https://router.huggingface.co/hf-inference/models/Salesforce/blip-image-captioning-base';

export interface ImageCaptionResult {
  caption: string;
  hashtags: string[];
  emojis: string[];
}

/**
 * Generates captions and suggestions for a given image
 * @param imageBuffer Raw image data or image URL
 */
export async function generateImageCaption(imageBuffer: Buffer): Promise<ImageCaptionResult> {
  if (!HF_API_KEY) {
    console.warn("HF_API_KEY is not defined. Returning dummy caption.");
    return {
      caption: "A beautiful creative post on Loop.",
      hashtags: ["#LoopCreative", "#AIStudio"],
      emojis: ["✨", "🎨"]
    };
  }

  try {
    const response = await fetch(MODEL_URL, {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/octet-stream',
      },
      method: 'POST',
      body: imageBuffer as any,
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Process BLIP output: [{ generated_text: "..." }]
    if (Array.isArray(result) && result[0]?.generated_text) {
      const caption = result[0].generated_text;
      
      // Basic post-processing to generate hashtags and emojis
      const hashtags = caption
        .split(' ')
        .filter((word: string) => word.length > 3)
        .slice(0, 3)
        .map((word: string) => `#${word.charAt(0).toUpperCase() + word.slice(1).replace(/[^a-zA-Z0-9]/g, '')}`);
      
      const emojis = ["✨", "🚀", "🔥", "💻", "🎨"];
      const selectedEmojis = [emojis[Math.floor(Math.random() * emojis.length)], emojis[Math.floor(Math.random() * emojis.length)]];

      return {
        caption,
        hashtags: [...new Set([...hashtags, "#AIStudio", "#LoopSocial"])],
        emojis: selectedEmojis
      };
    }

    throw new Error("Invalid response format from caption model");
  } catch (error) {
    console.error('Error in generateImageCaption:', error);
    return {
      caption: "Explore creativity on Loop.",
      hashtags: ["#LoopSocial", "#Creativity"],
      emojis: ["🎨", "🌟"]
    };
  }
}
