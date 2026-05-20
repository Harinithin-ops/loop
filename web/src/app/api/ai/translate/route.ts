import { NextRequest, NextResponse } from "next/server";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = "facebook/nllb-200-distilled-600M";

export async function POST(req: NextRequest) {
  const { text, targetLang } = await req.json();
  if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

  const models: Record<string, string> = {
    Spanish: "Helsinki-NLP/opus-mt-en-es",
    French: "Helsinki-NLP/opus-mt-en-fr",
  };

  const selectedModel = models[targetLang] || models.Spanish;

  // Check if API key is a placeholder or not provided
  const isPlaceholderKey = !HF_API_KEY || HF_API_KEY.startsWith("your_");

  if (isPlaceholderKey) {
    const mocks: Record<string, Record<string, string>> = {
      Spanish: {
        "hello": "hola",
        "hello digital world": "hola mundo digital",
        "creative": "creativo",
        "social media": "medios de comunicación social",
      },
      French: {
        "hello": "bonjour",
        "hello digital world": "bonjour monde numérique",
        "creative": "créatif",
        "social media": "médias sociaux",
      }
    };
    const textLower = text.toLowerCase().trim();
    const result = mocks[targetLang]?.[textLower] || `[Simulated ${targetLang}]: ${text}`;
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay
    return NextResponse.json({ translatedText: result });
  }

  try {
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${selectedModel}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
        }),
      }
    );

    if (!response.ok) {
      // If unauthorized or error, fallback to mock instead of failing
      if (response.status === 401 || response.status === 403) {
        const result = `[Simulated ${targetLang}]: ${text}`;
        return NextResponse.json({ translatedText: result });
      }

      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    // Opus-MT models return an array: [{ translation_text: "..." }]
    const result = data[0]?.translation_text || `[${targetLang} Translation]: ${text}`;

    return NextResponse.json({ translatedText: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
