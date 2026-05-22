import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { dbService } from "../../src/utils/dbService";
import { COLORS, SPACING, RADIUS, FONTS } from "../../src/utils/theme";

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) { Alert.alert("Error", "Please fill in all fields"); return; }
    if (password.length < 6) { Alert.alert("Error", "Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await dbService.signUp(email.trim(), password, fullName.trim(), username.trim().toLowerCase());
      Alert.alert("Success!", "Account created! Check your email to confirm, then log in.", [{ text: "Login", onPress: () => router.replace("/(auth)/login") }]);
    } catch (e: any) {
      Alert.alert("Signup Failed", e.message || "Could not create account");
    } finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={["#eef2ff", "#fbf8ff", "#fdf4ff"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.logoCircle}>
              <Text style={styles.logoText}>🔁</Text>
            </LinearGradient>
            <Text style={styles.appName}>Loop</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Loop today</Text>

            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={COLORS.outline} value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            <TextInput style={styles.input} placeholder="Username (e.g. john_doe)" placeholderTextColor={COLORS.outline} value={username} onChangeText={t => setUsername(t.toLowerCase().replace(/\s/g, "_"))} autoCapitalize="none" autoCorrect={false} />
            <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={COLORS.outline} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password (min 6 chars)" placeholderTextColor={COLORS.outline} value={password} onChangeText={setPassword} secureTextEntry />

            <TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading} activeOpacity={0.8}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.btnGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={{ color: COLORS.onSurfaceVariant, fontSize: 14 }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={{ color: COLORS.primary, ...FONTS.bold, fontSize: 14 }}>Sign In</Text>
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
  logoWrap: { alignItems: "center", marginBottom: SPACING.xxl },
  logoCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: SPACING.sm, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  logoText: { fontSize: 28 },
  appName: { fontSize: 30, color: COLORS.onSurface, ...FONTS.extrabold },
  card: { width: "100%", backgroundColor: "rgba(255,255,255,0.9)", borderRadius: RADIUS.xl, padding: SPACING.xxl, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  title: { fontSize: 22, color: COLORS.onSurface, marginBottom: 4, ...FONTS.bold },
  subtitle: { fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: SPACING.xl },
  input: { backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: 15, color: COLORS.onSurface, marginBottom: SPACING.md, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  btn: { borderRadius: RADIUS.md, overflow: "hidden", marginBottom: SPACING.lg },
  btnGrad: { paddingVertical: SPACING.md + 2, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 16, ...FONTS.bold },
  footer: { flexDirection: "row", justifyContent: "center" },
});
