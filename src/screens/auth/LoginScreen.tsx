import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export default function LoginScreen() {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!identifier.trim() || !password) {
      setError("Please enter your email/NIC and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Unverified email — offer to resume verification
        if (data.unverified) {
          Alert.alert(
            "Email Not Verified",
            "Your account hasn't been verified yet. Would you like to verify your email and continue?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Verify Email",
                onPress: () =>
                  router.push({
                    pathname: "/register",
                    params: { email: data.email, step: "2" },
                  }),
              },
            ],
          );
          return;
        }
        setError(data.error ?? "Login failed.");
        return;
      }
      await login(data.token);
      router.replace("/home");
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require("../../assets/images/ReefSense_Logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>ReefSense</Text>
          <Text style={styles.tagline}>Coral Reef Conservation</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Sign In</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#C0392B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Identifier */}
          <Text style={styles.label}>Email or NIC</Text>
          <View style={styles.inputWrap}>
            <Ionicons
              name="person-outline"
              size={18}
              color="#517AAD"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="your@email.com or NIC"
              placeholderTextColor="#A0B4D0"
              autoCapitalize="none"
              keyboardType="email-address"
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#517AAD"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor="#A0B4D0"
              secureTextEntry={!showPw}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPw((v) => !v)}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showPw ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#517AAD"
              />
            </TouchableOpacity>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => router.push("/register")}
            style={styles.linkRow}
          >
            <Text style={styles.linkLabel}>Don&apos;t have an account? </Text>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#EEF4FF" },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  logoWrap: { alignItems: "center", paddingTop: 60, marginBottom: 24 },
  logo: { width: 120, height: 120 },
  appName: { fontSize: 26, fontWeight: "700", color: "#517AAD", marginTop: 8 },
  tagline: { fontSize: 13, color: "#7A9DC0", marginTop: 4 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 20,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE9E7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 6,
  },
  errorText: { color: "#C0392B", fontSize: 13, flex: 1 },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A6080",
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F5FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: "#1A2B3C" },
  eyeBtn: { padding: 4 },

  btn: {
    backgroundColor: "#517AAD",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  linkLabel: { color: "#7A9DC0", fontSize: 14 },
  link: { color: "#517AAD", fontSize: 14, fontWeight: "600" },
});
