import {
    FontAwesome5,
    MaterialCommunityIcons,
    MaterialIcons,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    AnalyzeResult,
    getAllCoralSummaries,
    analyzeImage,
} from "../api/growthApi";
import { colors } from "../constants/colors";

interface MediaUploadScreenProps {
  onBrowse: (result: AnalyzeResult, imageUri: string) => void;
  onHistory: () => void;
}

export default function MediaUploadScreen({
  onBrowse,
  onHistory,
}: MediaUploadScreenProps) {
  const [loading, setLoading] = useState(false);
  const [totalObservations, setTotalObservations] = useState<number | null>(null);
  const [lastSpecies, setLastSpecies] = useState<string | null>(null);

  useEffect(() => {
    getAllCoralSummaries()
      .then((corals) => {
        const total = corals.reduce((sum, c) => sum + c.record_count, 0);
        setTotalObservations(total);
        if (corals.length > 0) {
          const latest = corals.sort(
            (a, b) =>
              new Date(b.last_recorded).getTime() -
              new Date(a.last_recorded).getTime(),
          )[0];
          setLastSpecies(latest.species);
        }
      })
      .catch(() => {});
  }, []);

  const pickAndAnalyze = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const imageUri = result.assets[0].uri;
    setLoading(true);
    try {
      const analyzeResult = await analyzeImage(imageUri);

      if (analyzeResult.corals.length === 0) {
        Alert.alert(
          "No Corals Detected",
          "The AI could not identify any coral in this image. Try a clearer photo.",
        );
        return;
      }

      onBrowse(analyzeResult, imageUri);
    } catch (err: any) {
      Alert.alert("Analysis Failed", err.message ?? "Could not reach the AI service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.mainContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        {/* Overview Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <FontAwesome5 name="microscope" size={20} color="#5D81B4" />
            <Text style={styles.statValue}>
              {totalObservations === null ? "—" : totalObservations}
            </Text>
            <Text style={styles.statLabel}>Total Observations</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="spa" size={26} color="#5D81B4" />
            <Text style={styles.statValue} numberOfLines={2}>
              {lastSpecies ?? "—"}
            </Text>
            <Text style={styles.statLabel}>Last Identified</Text>
          </View>
        </View>

        <Text style={styles.sectionSubtitle}>New Analysis</Text>

        {/* Upload box — tap to pick & analyze */}
        <TouchableOpacity
          style={[styles.uploadBox, loading && styles.uploadBoxDisabled]}
          onPress={pickAndAnalyze}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.uploadText}>Analysing image…</Text>
              <Text style={styles.uploadSubText}>This may take up to 30 seconds</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="file-upload" size={50} color={colors.primary} />
              <Text style={styles.uploadText}>Upload Image</Text>
              <Text style={styles.uploadSubText}>Tap to select a photo</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={onHistory}>
          <Text style={styles.btnText}>Track History</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, alignItems: "center", paddingTop: 20 },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    alignSelf: "flex-start",
    marginBottom: 20,
    marginTop: 10,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: colors.card,
    width: "48%",
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginTop: 8,
    textAlign: "center",
  },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  uploadBox: {
    width: "100%",
    height: 180,
    backgroundColor: colors.card,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  uploadBoxDisabled: { opacity: 0.6 },
  uploadText: { marginTop: 10, color: colors.textSecondary, fontWeight: "500", fontSize: 16 },
  uploadSubText: { marginTop: 4, color: "#aaa", fontSize: 12 },
  primaryBtn: {
    backgroundColor: "#5D81B4",
    width: "100%",
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: "center",
    elevation: 3,
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
