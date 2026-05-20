"use client";

import React, { useState, useEffect } from "react";

export default function AiStudio() {
  const [captionInput, setCaptionInput] = useState("");
  const [captionTone, setCaptionTone] = useState("Cyberpunk");
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  const [toxicityInput, setToxicityInput] = useState("");
  const [toxicityResult, setToxicityResult] = useState<{ score: number; label: string; color: string } | null>(null);

  const [factInput, setFactInput] = useState("");
  const [factResult, setFactResult] = useState<{ score: number; label: string; details: string } | null>(null);

  const [translateInput, setTranslateInput] = useState("");
  const [translateLang, setTranslateLang] = useState("Spanish");
  const [translatedText, setTranslatedText] = useState("");

  const phrases = [
    "Analyzing feed performance...",
    "Checking content toxicity...",
    "Generating viral captions...",
    "Predicting engagement...",
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx((prev) => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Caption Generator handler
  const handleGenerateCaptions = async () => {
    if (!captionInput.trim()) return;
    setIsGeneratingCaption(true);

    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: captionInput, tone: captionTone }),
      });
      const data = await res.json();
      if (data.captions && data.captions.length > 0) {
        setGeneratedCaptions(data.captions);
      } else {
        // Fallback to simulated if API response is not fully formatted
        setGeneratedCaptions([
          `⚡ Deep within the neon circuits of "${captionInput}". #CyberAesthetic #Lumina`,
          `✨ Synthesizing organic digital waves inspired by "${captionInput}".`,
          `🌌 Neural matrices humming to the tune of "${captionInput}".`,
        ]);
      }
    } catch (err) {
      console.error(err);
      setGeneratedCaptions([
        `⚡ Deep within the neon circuits of "${captionInput}". #CyberAesthetic #Lumina`,
        `✨ Synthesizing organic digital waves inspired by "${captionInput}".`,
        `🌌 Neural matrices humming to the tune of "${captionInput}".`,
      ]);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // Toxicity Checker handler
  const handleCheckToxicity = async (val: string) => {
    setToxicityInput(val);
    if (!val.trim()) {
      setToxicityResult(null);
      return;
    }

    try {
      const res = await fetch("/api/ai/toxicity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: val }),
      });
      const data = await res.json();
      if (data.label) {
        setToxicityResult({
          score: data.score,
          label: data.label,
          color: data.color,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fact Guard checker handler
  const handleCheckFact = async () => {
    if (!factInput.trim()) return;

    try {
      const res = await fetch("/api/ai/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: factInput }),
      });
      const data = await res.json();
      if (data.label) {
        setFactResult({
          score: data.score,
          label: data.label,
          details: data.details,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Translator handler
  const handleTranslate = async () => {
    if (!translateInput.trim()) return;

    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translateInput, targetLang: translateLang }),
      });
      const data = await res.json();
      if (data.translatedText) {
        setTranslatedText(data.translatedText);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pt-20 pb-32 md:py-0 max-w-2xl mx-auto space-y-6">
      {/* AI Assistant Greeting */}
      <section className="glass-panel p-6 rounded-lg border-white/50 relative overflow-hidden shadow-xl bg-white/70">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-3xl">smart_toy</span>
          </div>
          <div>
            <h2 className="font-bold text-2xl font-headline-md text-on-surface">Hello, Creative</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-1">
              Ready to amplify your presence? Our AI models are primed for your next masterpiece.
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-black/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="font-bold text-[11px] font-label-caps text-primary tracking-widest uppercase transition-all duration-300">
            {phrases[phraseIdx]}
          </span>
        </div>
      </section>

      {/* Asymmetric Bento Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Caption Generator Panel */}
        <div className="md:col-span-2 glass-panel p-5 rounded-lg border-white/50 shadow-md flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary p-1 bg-primary/10 rounded-md">auto_stories</span>
              <h3 className="font-bold text-lg font-headline-sm text-on-surface">Caption Generator</h3>
            </div>
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold font-label-caps">
              POPULAR
            </span>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Draft context-aware hooks, storytelling headers, and optimal hashtag combinations instantly.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="What are you sharing? (e.g., golden sunset, code render)"
              className="flex-1 bg-white/60 border border-black/5 rounded-full px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none font-sans"
            />
            <select
              value={captionTone}
              onChange={(e) => setCaptionTone(e.target.value)}
              className="bg-white/60 border border-black/5 rounded-full px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-transparent outline-none font-sans text-primary font-bold cursor-pointer"
            >
              <option value="Cyberpunk">Cyberpunk</option>
              <option value="Minimalist">Minimalist</option>
              <option value="Hype">Hype</option>
            </select>
          </div>

          <button
            onClick={handleGenerateCaptions}
            className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary hover:opacity-90 active:scale-[0.98] transition-all text-white font-bold font-label-caps text-xs rounded-full shadow-lg shadow-primary/25"
          >
            {isGeneratingCaption ? "LAUNCHING CREATOR..." : "GENERATE AI CAPTION"}
          </button>

          {generatedCaptions.length > 0 && (
            <div className="p-3 bg-surface-container-low/50 rounded-lg border border-primary/10 space-y-2 max-h-40 overflow-y-auto no-scrollbar">
              <p className="text-[10px] font-bold text-primary tracking-widest uppercase font-label-caps">
                AI Suggestion Outputs:
              </p>
              {generatedCaptions.map((cap, i) => (
                <div
                  key={i}
                  onClick={() => {
                    navigator.clipboard.writeText(cap);
                    alert("Copied to clipboard!");
                  }}
                  className="p-2 bg-white/80 border border-black/5 hover:border-primary/30 rounded cursor-pointer text-xs text-on-surface transition-all"
                >
                  {cap}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toxicity Checking Panel */}
        <div className="glass-panel p-5 rounded-lg border-white/50 shadow-md flex flex-col space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error p-1 bg-error-container/20 rounded-md">security</span>
            <h4 className="font-bold text-sm font-headline-sm text-on-surface">Community Toxicity Guard</h4>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Verify if comment templates or bios comply with safe platform guidelines.
          </p>
          <input
            type="text"
            value={toxicityInput}
            onChange={(e) => handleCheckToxicity(e.target.value)}
            placeholder="Type content to check toxicity..."
            className="w-full bg-white/60 border border-black/5 rounded-full px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-sans"
          />
          {toxicityResult && (
            <div className={`p-3 rounded-lg border text-xs font-semibold ${toxicityResult.color}`}>
              <div className="flex justify-between items-center">
                <span>{toxicityResult.label}</span>
                <span className="text-[10px] font-bold font-label-caps uppercase">{toxicityResult.score}% Rating</span>
              </div>
            </div>
          )}
        </div>

        {/* Fact Guard authenticity Panel */}
        <div className="glass-panel p-5 rounded-lg border-white/50 shadow-md flex flex-col space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary p-1 bg-tertiary-fixed/30 rounded-md">fact_check</span>
            <h4 className="font-bold text-sm font-headline-sm text-on-surface">Fact Guard Checker</h4>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Instantly scan factual statements to evaluate potential accuracy ratings.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={factInput}
              onChange={(e) => setFactInput(e.target.value)}
              placeholder="e.g., Flat Earth is real"
              className="flex-1 bg-white/60 border border-black/5 rounded-full px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-sans"
            />
            <button
              onClick={handleCheckFact}
              className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold font-label-caps shadow active:scale-95 transition-all"
            >
              SCAN
            </button>
          </div>
          {factResult && (
            <div className="p-3 bg-surface-container-high/60 border border-black/5 rounded-lg text-xs space-y-1">
              <div className="flex justify-between items-center font-bold">
                <span className={factResult.score > 50 ? "text-primary" : "text-error"}>{factResult.label}</span>
                <span>{factResult.score}% Accuracy</span>
              </div>
              <p className="text-[10px] text-on-surface-variant leading-snug">{factResult.details}</p>
            </div>
          )}
        </div>

        {/* Global Voice Translation */}
        <div className="glass-panel p-5 rounded-lg border-white/50 shadow-md flex flex-col space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary p-1 bg-primary/10 rounded-md">translate</span>
            <h4 className="font-bold text-sm font-headline-sm text-on-surface">Global Voice Translation</h4>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Translate multi-lingual phrases dynamically across 100+ native locales.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={translateInput}
              onChange={(e) => setTranslateInput(e.target.value)}
              placeholder="e.g., hello digital world"
              className="flex-1 bg-white/60 border border-black/5 rounded-full px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-sans"
            />
            <select
              value={translateLang}
              onChange={(e) => setTranslateLang(e.target.value)}
              className="bg-white/60 border border-black/5 rounded-full px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary font-sans text-primary font-semibold cursor-pointer"
            >
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
            </select>
          </div>
          <button
            onClick={handleTranslate}
            className="w-full py-2 bg-primary hover:bg-primary-container text-white rounded-full text-xs font-bold font-label-caps shadow active:scale-95 transition-all"
          >
            TRANSLATE
          </button>
          {translatedText && (
            <div className="p-3 bg-primary-fixed/20 border border-primary/10 rounded-lg text-xs font-semibold text-primary">
              {translatedText}
            </div>
          )}
        </div>

        {/* Feed Insights */}
        <div className="glass-panel p-5 rounded-lg border-white/50 shadow-md flex flex-col space-y-2 relative overflow-hidden group">
          <h4 className="font-bold text-sm font-headline-sm text-on-surface">Feed Insights</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Predictive analysis of content performance vectors across categories.
          </p>
          <div className="flex gap-1.5 items-end h-10 pt-2">
            <div className="w-1.5 bg-primary/20 rounded-full h-4 animate-bounce"></div>
            <div className="w-1.5 bg-primary/40 rounded-full h-8 animate-bounce delay-75"></div>
            <div className="w-1.5 bg-primary rounded-full h-6 animate-bounce delay-150"></div>
            <div className="w-1.5 bg-primary/60 rounded-full h-10 animate-bounce delay-200"></div>
            <div className="w-1.5 bg-secondary rounded-full h-7 animate-bounce delay-300"></div>
          </div>
        </div>
      </div>

      {/* Global AI Pulse */}
      <section className="glass-panel p-5 rounded-lg border-white/50 shadow-md bg-white/40">
        <h3 className="font-bold text-[11px] font-label-caps text-outline uppercase tracking-widest mb-3">
          Global AI Pulse
        </h3>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-black/5">
              <span className="material-symbols-outlined text-primary text-[20px]">monitoring</span>
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant font-bold font-label-caps leading-none">
                PROCESSING SPEED
              </p>
              <p className="font-bold text-base font-headline-sm mt-0.5">
                1.2s <span className="text-xs text-primary font-normal">Avg</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-primary font-bold text-base">99.9%</span>
            <p className="text-[9px] text-outline font-semibold font-label-caps uppercase">Accuracy</p>
          </div>
        </div>
      </section>

      {/* Atmospheric Image Banner */}
      <div className="w-full h-48 rounded-lg overflow-hidden relative shadow-md">
        <img
          src="/images/avatar_sarah_1779191804823.png"
          alt="Atmospheric visuals"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
          <p className="text-white text-xs font-semibold">AI Model &ldquo;Lumina-4&rdquo; is currently active.</p>
        </div>
      </div>
    </div>
  );
}

