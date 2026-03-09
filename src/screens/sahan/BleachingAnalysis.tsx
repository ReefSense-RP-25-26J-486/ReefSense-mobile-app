import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { Text, TextInput } from '../../components/AppText';
import { analyzeReef, type AnalyzeResult } from "../../services/api";

interface Props {
  onClose: () => void;
}

export default function BleachingAnalysis({ onClose }: Props) {
  const [location, setLocation] = useState("Tropical Bay");
  const [date, setDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [nurseryOptions] = useState(["NB-001", "NB-002", "NB-003"]);
  const [nursery, setNursery] = useState(nurseryOptions[0]);
  const [showNurseryModal, setShowNurseryModal] = useState(false);
  const [coralId, setCoralId] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const pickImageFromLibrary = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Permission to access media library is required.",
        );
        return;
      }
      setLoadingImage(true);
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      const res: any = picked;
      if (res.canceled === false && res.assets?.length > 0) {
        setImage(res.assets[0].uri);
      } else if (res.cancelled === false && res.uri) {
        setImage(res.uri);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingImage(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Permission to use camera is required.",
        );
        return;
      }
      setLoadingImage(true);
      const taken = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      const res: any = taken;
      if (res.canceled === false && res.assets?.length > 0) {
        setImage(res.assets[0].uri);
      } else if (res.cancelled === false && res.uri) {
        setImage(res.uri);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingImage(false);
    }
  };

  const openImageOptions = () => {
    Alert.alert("Upload Image", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickImageFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const runAnalysis = async () => {
    if (!image) {
      Alert.alert("No image", "Please select or capture a reef image first.");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Missing location", "Please enter a location.");
      return;
    }
    if (!coralId.trim()) {
      Alert.alert("Missing coral id", "Please enter a coral ID.");
      return;
    }

    try {
      setAnalyzing(true);
      const data = await analyzeReef({
        imageUri: image,
        location: location.trim(),
        date: date.toISOString(),
        nursery,
        coral_id: coralId.trim(),
      });
      setResult(data);
      setShowResult(true);
    } catch (err: any) {
      Alert.alert(
        "Analysis failed",
        err?.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Severity label derived from bleaching_percentage
  const severity = (pct: number) => {
    if (pct < 20) return { label: "Low Severity", color: "#2ECC71" };
    if (pct < 50) return { label: "Medium Severity", color: "#F39C12" };
    return { label: "High Severity", color: "#C0392B" };
  };

  interface Suggestion {
    icon: string;
    text: string;
  }

  const getSuggestions = (pct: number): { title: string; color: string; icon: string; items: Suggestion[] } => {
    if (pct < 20) {
      return {
        title: "Low Severity — Preventive Care",
        color: "#2ECC71",
        icon: "checkmark-circle-outline",
        items: [
          { icon: "thermometer-outline", text: "Monitor water temperature weekly to detect early heat stress." },
          { icon: "water-outline", text: "Maintain optimal water quality: pH 8.1–8.3, salinity 33–37 ppt." },
          { icon: "eye-outline", text: "Document coral health with photos to track any progression." },
          { icon: "leaf-outline", text: "Reduce local stressors such as runoff, sedimentation, and pollution." },
          { icon: "sunny-outline", text: "Ensure adequate water flow and sunlight reach all coral surfaces." },
        ],
      };
    }
    if (pct < 50) {
      return {
        title: "Medium Severity — Active Intervention",
        color: "#F39C12",
        icon: "warning-outline",
        items: [
          { icon: "pulse-outline", text: "Increase monitoring frequency to daily observations." },
          { icon: "swap-horizontal-outline", text: "Consider relocating vulnerable coral fragments to cooler, shaded areas." },
          { icon: "ban-outline", text: "Restrict anchoring and physical disturbances near affected zones." },
          { icon: "cut-outline", text: "Control algae overgrowth to reduce competition with stressed corals." },
          { icon: "megaphone-outline", text: "Notify local marine conservation authorities of the bleaching event." },
          { icon: "umbrella-outline", text: "Deploy temporary shading structures if heat stress is the primary cause." },
        ],
      };
    }
    return {
      title: "High Severity — Emergency Response",
      color: "#C0392B",
      icon: "alert-circle-outline",
      items: [
        { icon: "medkit-outline", text: "Initiate emergency coral rescue operations immediately." },
        { icon: "construct-outline", text: "Collect and transport coral fragments to nursery tanks for recovery." },
        { icon: "call-outline", text: "Contact reef restoration specialists and marine biologists urgently." },
        { icon: "shield-outline", text: "Restrict all human access to the affected reef area." },
        { icon: "flask-outline", text: "Investigate and eliminate pollution and runoff sources nearby." },
        { icon: "document-text-outline", text: "Submit a formal incident report to environmental agencies." },
        { icon: "git-branch-outline", text: "Plan coral larvae reseeding once water conditions stabilize." },
      ],
    };
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
      >
        <TouchableOpacity onPress={onClose} style={styles.backLink}>
          <Text style={styles.backText}>{"< Return to Overview"}</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Select the coral image</Text>

          <View style={styles.placeholderBox}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.placeholderImage}
                resizeMode="cover"
              />
            ) : (
              <>
                <Ionicons name="image-outline" size={48} color="#7b9bd3" />
                <Text style={styles.placeholderText}>
                  Upload an image to analyze
                </Text>
              </>
            )}
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
              style={styles.input}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Coral ID</Text>
            <TextInput
              value={coralId}
              onChangeText={setCoralId}
              placeholder="Enter coral identifier"
              style={styles.input}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity
              onPress={() => setShowDateModal(true)}
              style={styles.fieldBoxTouchable}
            >
              <Text style={styles.fieldValue}>{date.toDateString()}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Nursery ID</Text>
            <TouchableOpacity
              onPress={() => setShowNurseryModal(true)}
              style={styles.fieldBoxTouchable}
            >
              <Text style={styles.fieldValue}>{nursery}</Text>
            </TouchableOpacity>
          </View>

          {/* Upload image button */}
          <Pressable
            onPress={openImageOptions}
            style={styles.uploadBtn}
            android_ripple={{ color: "#3e64c6" }}
          >
            <View style={styles.uploadInner}>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.uploadText}>
                {loadingImage
                  ? "Loading..."
                  : image
                    ? "Change Image"
                    : "Upload Image"}
              </Text>
            </View>
          </Pressable>

          {/* Analyze button */}
          <Pressable
            onPress={runAnalysis}
            style={[
              styles.uploadBtn,
              styles.analysisBtn,
              analyzing && styles.disabledBtn,
            ]}
            android_ripple={{ color: "#2f5fb0" }}
            disabled={analyzing}
          >
            <View style={styles.uploadInner}>
              {analyzing ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
              ) : (
                <Ionicons name="analytics-outline" size={18} color="#fff" />
              )}
              <Text style={styles.uploadText}>
                {analyzing ? "Analysing..." : "Analyse Reef"}
              </Text>
            </View>
          </Pressable>

          {/* ── Nursery selector modal ─────────────────────────────── */}
          <Modal visible={showNurseryModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Nursery</Text>
                {nurseryOptions.map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => {
                      setNursery(n);
                      setShowNurseryModal(false);
                    }}
                    style={styles.modalItem}
                  >
                    <Text
                      style={[
                        styles.fieldValue,
                        nursery === n && { fontWeight: "900" },
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setShowNurseryModal(false)}
                  style={styles.modalClose}
                >
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ── Analysis result modal ──────────────────────────────── */}
          <Modal visible={showResult} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.analysisCard}>
                <Text style={styles.analysisTitle}>
                  Bleach Detection & Severity Analysis
                </Text>

                {/* Show annotated image from backend, fall back to original */}
                <View style={styles.analysisImageWrap}>
                  {result?.annotated_image_url ? (
                    <Image
                      source={{ uri: result.annotated_image_url }}
                      style={styles.analysisImage}
                      resizeMode="cover"
                    />
                  ) : image ? (
                    <Image
                      source={{ uri: image }}
                      style={styles.analysisImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.analysisImage,
                        styles.analysisImagePlaceholder,
                      ]}
                    >
                      <Ionicons
                        name="image-outline"
                        size={42}
                        color="#7b9bd3"
                      />
                    </View>
                  )}
                </View>

                {result && (
                  <>
                    <View style={styles.analysisCircleRow}>
                      <View style={styles.analysisCircle}>
                        <Text style={styles.analysisPercent}>
                          {result.bleaching_percentage.toFixed(1)}%
                        </Text>
                        <Text style={styles.analysisLabel}>Bleached</Text>
                      </View>

                      <View style={styles.analysisSummary}>
                        <Text
                          style={[
                            styles.analysisSeverity,
                            {
                              color: severity(result.bleaching_percentage)
                                .color,
                            },
                          ]}
                        >
                          {severity(result.bleaching_percentage).label}
                        </Text>
                        <Text style={styles.analysisStatLine}>
                          Coral detected: {result.coral_detected}
                        </Text>
                        <Text style={styles.analysisStatLine}>
                          Bleaching detected: {result.bleaching_detected}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.analysisButtonsRow}>
                      <TouchableOpacity
                        style={styles.analysisAction}
                        onPress={() => setShowSuggestions(true)}
                      >
                        <Text style={styles.analysisActionText}>
                          Suggestions
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <TouchableOpacity
                  onPress={() => setShowResult(false)}
                  style={styles.modalClose}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ── Suggestions modal ──────────────────────────────────── */}
          <Modal visible={showSuggestions} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.suggestionsCard}>
                {result && (() => {
                  const s = getSuggestions(result.bleaching_percentage);
                  return (
                    <>
                      <View style={[styles.suggestionsTitleRow, { borderBottomColor: s.color }]}>
                        <Ionicons name={s.icon as any} size={22} color={s.color} />
                        <Text style={[styles.suggestionsTitle, { color: s.color }]}>
                          {s.title}
                        </Text>
                      </View>
                      <Text style={styles.suggestionsPct}>
                        Bleaching: {result.bleaching_percentage.toFixed(1)}%
                      </Text>
                      <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
                        {s.items.map((item, idx) => (
                          <View key={idx} style={styles.suggestionItem}>
                            <Ionicons name={item.icon as any} size={18} color={s.color} style={styles.suggestionItemIcon} />
                            <Text style={styles.suggestionItemText}>{item.text}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </>
                  );
                })()}
                <TouchableOpacity
                  onPress={() => setShowSuggestions(false)}
                  style={styles.modalClose}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ── Date picker modal ──────────────────────────────────── */}
          <Modal visible={showDateModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <View style={styles.datePickerRow}>
                  <TouchableOpacity
                    onPress={() =>
                      setDate(
                        new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          date.getDate() - 1,
                        ),
                      )
                    }
                    style={styles.dateNav}
                  >
                    <Text style={styles.dateNavText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.fieldValue}>{date.toDateString()}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setDate(
                        new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          date.getDate() + 1,
                        ),
                      )
                    }
                    style={styles.dateNav}
                  >
                    <Text style={styles.dateNavText}>›</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDateModal(false)}
                  style={styles.modalClose}
                >
                  <Text style={styles.modalCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  content: { paddingHorizontal: 18 },
  subtitle: {
    textAlign: "center",
    marginBottom: 18,
    color: "#7b9bd3",
    fontWeight: "700",
  },

  placeholderBox: {
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#e6eefc",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  placeholderText: { marginTop: 8, color: "#9aa6bf" },
  placeholderImage: { width: "100%", height: "100%", borderRadius: 14 },

  formRow: { marginVertical: 8 },
  fieldLabel: { color: "#9aa6bf", fontWeight: "700", marginBottom: 6 },
  fieldValue: { color: "#34495e", fontWeight: "700" },

  uploadBtn: {
    marginTop: 20,
    backgroundColor: "#4A78D0",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadInner: { flexDirection: "row", alignItems: "center" },
  uploadText: { color: "#fff", fontWeight: "800", marginLeft: 8 },
  backLink: { marginTop: 10, paddingVertical: 5 },
  backText: { color: "#517AAD", fontWeight: "700", fontSize: 16 },
  input: {
    backgroundColor: "#f6f9ff",
    padding: 12,
    borderRadius: 10,
    fontWeight: "700",
    color: "#34495e",
  },
  fieldBoxTouchable: {
    backgroundColor: "#f6f9ff",
    padding: 12,
    borderRadius: 10,
  },
  analysisBtn: { marginTop: 12, backgroundColor: "#3b6fc1" },
  disabledBtn: { opacity: 0.6 },

  analysisCard: {
    width: "92%",
    backgroundColor: "#f7fbff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  analysisTitle: {
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  analysisImageWrap: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  analysisImage: { width: "100%", height: "100%" },
  analysisImagePlaceholder: {
    backgroundColor: "#eef5ff",
    alignItems: "center",
    justifyContent: "center",
  },
  analysisCircleRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  analysisCircle: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  analysisPercent: { fontSize: 22, fontWeight: "900", color: "#2e6fb0" },
  analysisLabel: { fontSize: 12, color: "#6b7f96" },
  analysisSummary: { flex: 1, alignItems: "center", gap: 4 },
  analysisSeverity: { fontWeight: "800", fontSize: 14 },
  analysisStatLine: { color: "#6b7f96", fontSize: 12 },
  analysisButtonsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 8,
  },
  analysisAction: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 12,
    backgroundColor: "#3b6fc1",
    borderRadius: 10,
    alignItems: "center",
  },
  analysisActionText: { color: "#fff", fontWeight: "800" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "86%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  modalTitle: { fontWeight: "800", fontSize: 16, marginBottom: 12 },
  modalItem: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eef4ff",
  },
  modalClose: { marginTop: 12, paddingVertical: 8 },
  modalCloseText: { color: "#517AAD", fontWeight: "800" },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 12,
  },
  dateNav: { paddingHorizontal: 18, paddingVertical: 8 },
  dateNavText: { fontSize: 22, color: "#517AAD" },

  suggestionsCard: {
    width: "92%",
    maxHeight: "80%",
    backgroundColor: "#f7fbff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  suggestionsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 2,
    paddingBottom: 10,
    marginBottom: 6,
    width: "100%",
  },
  suggestionsTitle: {
    fontWeight: "800",
    fontSize: 14,
    flexShrink: 1,
  },
  suggestionsPct: {
    color: "#6b7f96",
    fontSize: 12,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  suggestionsList: {
    width: "100%",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  suggestionItemIcon: {
    marginTop: 1,
  },
  suggestionItemText: {
    flex: 1,
    color: "#34495e",
    fontSize: 13,
    lineHeight: 19,
  },
});
