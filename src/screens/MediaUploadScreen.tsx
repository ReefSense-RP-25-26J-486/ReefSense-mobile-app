import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
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

export interface ImageCoords {
  latitude: number;
  longitude: number;
}

interface MediaUploadScreenProps {
  onBrowse: (
    result: AnalyzeResult,
    imageUri: string,
    coords: ImageCoords | null,
  ) => void;
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

  const getCoordsForAsset = async (
    assetId: string | undefined | null,
    exif: any,
  ): Promise<ImageCoords | null> => {
    // ── 1. Media library lookup ──────────────────────────────────────────────
    // expo-image-picker returns assetId as a full content URI on Android, e.g.
    // "content://media/external/images/media/1234". MediaLibrary.getAssetInfoAsync
    // needs just the numeric tail "1234", so we extract it.
    if (assetId) {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          // Android assetId is either already a plain numeric string "1234"
          // or a full content URI "content://media/external/images/media/1234".
          // Try plain numeric tail first, then the raw assetId as fallback.
          const numericId = assetId.split("/").pop()!;
          const idsToTry =
            numericId !== assetId ? [numericId, assetId] : [assetId];

          for (const id of idsToTry) {
            try {
              console.log("[Coords] trying MediaLibrary id:", id);
              const info = await MediaLibrary.getAssetInfoAsync(id);
              console.log(
                "[Coords] MediaLibrary location:",
                JSON.stringify(info.location),
              );
              const loc = info.location;
              if (loc && (loc.latitude !== 0 || loc.longitude !== 0)) {
                return { latitude: loc.latitude, longitude: loc.longitude };
              }
              break; // found the asset but no location — no point trying next id
            } catch {
              // id format not accepted, try next
            }
          }
        }
      } catch (e: any) {
        console.log("[Coords] MediaLibrary error:", e?.message);
      }
    }

    // ── 2. Raw EXIF fallback
    console.log("[Coords] EXIF keys:", exif ? Object.keys(exif) : "no exif");

    if (!exif) return null;

    // iOS: GPS block keyed as "{GPS}"
    const gpsBlock = exif["{GPS}"];
    if (gpsBlock) {
      console.log("[Coords] iOS GPS block:", JSON.stringify(gpsBlock));
      const lat = parseFloat(gpsBlock.Latitude ?? gpsBlock.GPSLatitude);
      const lon = parseFloat(gpsBlock.Longitude ?? gpsBlock.GPSLongitude);
      const latRef: string =
        gpsBlock.LatitudeRef ?? gpsBlock.GPSLatitudeRef ?? "N";
      const lonRef: string =
        gpsBlock.LongitudeRef ?? gpsBlock.GPSLongitudeRef ?? "E";
      if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
        return {
          latitude: latRef.toUpperCase() === "S" ? -lat : lat,
          longitude: lonRef.toUpperCase() === "W" ? -lon : lon,
        };
      }
    }

    // Android: flat EXIF — decimal degrees or DMS fraction strings "37/1,30/1,45/100"
    const rawLat = exif.GPSLatitude ?? exif.Latitude;
    const rawLon = exif.GPSLongitude ?? exif.Longitude;
    console.log("[Coords] Android flat EXIF lat/lon:", rawLat, rawLon);

    if (rawLat != null && rawLon != null) {
      const parseDMS = (val: any): number => {
        if (typeof val === "number") return val;
        const parts = String(val)
          .split(",")
          .map((p) => {
            const [num, den] = p.trim().split("/");
            return parseFloat(num) / (parseFloat(den) || 1);
          });
        return (parts[0] ?? 0) + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600;
      };
      const lat = parseDMS(rawLat);
      const lon = parseDMS(rawLon);
      const latRef: string = exif.GPSLatitudeRef ?? "N";
      const lonRef: string = exif.GPSLongitudeRef ?? "E";
      if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
        return {
          latitude: latRef.toUpperCase() === "S" ? -lat : lat,
          longitude: lonRef.toUpperCase() === "W" ? -lon : lon,
        };
      }
    }

    console.log("[Coords] no coordinates found in this image");
    return null;
  };

  const runAnalysis = async (imageUri: string, coords: ImageCoords | null) => {
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
      onBrowse(result, imageUri, coords);
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
      exif: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    const coords = await getCoordsForAsset(
      asset.assetId ?? undefined,
      asset.exif,
    );
    await runAnalysis(asset.uri, coords);
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo library access.");
      return;
    }
    // allowsEditing is intentionally omitted for gallery picks.
    // When it is enabled, Android creates a cropped temp file that has no
    // MediaStore assetId, so the location lookup always returns null.
    // The full original image is needed for assetId-based location lookup.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,   // compress to keep upload under 10 MB for large iPhone photos
      exif: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    const coords = await getCoordsForAsset(
      asset.assetId ?? undefined,
      asset.exif,
    );
    await runAnalysis(asset.uri, coords);

    console.log("ASSET:", asset);
    console.log("EXIF:", asset.exif);
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
