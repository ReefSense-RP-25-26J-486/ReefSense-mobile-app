import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AvailableLocation {
  id: number;
  name: string;
  slug: string;
  center_lat: number;
  center_lon: number;
  description?: string;
}

// ── OTP Box Component ──────────────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<RNTextInput>(null);
  const digits = value.padEnd(6, " ").split("");

  return (
    <TouchableOpacity
      style={styles.otpRow}
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
    >
      {digits.map((d, i) => (
        <View
          key={i}
          style={[
            styles.otpBox,
            value.length === i ? styles.otpBoxActive : null,
          ]}
        >
          <Text style={styles.otpDigit}>{d.trim()}</Text>
        </View>
      ))}
      <RNTextInput
        ref={inputRef}
        style={styles.otpHidden}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        caretHidden
      />
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { login } = useAuth();
  const params = useLocalSearchParams<{ email?: string; step?: string }>();

  // Step state — jump to step 2 if arriving from the "verify email" login prompt
  const [step, setStep] = useState<1 | 2 | 3>(params.step === "2" ? 2 : 1);

  // Step 1 fields
  const [name, setName] = useState("");
  const [nic, setNic] = useState("");
  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);

  // Step 2 fields
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3 fields
  const [locations, setLocations] = useState<AvailableLocation[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Cooldown timer (Step 2) ────────────────────────────────────────────────

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) {
          clearInterval(t);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // ── Fetch locations when entering Step 3 ──────────────────────────────────

  useEffect(() => {
    if (step !== 3) return;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/locations`);
        const data = await res.json();
        if (res.ok) setLocations(data.locations ?? []);
      } catch {
        setError("Could not load locations. Try again.");
      }
    })();
  }, [step]);

  // ── Step 1 — Register ─────────────────────────────────────────────────────

  const handleRegister = async () => {
    setError("");
    if (
      !name.trim() ||
      !nic.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("All fields are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[a-zA-Z]/.test(password)) {
      setError("Password must contain at least one letter.");
      return;
    }
    if (!/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(password)) {
      setError("Password must contain at least one number or special character.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          nic: nic.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      setResendCooldown(30);
      setStep(2);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 — Verify email ─────────────────────────────────────────────────

  const handleVerify = async () => {
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        return;
      }
      setStep(3);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not resend code.");
        return;
      }
      setOtp("");
      setResendCooldown(30);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3 — Select Locations ─────────────────────────────────────────────

  const toggleLocation = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCompleteRegistration = async () => {
    setError("");
    if (selectedIds.length === 0) {
      setError("Select at least one location.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/complete-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locationIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not complete registration.");
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

  // ── Render ────────────────────────────────────────────────────────────────

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
          {/* Step indicator */}
          <View style={styles.stepRow}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={styles.stepItem}>
                <View
                  style={[styles.stepDot, step >= s && styles.stepDotActive]}
                >
                  {step > s ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNum,
                        step >= s && styles.stepNumActive,
                      ]}
                    >
                      {s}
                    </Text>
                  )}
                </View>
                {s < 3 && (
                  <View
                    style={[styles.stepLine, step > s && styles.stepLineActive]}
                  />
                )}
              </View>
            ))}
          </View>

          {/* Step title */}
          <Text style={styles.title}>
            {step === 1
              ? "Create Account"
              : step === 2
                ? "Verify Email"
                : "Select Locations"}
          </Text>

          {/* Error box */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#C0392B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Step 1 ──────────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#517AAD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#A0B4D0"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <Text style={styles.label}>NIC</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="card-outline"
                  size={18}
                  color="#517AAD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="123456789V or 200012345678"
                  placeholderTextColor="#A0B4D0"
                  autoCapitalize="characters"
                  value={nic}
                  onChangeText={setNic}
                />
              </View>

              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color="#517AAD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#A0B4D0"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

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
                  placeholder="Min. 8 chars, letter + number/symbol"
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
              <View style={styles.pwHints}>
                <View style={styles.pwHintItem}>
                  <Ionicons
                    name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"}
                    size={13}
                    color={password.length >= 8 ? "#27975A" : "#A0B4D0"}
                  />
                  <Text style={[styles.pwHintText, password.length >= 8 && styles.pwHintMet]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.pwHintItem}>
                  <Ionicons
                    name={/[a-zA-Z]/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                    size={13}
                    color={/[a-zA-Z]/.test(password) ? "#27975A" : "#A0B4D0"}
                  />
                  <Text style={[styles.pwHintText, /[a-zA-Z]/.test(password) && styles.pwHintMet]}>
                    At least one letter
                  </Text>
                </View>
                <View style={styles.pwHintItem}>
                  <Ionicons
                    name={/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                    size={13}
                    color={/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(password) ? "#27975A" : "#A0B4D0"}
                  />
                  <Text style={[styles.pwHintText, /[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(password) && styles.pwHintMet]}>
                    At least one number or symbol
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#517AAD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Repeat password"
                  placeholderTextColor="#A0B4D0"
                  secureTextEntry={!showCPw}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowCPw((v) => !v)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showCPw ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#517AAD"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 2 ──────────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{"\n"}
                <Text style={styles.subtitleEmail}>{email}</Text>
              </Text>

              <OtpInput value={otp} onChange={setOtp} />

              <TouchableOpacity
                style={[
                  styles.btn,
                  (loading || otp.length !== 6) && styles.btnDisabled,
                ]}
                onPress={handleVerify}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Verify Email</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resendBtn,
                  resendCooldown > 0 && styles.resendDisabled,
                ]}
                onPress={handleResend}
                disabled={resendCooldown > 0 || loading}
              >
                <Text
                  style={[
                    styles.resendText,
                    resendCooldown > 0 && styles.resendTextDisabled,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend Code"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 3 ──────────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <Text style={styles.subtitle}>
                Choose the research locations you need access to.
              </Text>

              {locations.length === 0 && !error && (
                <ActivityIndicator
                  color="#517AAD"
                  style={{ marginVertical: 20 }}
                />
              )}

              {locations.map((loc) => {
                const selected = selectedIds.includes(loc.id);
                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.locationRow,
                      selected && styles.locationRowSelected,
                    ]}
                    onPress={() => toggleLocation(loc.id)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        selected && styles.checkboxSelected,
                      ]}
                    >
                      {selected && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </View>
                    <View style={styles.locationInfo}>
                      <Text
                        style={[
                          styles.locationName,
                          selected && styles.locationNameSelected,
                        ]}
                      >
                        {loc.name}
                      </Text>
                      {!!loc.description && (
                        <Text style={styles.locationDesc}>
                          {loc.description}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={selected ? "#517AAD" : "#A0B4D0"}
                    />
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[
                  styles.btn,
                  (loading || selectedIds.length === 0) && styles.btnDisabled,
                  { marginTop: 24 },
                ]}
                onPress={handleCompleteRegistration}
                disabled={loading || selectedIds.length === 0}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Get Started</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Back to Login */}
          <TouchableOpacity
            onPress={() => router.push("/login")}
            style={styles.linkRow}
          >
            <Text style={styles.linkLabel}>Already have an account? </Text>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#EEF4FF" },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  logoWrap: { alignItems: "center", paddingTop: 48, marginBottom: 20 },
  logo: { width: 90, height: 90 },
  appName: { fontSize: 24, fontWeight: "700", color: "#517AAD", marginTop: 8 },
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

  // Step indicator
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    justifyContent: "center",
  },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF4FF",
    borderWidth: 2,
    borderColor: "#C8D9F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#517AAD", borderColor: "#517AAD" },
  stepNum: { fontSize: 12, fontWeight: "700", color: "#7A9DC0" },
  stepNumActive: { color: "#fff" },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: "#C8D9F0",
    marginHorizontal: 4,
  },
  stepLineActive: { backgroundColor: "#517AAD" },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 14,
    color: "#4A6080",
    marginBottom: 20,
    lineHeight: 22,
  },
  subtitleEmail: { fontWeight: "600", color: "#517AAD" },

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

  pwHints: { marginTop: 8, gap: 4 },
  pwHintItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  pwHintText: { fontSize: 12, color: "#A0B4D0" },
  pwHintMet: { color: "#27975A" },

  btn: {
    backgroundColor: "#517AAD",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // OTP
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: 24,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#F0F5FF",
    borderWidth: 2,
    borderColor: "#C8D9F0",
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxActive: { borderColor: "#517AAD" },
  otpDigit: { fontSize: 22, fontWeight: "700", color: "#1A2B3C" },
  otpHidden: { position: "absolute", opacity: 0, width: 1, height: 1 },

  resendBtn: { alignItems: "center", marginTop: 16, padding: 8 },
  resendDisabled: {},
  resendText: { fontSize: 14, color: "#517AAD", fontWeight: "600" },
  resendTextDisabled: { color: "#A0B4D0" },

  // Location list
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0F5FF",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  locationRowSelected: { borderColor: "#517AAD", backgroundColor: "#E8EFFF" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#C8D9F0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: "#517AAD", borderColor: "#517AAD" },
  locationInfo: { flex: 1 },
  locationName: { fontSize: 15, fontWeight: "600", color: "#4A6080" },
  locationNameSelected: { color: "#1A2B3C" },
  locationDesc: { fontSize: 12, color: "#7A9DC0", marginTop: 2 },

  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  linkLabel: { color: "#7A9DC0", fontSize: 14 },
  link: { color: "#517AAD", fontSize: 14, fontWeight: "600" },
});
