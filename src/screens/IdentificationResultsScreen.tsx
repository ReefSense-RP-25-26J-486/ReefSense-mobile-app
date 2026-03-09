import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text, TextInput } from '../components/AppText';
import { AnalyzedCoral, saveGrowthRecord } from "../api/growthApi";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

interface IdentificationResultsScreenProps {
  corals: AnalyzedCoral[];
  imageUri: string;
  annotatedImage: string | null;
  savedCoralIds: Record<string, string>;
  onCoralSaved: (tempId: string, userCoralId: string) => void;
  onTrackGrowth: (coralId: string) => void;
  onBackToUploads: () => void;
}

export default function IdentificationResultsScreen({
  corals,
  imageUri,
  annotatedImage,
  savedCoralIds,
  onCoralSaved,
  onTrackGrowth,
  onBackToUploads,
}: IdentificationResultsScreenProps) {
  const { token, selectedLocation } = useAuth();
  // Which temp coral_id is currently being saved
  const [savingId, setSavingId] = useState<string | null>(null);
  // User-entered IDs (keyed by temp coral_id from AI)
  const [coralIdInputs, setCoralIdInputs] = useState<Record<string, string>>({});

  const isSaved = (tempId: string) => savedCoralIds[tempId] !== undefined;

  const handleSave = async (coral: AnalyzedCoral) => {
    const userCoralId = (coralIdInputs[coral.coral_id] ?? "").trim().toUpperCase();

    if (!userCoralId) {
      Alert.alert("Coral ID Required", "Please enter a Coral ID (e.g. CORAL-001) before saving.");
      return;
    }

    setSavingId(coral.coral_id);
    try {
      await saveGrowthRecord(
        {
          coral_id: userCoralId,
          species: coral.species,
          area_cm2: coral.area_cm2,
          confidence: coral.confidence,
          cnn_feed_image: coral.cnn_feed_image ?? imageUri,
        },
        token!,
        selectedLocation!.id,
      );
      // Store the user-provided ID and mark as saved
      onCoralSaved(coral.coral_id, userCoralId);
    } catch (err: any) {
      Alert.alert("Save Failed", err.message ?? "Could not save the record.");
    } finally {
      setSavingId(null);
    }
  };

  const displayImageSource = annotatedImage
    ? { uri: `data:image/jpeg;base64,${annotatedImage}` }
    : { uri: imageUri };

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBackToUploads} style={styles.backLink}>
        <Text style={styles.backText}>{"< Return to Overview"}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Identification Results</Text>

      {/* Annotated image with coral masks */}
      <Image
        source={displayImageSource}
        style={styles.mainImg}
        resizeMode="cover"
      />

      {/* Coral count badge */}
      {corals.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryValue}>{corals.length}</Text>
            <Text style={styles.summaryLabel}>Coral(s) Found</Text>
          </View>
        </View>
      )}

      <Text style={styles.subtitle}>Identified Corals</Text>

      {corals.map((coral) => {
        const saved = isSaved(coral.coral_id);
        const saving = savingId === coral.coral_id;

        return (
          <View key={coral.coral_id} style={styles.card}>
            {/* Avatar */}
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>
                {coral.species.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.name}>{coral.species}</Text>
              <Text style={styles.meta}>
                Area: <Text style={styles.metaVal}>{coral.area_cm2.toFixed(2)} cm²</Text>
              </Text>

              {saved ? (
                /* ── After save: show saved ID label + Track Growth button ── */
                <>
                  <View style={styles.savedIdRow}>
                    <Text style={styles.savedIdLabel}>ID: </Text>
                    <Text style={styles.savedIdValue}>{savedCoralIds[coral.coral_id]}</Text>
                    <View style={styles.savedBadge}>
                      <Text style={styles.savedBadgeText}>✓ Saved</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() => onTrackGrowth(savedCoralIds[coral.coral_id])}
                  >
                    <Text style={styles.btnText}>Track Growth</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* ── Before save: show ID input + Save button ── */
                <>
                  <TextInput
                    style={styles.idInput}
                    placeholder="Enter Coral ID (e.g. CORAL-001)"
                    placeholderTextColor="#AAA"
                    autoCapitalize="characters"
                    returnKeyType="done"
                    value={coralIdInputs[coral.coral_id] ?? ""}
                    onChangeText={(text) =>
                      setCoralIdInputs((prev) => ({ ...prev, [coral.coral_id]: text }))
                    }
                  />

                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.btnDisabled]}
                    onPress={() => handleSave(coral)}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.btnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        );
      })}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  backLink: { marginBottom: 10, paddingVertical: 5 },
  backText: { color: "#517AAD", fontWeight: "bold", fontSize: 16, marginTop: 8 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  mainImg: { width: "100%", height: 220, borderRadius: 10, marginBottom: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  summaryBadge: {
    backgroundColor: "#BDD0E7",
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignItems: "center",
  },
  summaryValue: { fontSize: 20, fontWeight: "bold", color: "#1a1a2e" },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  subtitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: "flex-start",
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#BDD0E7",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  avatarText: { fontSize: 22, fontWeight: "bold", color: "#5D81B4" },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: "700", marginBottom: 4, color: "#1a1a2e" },
  meta: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  metaVal: { fontWeight: "600", color: "#1a1a2e" },
  idInput: {
    borderWidth: 1.5,
    borderColor: "#5D81B4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1a1a2e",
    backgroundColor: "#F8FAFF",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  saveBtn: {
    backgroundColor: "#5D81B4",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: "flex-start",
    minWidth: 80,
    alignItems: "center",
  },
  trackBtn: {
    backgroundColor: "#2E7D52",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: "flex-start",
    minWidth: 110,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "white", fontWeight: "600" },
  savedIdRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 6,
  },
  savedIdLabel: { fontSize: 13, color: colors.textSecondary },
  savedIdValue: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  savedBadge: {
    backgroundColor: "#d4edda",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savedBadgeText: { fontSize: 11, color: "#155724", fontWeight: "600" },
});
