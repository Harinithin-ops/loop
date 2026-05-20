import { NextRequest, NextResponse } from "next/server";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

export async function POST(req: NextRequest) {
  const { topic, tone } = await req.json();
  if (!topic) return NextResponse.json({ error: "Topic is required" }, { status: 400 });

  const toneGuide: Record<string, string> = {
    Cyberpunk:
      "Write in a dark, neon-futuristic, cyberpunk style with emojis like ⚡🌌✨. Use dystopian metaphors.",
    Minimalist:
      "Write in a calm, clean, minimalist style. No emojis. Short sentences. Zen-like.",
    Hype:
      "Write in an ultra-energetic hype style with 🚀🔥💡 emojis. All-caps words, exciting exclamations.",
  };

  const prompt = `[INST] You are a social media caption expert. Generate exactly 3 short, viral social media captions about "${topic}". ${toneGuide[tone] || toneGuide.Hype} Return only a numbered list: 1. ... 2. ... 3. ... [/INST]`;

  // Check if API key is a placeholder or not provided
  const isPlaceholderKey = !HF_API_KEY || HF_API_KEY.startsWith("your_");

  if (isPlaceholderKey) {
    let captions: string[] = [];
    if (tone === "Cyberpunk") {
      captions = [
        `⚡ Deep within the neon circuits of "${topic}". #CyberAesthetic #Lumina`,
        `✨ Synthesizing organic digital waves inspired by "${topic}".`,
        `🌌 Neural matrices humming to the tune of "${topic}". #LoopAI`,
      ];
    } else if (tone === "Minimalist") {
      captions = [
        `The essence of "${topic}".`,
        `Simplicity refined: "${topic}".`,
        `A quiet reflection on "${topic}".`,
      ];
    } else {
      captions = [
        `🚀 🔥 BOOM! Elevating the game with "${topic}"! Let's go! #Hype`,
        `💥 This is next level! "${topic}" is absolutely crushing it! 🚀`,
        `✨ Get ready to be blown away by "${topic}"! 🔥 #Unstoppable`,
      ];
    }
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay
    return NextResponse.json({ captions });
  }

  try {
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 256,
            temperature: 0.85,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      // If unauthorized, fallback to mock instead of failing
      if (response.status === 401 || response.status === 403) {
        let captions: string[] = [];
        if (tone === "Cyberpunk") {
          captions = [
            `⚡ Deep within the neon circuits of "${topic}". #CyberAesthetic #Lumina`,
            `✨ Synthesizing organic digital waves inspired by "${topic}".`,
            `🌌 Neural matrices humming to the tune of "${topic}". #LoopAI`,
          ];
        } else if (tone === "Minimalist") {
          captions = [
            `The essence of "${topic}".`,
            `Simplicity refined: "${topic}".`,
            `A quiet reflection on "${topic}".`,
          ];
        } else {
          captions = [
            `🚀 🔥 BOOM! Elevating the game with "${topic}"! Let's go! #Hype`,
            `💥 This is next level! "${topic}" is absolutely crushing it! 🚀`,
            `✨ Get ready to be blown away by "${topic}"! 🔥 #Unstoppable`,
          ];
        }
        return NextResponse.json({ captions });
      }

      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    const raw: string = data[0]?.generated_text || "";

    // Parse numbered list
    const lines = raw
      .split("\n")
      .map((l: string) => l.replace(/^\d+\.\s*/, "").trim())
      .filter((l: string) => l.length > 10);

    const captions = lines.slice(0, 3);

    return NextResponse.json({ captions });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
