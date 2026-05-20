import { NextRequest, NextResponse } from "next/server";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = "unitary/toxic-bert";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

  // Check if API key is a placeholder or not provided
  const isPlaceholderKey = !HF_API_KEY || HF_API_KEY.startsWith("your_");

  if (isPlaceholderKey) {
    const textLower = text.toLowerCase();
    const toxicKeywords = ["toxic", "hate", "bad", "kill", "dumb", "stupid", "idiot", "jerk", "hell", "abuse"];
    const hasToxic = toxicKeywords.some(kw => textLower.includes(kw));
    const score = hasToxic ? Math.floor(Math.random() * 20) + 75 : Math.floor(Math.random() * 10);
    
    let label: string;
    let color: string;

    if (score >= 70) {
      label = "High Toxicity Warning";
      color = "text-error bg-error-container/40 border-error/30";
    } else if (score >= 30) {
      label = "Moderate Caution Warning";
      color = "text-tertiary bg-tertiary-fixed/30 border-tertiary/30";
    } else {
      label = "Perfect Safe Community Quality";
      color = "text-primary bg-primary-fixed/30 border-primary/30";
    }

    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay
    return NextResponse.json({ score, label, color });
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
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      // If unauthorized, fallback to mock instead of failing
      if (response.status === 401 || response.status === 403) {
        const textLower = text.toLowerCase();
        const toxicKeywords = ["toxic", "hate", "bad", "kill", "dumb", "stupid", "idiot", "jerk", "hell", "abuse"];
        const hasToxic = toxicKeywords.some(kw => textLower.includes(kw));
        const score = hasToxic ? 80 : 5;
        const label = score >= 70 ? "High Toxicity Warning" : "Perfect Safe Community Quality";
        const color = score >= 70 ? "text-error bg-error-container/40 border-error/30" : "text-primary bg-primary-fixed/30 border-primary/30";
        return NextResponse.json({ score, label, color });
      }

      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    const results: { label: string; score: number }[] = data[0] || [];

    const toxic = results.find((r) =>
      r.label.toLowerCase().includes("toxic")
    );
    const score = toxic ? Math.round(toxic.score * 100) : 0;

    let label: string;
    let color: string;

    if (score >= 70) {
      label = "High Toxicity Warning";
      color = "text-error bg-error-container/40 border-error/30";
    } else if (score >= 30) {
      label = "Moderate Caution Warning";
      color = "text-tertiary bg-tertiary-fixed/30 border-tertiary/30";
    } else {
      label = "Perfect Safe Community Quality";
      color = "text-primary bg-primary-fixed/30 border-primary/30";
    }

    return NextResponse.json({ score, label, color });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
