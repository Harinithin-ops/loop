import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { dbService } from "../../src/utils/dbService";
import { COLORS, SPACING, RADIUS, FONTS } from "../../src/utils/theme";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!email.trim()) { Alert.alert("Error", "Enter your email"); return; }
    setLoading(true);
    try {
      await dbService.resetPassword(email.trim());
      Alert.alert("Email Sent", "Check your inbox for a password reset link.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert("Error", e.message); } finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={["#eef2ff", "#fbf8ff"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", padding: SPACING.xl }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: SPACING.xl }}>
          <Text style={{ color: COLORS.primary, fontSize: 16, ...FONTS.semibold }}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.card}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.sub}>Enter your email and we'll send you a reset link.</Text>
          <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={COLORS.outline} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TouchableOpacity style={styles.btn} onPress={handle} disabled={loading}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.btnGrad}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: RADIUS.xl, padding: SPACING.xxl, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  title: { fontSize: 24, color: COLORS.onSurface, ...FONTS.bold, marginBottom: 8 },
  sub: { color: COLORS.onSurfaceVariant, fontSize: 14, marginBottom: SPACING.xl },
  input: { backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: 15, color: COLORS.onSurface, marginBottom: SPACING.lg, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  btn: { borderRadius: RADIUS.md, overflow: "hidden" },
  btnGrad: { paddingVertical: SPACING.md + 2, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, ...FONTS.bold },
});
