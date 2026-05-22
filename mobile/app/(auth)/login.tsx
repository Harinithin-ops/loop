import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { dbService } from "../../src/utils/dbService";
import { COLORS, SPACING, RADIUS, FONTS } from "../../src/utils/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { Alert.alert("Error", "Please fill in all fields"); return; }
    setLoading(true);
    try {
      await dbService.signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Login Failed", e.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={["#eef2ff", "#fbf8ff", "#fdf4ff"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoWrap}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.logoCircle}>
              <Text style={styles.logoText}>🔁</Text>
            </LinearGradient>
            <Text style={styles.appName}>Loop</Text>
            <Text style={styles.tagline}>Connect. Create. Inspire.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={COLORS.outline} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={COLORS.outline} value={password} onChangeText={setPassword} secureTextEntry />

            <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")} style={{ alignSelf: "flex-end", marginBottom: SPACING.lg }}>
              <Text style={{ color: COLORS.primary, fontSize: 13, ...FONTS.semibold }}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.btnGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={{ color: COLORS.onSurfaceVariant, fontSize: 14 }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                <Text style={{ color: COLORS.primary, ...FONTS.bold, fontSize: 14 }}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  logoWrap: { alignItems: "center", marginBottom: SPACING.xxxl },
  logoCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  logoText: { fontSize: 36 },
  appName: { fontSize: 36, color: COLORS.onSurface, letterSpacing: -1, ...FONTS.extrabold },
  tagline: { fontSize: 14, color: COLORS.onSurfaceVariant, marginTop: 4, ...FONTS.medium },
  card: { width: "100%", backgroundColor: "rgba(255,255,255,0.9)", borderRadius: RADIUS.xl, padding: SPACING.xxl, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  title: { fontSize: 24, color: COLORS.onSurface, marginBottom: 4, ...FONTS.bold },
  subtitle: { fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: SPACING.xl, ...FONTS.regular },
  input: { backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: 15, color: COLORS.onSurface, marginBottom: SPACING.md, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  btn: { borderRadius: RADIUS.md, overflow: "hidden", marginBottom: SPACING.lg },
  btnGrad: { paddingVertical: SPACING.md + 2, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 16, ...FONTS.bold },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
});
