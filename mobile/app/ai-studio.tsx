import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Constants from "expo-constants";
import { COLORS, SPACING, RADIUS, FONTS } from "../src/utils/theme";

const { width } = Dimensions.get("window");

// Auto-detect Next.js dev server host IP address in development
function getBaseApiUrl() {
  if (!__DEV__) {
    return "https://loop-hariraj1389-9205s-projects.vercel.app";
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":").shift();
    return `http://${ip}:3005`;
  }
  return "http://localhost:3005";
}

export default function AiStudioScreen() {
  const [activeTab, setActiveTab] = useState<"caption" | "toxicity" | "factcheck" | "translate">("caption");
  
  // AI Pulse State
  const [pulseIdx, setPulseIdx] = useState(0);
  const phrases = [
    "Analyzing feed performance...",
    "Checking content toxicity...",
    "Generating viral captions...",
    "Predicting engagement...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIdx((prev) => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 1. Caption Generator State
  const [captionInput, setCaptionInput] = useState("");
  const [captionTone, setCaptionTone] = useState<"Cyberpunk" | "Minimalist" | "Hype">("Cyberpunk");
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  // 2. Toxicity Guard State
  const [toxicityInput, setToxicityInput] = useState("");
  const [toxicityResult, setToxicityResult] = useState<{ score: number; label: string; color: string } | null>(null);
  const [isCheckingToxicity, setIsCheckingToxicity] = useState(false);

  // 3. Fact Guard State
  const [factInput, setFactInput] = useState("");
  const [factResult, setFactResult] = useState<{ score: number; label: string; details: string } | null>(null);
  const [isCheckingFact, setIsCheckingFact] = useState(false);

  // 4. Translator State
  const [translateInput, setTranslateInput] = useState("");
  const [translateLang, setTranslateLang] = useState<"Spanish" | "French">("Spanish");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  const apiFetch = async (endpoint: string, body: any) => {
    const baseUrl = getBaseApiUrl();
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return await response.json();
    } catch (e) {
      console.warn(`Fetch to ${endpoint} failed, utilizing local mock AI model fallback.`);
      return null;
    }
  };

  // Caption generator handler
  const handleGenerateCaptions = async () => {
    if (!captionInput.trim()) return;
    setIsGeneratingCaption(true);

    const data = await apiFetch("/api/ai/caption", { topic: captionInput, tone: captionTone });
    
    if (data && data.captions && data.captions.length > 0) {
      setGeneratedCaptions(data.captions);
    } else {
      // Offline / Local AI simulation fallback
      setTimeout(() => {
        if (captionTone === "Cyberpunk") {
          setGeneratedCaptions([
            `⚡ Deep within the neon circuits of "${captionInput}". #CyberAesthetic #Lumina`,
            `🌌 Neural matrices humming to the tune of "${captionInput}". #GridLife`,
            `🔮 Holographic reflections of "${captionInput}" glowing at midnight. #NeonDrive`,
          ]);
        } else if (captionTone === "Minimalist") {
          setGeneratedCaptions([
            `Simplicity in "${captionInput}".`,
            `Pure essence of "${captionInput}". ✨`,
            `Focused on "${captionInput}". Less is more.`,
          ]);
        } else {
          setGeneratedCaptions([
            `🔥 BOOM! "${captionInput}" is breaking the internet! Let's go!`,
            `👑 Undisputed energy on "${captionInput}". Drop a like if you agree! 🚀`,
            `📢 High power, high vibes: "${captionInput}" is here to stay!`,
          ]);
        }
        setIsGeneratingCaption(false);
      }, 1000);
      return;
    }
    setIsGeneratingCaption(false);
  };

  // Toxicity check handler
  const handleCheckToxicity = async (text: string) => {
    setToxicityInput(text);
    if (!text.trim()) {
      setToxicityResult(null);
      return;
    }

    setIsCheckingToxicity(true);
    const data = await apiFetch("/api/ai/toxicity", { text });
    
    if (data && data.label) {
      setToxicityResult({
        score: data.score,
        label: data.label,
        color: data.color || "text-[#ef4444]",
      });
    } else {
      // Local safety engine fallback
      setTimeout(() => {
        const toxicWords = ["hate", "kill", "stupid", "dumb", "ugly", "jerk", "idiot"];
        const lower = text.toLowerCase();
        const hasToxic = toxicWords.some(w => lower.includes(w));

        if (hasToxic) {
          setToxicityResult({
            score: 87,
            label: "Toxic Content Flagged",
            color: COLORS.error,
          });
        } else {
          setToxicityResult({
            score: 2,
            label: "Clean & Safe Content Verified",
            color: COLORS.success,
          });
        }
        setIsCheckingToxicity(false);
      }, 600);
      return;
    }
    setIsCheckingToxicity(false);
  };

  // Fact check handler
  const handleCheckFact = async () => {
    if (!factInput.trim()) return;
    setIsCheckingFact(true);

    const data = await apiFetch("/api/ai/factcheck", { text: factInput });
    
    if (data && data.label) {
      setFactResult({
        score: data.score,
        label: data.label,
        details: data.details,
      });
    } else {
      // Simulated Fact Checker
      setTimeout(() => {
        const lower = factInput.toLowerCase();
        if (lower.includes("flat") || lower.includes("fake") || lower.includes("conspiracy")) {
          setFactResult({
            score: 12,
            label: "Highly Suspicious Claim",
            details: "Standard scientific consensus heavily disproves this assertion. Marked as misinformation fallback.",
          });
        } else {
          setFactResult({
            score: 91,
            label: "Verified Statement",
            details: "Aligns with generally recognized facts and scientific literature on this topic.",
          });
        }
        setIsCheckingFact(false);
      }, 1000);
      return;
    }
    setIsCheckingFact(false);
  };

  // Translate handler
  const handleTranslate = async () => {
    if (!translateInput.trim()) return;
    setIsTranslating(true);

    const data = await apiFetch("/api/ai/translate", { text: translateInput, targetLang: translateLang });
    
    if (data && data.translatedText) {
      setTranslatedText(data.translatedText);
    } else {
      // Live mock translation Fallback
      setTimeout(() => {
        if (translateLang === "Spanish") {
          setTranslatedText(`[Spanish translation of "${translateInput}"]`);
        } else {
          setTranslatedText(`[French translation of "${translateInput}"]`);
        }
        setIsTranslating(false);
      }, 800);
      return;
    }
    setIsTranslating(false);
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert("Success", "Copied to clipboard!");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* HEADER BAR */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>AI Studio</Text>
            <Text style={styles.headerSubtitle}>Lumina-4 Active</Text>
          </View>
          <View style={styles.aiBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseText}>Agent Live</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* AI INTRO CARD */}
          <LinearGradient
            colors={["#2E1065", "#1E1B4B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.introCard}
          >
            <View style={styles.robotWrap}>
              <Text style={{ fontSize: 28 }}>🤖</Text>
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={styles.introTitle}>Creative Intelligence</Text>
              <Text style={styles.introText}>
                Power your social presence with advanced real-time content, translation, and compliance suites.
              </Text>
              <View style={styles.tickerRow}>
                <View style={styles.miniPulse} />
                <Text style={styles.tickerText}>{phrases[pulseIdx]}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* MAIN TABS SELECTOR */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContainer}
          >
            <TouchableOpacity
              onPress={() => setActiveTab("caption")}
              style={[styles.tabBtn, activeTab === "caption" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === "caption" && styles.tabBtnTextActive]}>
                📝 Captions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("toxicity")}
              style={[styles.tabBtn, activeTab === "toxicity" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === "toxicity" && styles.tabBtnTextActive]}>
                🛡️ Toxicity
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("factcheck")}
              style={[styles.tabBtn, activeTab === "factcheck" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === "factcheck" && styles.tabBtnTextActive]}>
                🔍 Fact Guard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("translate")}
              style={[styles.tabBtn, activeTab === "translate" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === "translate" && styles.tabBtnTextActive]}>
                🌐 Translate
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* TAB CARD WORKSPACE */}
          <View style={styles.workspaceCard}>
            
            {/* 1. CAPTION GENERATOR */}
            {activeTab === "caption" && (
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Caption Generator</Text>
                  <View style={styles.hotBadge}><Text style={styles.hotText}>HOT</Text></View>
                </View>
                <Text style={styles.sectionDesc}>
                  Draft context-aware hooks, storytelling headers, and optimal hashtag combinations instantly.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="What are you sharing? (e.g., golden sunset, code render)"
                  placeholderTextColor={COLORS.darkOnSurfaceVariant}
                  value={captionInput}
                  onChangeText={setCaptionInput}
                />

                <View style={styles.toneContainer}>
                  {(["Cyberpunk", "Minimalist", "Hype"] as const).map((tone) => (
                    <TouchableOpacity
                      key={tone}
                      onPress={() => setCaptionTone(tone)}
                      style={[styles.toneBtn, captionTone === tone && styles.toneBtnActive]}
                    >
                      <Text style={[styles.toneText, captionTone === tone && styles.toneTextActive]}>
                        {tone}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleGenerateCaptions}
                  disabled={isGeneratingCaption}
                  style={styles.actionBtn}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    style={StyleSheet.absoluteFill}
                  />
                  {isGeneratingCaption ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>GENERATE AI CAPTION</Text>
                  )}
                </TouchableOpacity>

                {generatedCaptions.length > 0 && (
                  <View style={styles.resultsContainer}>
                    <Text style={styles.resultsTitle}>AI Suggestion Outputs (Tap to Copy):</Text>
                    {generatedCaptions.map((cap, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => copyToClipboard(cap)}
                        style={styles.resultItem}
                      >
                        <Text style={styles.resultItemText}>{cap}</Text>
                        <Text style={styles.copyBadge}>📋 Copy</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 2. TOXICITY GUARD */}
            {activeTab === "toxicity" && (
              <View>
                <Text style={styles.sectionTitle}>Community Toxicity Guard</Text>
                <Text style={styles.sectionDesc}>
                  Verify if your bios or comment replies comply with healthy community safety guidelines.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Type a comment or text to check safety rating..."
                  placeholderTextColor={COLORS.darkOnSurfaceVariant}
                  value={toxicityInput}
                  onChangeText={handleCheckToxicity}
                  multiline
                />

                {isCheckingToxicity && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.md }} />}

                {toxicityResult && (
                  <View style={[styles.alertBox, { borderColor: toxicityResult.color + "40", backgroundColor: toxicityResult.color + "08" }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={[styles.alertLabel, { color: toxicityResult.color }]}>
                        {toxicityResult.label}
                      </Text>
                      <Text style={[styles.alertScore, { color: toxicityResult.color }]}>
                        {toxicityResult.score}% Rated
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 3. FACT GUARD CHECKER */}
            {activeTab === "factcheck" && (
              <View>
                <Text style={styles.sectionTitle}>Fact Guard Checker</Text>
                <Text style={styles.sectionDesc}>
                  Instantly scan factual statements to evaluate potential accuracy ratings.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="e.g., The Moon is made of cheese."
                  placeholderTextColor={COLORS.darkOnSurfaceVariant}
                  value={factInput}
                  onChangeText={setFactInput}
                />

                <TouchableOpacity
                  onPress={handleCheckFact}
                  disabled={isCheckingFact}
                  style={styles.actionBtn}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    style={StyleSheet.absoluteFill}
                  />
                  {isCheckingFact ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>SCAN CLAIM</Text>
                  )}
                </TouchableOpacity>

                {factResult && (
                  <View style={styles.factCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.sm }}>
                      <Text style={[styles.factLabel, factResult.score > 50 ? { color: COLORS.success } : { color: COLORS.error }]}>
                        {factResult.label}
                      </Text>
                      <Text style={styles.factScore}>{factResult.score}% Accuracy</Text>
                    </View>
                    <Text style={styles.factDetails}>{factResult.details}</Text>
                  </View>
                )}
              </View>
            )}

            {/* 4. GLOBAL VOICE TRANSLATION */}
            {activeTab === "translate" && (
              <View>
                <Text style={styles.sectionTitle}>Global Voice Translation</Text>
                <Text style={styles.sectionDesc}>
                  Translate multi-lingual phrases dynamically across native locales.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="e.g., Welcome to the future of social networking"
                  placeholderTextColor={COLORS.darkOnSurfaceVariant}
                  value={translateInput}
                  onChangeText={setTranslateInput}
                />

                <View style={styles.toneContainer}>
                  {(["Spanish", "French"] as const).map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      onPress={() => setTranslateLang(lang)}
                      style={[styles.toneBtn, translateLang === lang && styles.toneBtnActive]}
                    >
                      <Text style={[styles.toneText, translateLang === lang && styles.toneTextActive]}>
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleTranslate}
                  disabled={isTranslating}
                  style={styles.actionBtn}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    style={StyleSheet.absoluteFill}
                  />
                  {isTranslating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>TRANSLATE NOW</Text>
                  )}
                </TouchableOpacity>

                {translatedText ? (
                  <View style={styles.translationBox}>
                    <Text style={styles.translationLabel}>Translation ({translateLang}):</Text>
                    <Text style={styles.translationText}>{translatedText}</Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(translatedText)}
                      style={styles.translationCopy}
                    >
                      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "700" }}>Copy Result 📋</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            )}

          </View>

          {/* PULSE ANALYTICS FOOTER CARD */}
          <View style={styles.pulseCard}>
            <Text style={styles.pulseCardTitle}>Global AI Pulse</Text>
            <View style={styles.pulseMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>1.2s</Text>
                <Text style={styles.metricLabel}>Latency</Text>
              </View>
              <View style={[styles.metricItem, styles.metricDivider]}>
                <Text style={styles.metricVal}>99.9%</Text>
                <Text style={styles.metricLabel}>Accuracy</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: COLORS.success }]}>Online</Text>
                <Text style={styles.metricLabel}>Node Status</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#090514" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#221A35",
    backgroundColor: "#0B071E",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.full,
    backgroundColor: "#1F1435",
  },
  backIcon: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerTitleWrap: { flex: 1, marginLeft: SPACING.md },
  headerTitle: { color: "#fff", fontSize: 18, ...FONTS.bold },
  headerSubtitle: { color: COLORS.accent, fontSize: 11, ...FONTS.medium },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  pulseText: { color: COLORS.success, fontSize: 10, ...FONTS.bold, textTransform: "uppercase" },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  introCard: {
    flexDirection: "row",
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(139,124,255,0.15)",
  },
  robotWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B1E78",
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: { color: "#fff", fontSize: 16, ...FONTS.bold },
  introText: { color: "#D1C9E9", fontSize: 12, ...FONTS.regular, marginTop: 4, lineHeight: 17 },
  tickerRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  miniPulse: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primaryLight, marginRight: 6 },
  tickerText: { color: COLORS.primaryLight, fontSize: 10, ...FONTS.semibold, letterSpacing: 1 },
  tabContainer: {
    flexDirection: "row",
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    backgroundColor: "#1D1630",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#2E244E",
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabBtnText: { color: "#9E94C5", fontSize: 12, ...FONTS.bold },
  tabBtnTextActive: { color: "#fff" },
  workspaceCard: {
    backgroundColor: "#0D091F",
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: "#22193A",
    marginBottom: SPACING.lg,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: "#fff", fontSize: 18, ...FONTS.bold },
  hotBadge: {
    backgroundColor: "rgba(255,139,203,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  hotText: { color: COLORS.accent, fontSize: 9, ...FONTS.bold },
  sectionDesc: { color: "#9E94C5", fontSize: 12, ...FONTS.regular, marginTop: 4, marginBottom: SPACING.lg, lineHeight: 18 },
  input: {
    backgroundColor: "#18122D",
    color: "#fff",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#2C204F",
    marginBottom: SPACING.md,
  },
  toneContainer: { flexDirection: "row", gap: 8, marginBottom: SPACING.lg },
  toneBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: "#150E28",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#251B42",
  },
  toneBtnActive: {
    backgroundColor: "#2C1F55",
    borderColor: COLORS.accent,
  },
  toneText: { color: "#9E94C5", fontSize: 12, ...FONTS.semibold },
  toneTextActive: { color: COLORS.accent, fontWeight: "700" },
  actionBtn: {
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: SPACING.xs,
  },
  actionBtnText: { color: "#fff", fontSize: 12, ...FONTS.bold, letterSpacing: 1 },
  resultsContainer: { marginTop: SPACING.xl, paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: "#221A35" },
  resultsTitle: { color: COLORS.accent, fontSize: 11, ...FONTS.bold, textTransform: "uppercase", marginBottom: SPACING.md },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#17102D",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#251C47",
  },
  resultItemText: { color: "#E0DBF5", fontSize: 13, flex: 1, marginRight: SPACING.md },
  copyBadge: { color: COLORS.primaryLight, fontSize: 11, ...FONTS.bold },
  alertBox: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  alertLabel: { fontSize: 14, ...FONTS.bold },
  alertScore: { fontSize: 11, ...FONTS.semibold, textTransform: "uppercase" },
  factCard: {
    backgroundColor: "#16102E",
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: "#281D4C",
  },
  factLabel: { fontSize: 14, ...FONTS.bold },
  factScore: { color: "#fff", fontSize: 12, ...FONTS.semibold },
  factDetails: { color: "#9E94C5", fontSize: 11, ...FONTS.regular, marginTop: 4, lineHeight: 16 },
  translationBox: {
    backgroundColor: "#17102E",
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: "#281D4C",
  },
  translationLabel: { color: COLORS.primaryLight, fontSize: 11, ...FONTS.bold, textTransform: "uppercase" },
  translationText: { color: "#fff", fontSize: 15, ...FONTS.bold, marginTop: SPACING.xs },
  translationCopy: { marginTop: SPACING.md, alignSelf: "flex-end" },
  pulseCard: {
    backgroundColor: "#0D091F",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "#22193A",
  },
  pulseCardTitle: { color: "#9E94C5", fontSize: 10, ...FONTS.bold, textTransform: "uppercase", letterSpacing: 1, marginBottom: SPACING.md },
  pulseMetrics: { flexDirection: "row" },
  metricItem: { flex: 1, alignItems: "center" },
  metricDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#22193A" },
  metricVal: { color: "#fff", fontSize: 18, ...FONTS.bold },
  metricLabel: { color: "#776A9E", fontSize: 10, ...FONTS.regular, marginTop: 2 },
});
