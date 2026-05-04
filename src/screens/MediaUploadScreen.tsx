import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AnalyzeResult,
  analyzeImage,
  getAllCoralSummaries,
} from "../api/growthApi";
import { Text } from "../components/AppText";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

interface MediaUploadScreenProps {
  onBrowse: (result: AnalyzeResult, imageUri: string) => void;
  onHistory: () => void;
}

export default function MediaUploadScreen({
  onBrowse,
  onHistory,
}: MediaUploadScreenProps) {
  const { token, selectedLocation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [totalObservations, setTotalObservations] = useState<number | null>(
    null,
  );
  const [lastSpecies, setLastSpecies] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !selectedLocation) return;
    setDataLoading(true);
    getAllCoralSummaries(token, selectedLocation.id)
      .then((corals) => {
        setTotalObservations(corals.reduce((s, c) => s + c.record_count, 0));
        if (corals.length > 0) {
          const latest = [...corals].sort(
            (a, b) =>
              new Date(b.last_recorded).getTime() -
              new Date(a.last_recorded).getTime(),
          )[0];
          setLastSpecies(latest.species);
        }
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, []);

  const runAnalysis = async (imageUri: string) => {
    setLoading(true);
    try {
      const result = await analyzeImage(imageUri, token!, selectedLocation!.id);
      if (result.corals.length === 0) {
        Alert.alert(
          "No Corals Detected",
          "The AI could not identify any coral. Try a clearer photo.",
        );
        return;
      }
      onBrowse(result, imageUri);
    } catch (err: any) {
      Alert.alert(
        "Analysis Failed",
        err.message ?? "Could not reach the AI service.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await runAnalysis(result.assets[0].uri);
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await runAnalysis(result.assets[0].uri);
  };

  if (dataLoading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingTitle}>Loading Data</Text>
        <Text style={styles.loadingSubtitle}>
          Fetching coral observation history…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name="microscope"
              size={22}
              color="#5D81B4"
            />
            <Text style={styles.statValue}>{totalObservations ?? "—"}</Text>
            <Text style={styles.statLabel}>Total Observations</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="spa" size={22} color="#5D81B4" />
            <Text style={styles.statValue} numberOfLines={2}>
              {lastSpecies ?? "—"}
            </Text>
            <Text style={styles.statLabel}>Last Identified</Text>
          </View>
        </View>

        {/* Hero upload card */}
        <View style={styles.heroCard}>
          <MaterialIcons name="photo-camera" size={44} color="#5D81B4" />
          <Text style={styles.heroTitle}>Add Image</Text>
          <Text style={styles.heroSubtitle}>
            Capture or upload a coral image to begin AI analysis
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, loading && styles.btnDisabled]}
              onPress={handleCamera}
              disabled={loading}
            >
              <MaterialIcons name="photo-camera" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnOutline,
                loading && styles.btnDisabled,
              ]}
              onPress={handleGallery}
              disabled={loading}
            >
              <MaterialIcons name="photo-library" size={20} color="#5D81B4" />
              <Text style={[styles.actionBtnText, { color: "#5D81B4" }]}>
                Upload Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Track history */}
        <TouchableOpacity style={styles.historyBtn} onPress={onHistory}>
          <MaterialCommunityIcons name="history" size={18} color="#fff" />
          <Text style={styles.historyBtnText}>Track History</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Full-screen loading overlay while AI runs */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.analyzingTitle}>Analyzing Coral…</Text>
            <Text style={styles.analyzingSubtitle}>
              Running CLAHE · YOLO · EfficientNet{"\n"}This may take up to 30
              seconds
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  centred: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  loadingSubtitle: { marginTop: 6, fontSize: 13, color: "#aaa" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 8,
  },
  statCard: {
    backgroundColor: colors.card,
    width: "48%",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginTop: 8,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },

  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    marginBottom: 18,
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#5D81B4",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
    marginTop: 12,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },

  btnRow: { flexDirection: "row", gap: 12, marginTop: 22, width: "100%" },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#5D81B4",
    paddingVertical: 13,
    borderRadius: 14,
  },
  actionBtnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#5D81B4",
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.5 },

  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#5D81B4",
    padding: 16,
    borderRadius: 14,
  },
  historyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    width: "80%",
  },
  analyzingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a2e",
    marginTop: 18,
  },
  analyzingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
