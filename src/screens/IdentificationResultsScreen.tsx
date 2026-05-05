import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { AnalyzedCoral, saveGrowthRecord } from "../api/growthApi";
import { ImageCoords } from "./MediaUploadScreen";
import { Text, TextInput } from "../components/AppText";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL_GIS ?? "";

interface NurseryOption {
  id: number;
  name: string | null;
  type: string;
}

interface Props {
  corals: AnalyzedCoral[];
  imageUri: string;
  annotatedImage: string | null;
  enhancedImage: string | null;
  imageSize?: [number, number];
  savedCoralIds: Record<string, string>;
  presetCoralId?: string;
  imageCoords?: ImageCoords | null;
  onCoralSaved: (tempId: string, userCoralId: string) => void;
  onTrackGrowth: (coralId: string) => void;
  onBackToUploads: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function confStyle(conf: number) {
  if (conf >= 0.8) return { bg: "#85ffa1", color: "#06a42b", label: "HIGH" };
  if (conf >= 0.5) return { bg: "#fef65e", color: "#c39304", label: "MED" };
  return { bg: "#f78992", color: "#b70c1d", label: "LOW" };
}

function getTagPos(
  coral: AnalyzedCoral,
  idx: number,
  total: number,
  dispW: number,
  dispH: number,
  imageSize?: [number, number],
): { left: number; top: number } {
  const TAG_HALF = 14;
  if (dispW === 0 || dispH === 0) return { left: 0, top: 0 };

  if (coral.centroid && imageSize) {
    const [origW, origH] = imageSize;
    const [cx, cy] = coral.centroid;
    return {
      left: (cx / origW) * dispW - TAG_HALF,
      top: (cy / origH) * dispH - TAG_HALF,
    };
  }

  const cols = total === 1 ? 1 : total <= 4 ? 2 : 3;
  const rows = Math.ceil(total / cols);
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  return {
    left: ((col + 0.5) / cols) * dispW - TAG_HALF,
    top: ((row + 0.5) / rows) * dispH - TAG_HALF,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function IdentificationResultsScreen({
  corals,
  imageUri,
  annotatedImage,
  enhancedImage,
  imageSize,
  savedCoralIds,
  presetCoralId,
  imageCoords,
  onCoralSaved,
  onTrackGrowth,
  onBackToUploads,
}: Props) {
  const { token, selectedLocation } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<number[]>([]);

  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [imgLayout, setImgLayout] = useState({ width: 0, height: 0 });
  const [coralIdInputs, setCoralIdInputs] = useState<Record<string, string>>(
    () => {
      if (presetCoralId && corals.length > 0) {
        return { [corals[0].coral_id]: presetCoralId };
      }
      return {};
    },
  );
  const [saving, setSaving] = useState(false);
  const [remarks, setRemarks] = useState("");

  const [nurseryOptions, setNurseryOptions] = useState<NurseryOption[]>([]);
  const [selectedNursery, setSelectedNursery] = useState<NurseryOption | null>(
    null,
  );
  const [loadingNurseries, setLoadingNurseries] = useState(false);
  const [showNurseryModal, setShowNurseryModal] = useState(false);

  useEffect(() => {
    if (!token || !selectedLocation) return;
    setLoadingNurseries(true);
    fetch(`${BASE_URL}/api/gis/nurseries`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Location-ID": String(selectedLocation.id),
      },
    })
      .then((r) => r.json())
      .then((d) => {
        const list: NurseryOption[] = (d.nurseries ?? []).map((n: any) => ({
          id: n.id,
          name: n.name,
          type: n.type,
        }));
        setNurseryOptions(list);
      })
      .catch(() => {})
      .finally(() => setLoadingNurseries(false));
  }, [token, selectedLocation]);

  const isSaved = (tempId: string) => savedCoralIds[tempId] !== undefined;

  const handleTagPress = (idx: number) => {
    const next = highlightedIdx === idx ? null : idx;
    setHighlightedIdx(next);
    if (next !== null && cardOffsets.current[next] !== undefined) {
      scrollRef.current?.scrollTo({
        y: cardOffsets.current[next] - 16,
        animated: true,
      });
    }
  };

  const handleCardPress = (idx: number) => {
    setHighlightedIdx(highlightedIdx === idx ? null : idx);
  };

  const handleSaveAll = async () => {
    const toSave = corals.filter((c) => {
      const id = (coralIdInputs[c.coral_id] ?? "").trim();
      return id.length > 0 && !isSaved(c.coral_id);
    });

    if (toSave.length === 0) {
      Alert.alert(
        "Nothing to Save",
        "Tap a coral tag, enter a Coral ID, then press Save All.",
      );
      return;
    }

    setSaving(true);
    const errors: string[] = [];

    for (const coral of toSave) {
      const userCoralId = coralIdInputs[coral.coral_id].trim().toUpperCase();
      try {
        await saveGrowthRecord(
          {
            coral_id: userCoralId,
            species: coral.species,
            area_cm2: coral.area_cm2,
            confidence: coral.confidence,
            cnn_feed_image: coral.cnn_feed_image,
            nursery_id: selectedNursery?.id,
            latitude: imageCoords?.latitude ?? null,
            longitude: imageCoords?.longitude ?? null,
            remarks: remarks.trim() || null,
          },
          token!,
          selectedLocation!.id,
        );
        onCoralSaved(coral.coral_id, userCoralId);
      } catch (err: any) {
        errors.push(`${coral.species}: ${err.message}`);
      }
    }

    setSaving(false);
    if (errors.length > 0) {
      Alert.alert("Some Saves Failed", errors.join("\n"));
    }
  };

  const displaySrc = annotatedImage
    ? { uri: `data:image/jpeg;base64,${annotatedImage}` }
    : { uri: imageUri };

  const anySaved = Object.keys(savedCoralIds).length > 0;

  return (
    // KeyboardAvoidingView ensures the Save bar rises above the keyboard
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      {/* Scrollable content */}
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <TouchableOpacity onPress={onBackToUploads} style={styles.backLink}>
          <Text style={styles.backText}>{"< Return to Overview"}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Identification Results</Text>

        {/* ── Image with overlaid numbered tags ── */}
        <View
          style={styles.imageWrapper}
          onLayout={(e) =>
            setImgLayout({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          <Image
            source={displaySrc}
            style={styles.mainImg}
            resizeMode="cover"
          />

          {imgLayout.width > 0 &&
            corals.map((coral, idx) => {
              const pos = getTagPos(
                coral,
                idx,
                corals.length,
                imgLayout.width,
                imgLayout.height,
                imageSize,
              );
              const isHL = highlightedIdx === idx;
              return (
                <TouchableOpacity
                  key={coral.coral_id}
                  style={[
                    styles.tag,
                    { left: pos.left, top: pos.top },
                    isHL && styles.tagHL,
                  ]}
                  onPress={() => handleTagPress(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tagText, isHL && styles.tagTextHL]}>
                    #{idx + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>

        {/* Detection count badge */}
        <View style={styles.countRow}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {corals.length} Coral{corals.length !== 1 ? "s" : ""} Detected
            </Text>
          </View>
        </View>

        {/* Nursery picker (optional) */}
        <View style={styles.nurseryRow}>
          <Text style={styles.nurseryLabel}>Nursery</Text>
          <TouchableOpacity
            style={styles.nurseryField}
            onPress={() =>
              nurseryOptions.length > 0 && setShowNurseryModal(true)
            }
          >
            {loadingNurseries ? (
              <ActivityIndicator size="small" color="#5D81B4" />
            ) : nurseryOptions.length === 0 ? (
              <Text style={styles.nurseryPlaceholder}>No nurseries</Text>
            ) : (
              <Text
                style={
                  selectedNursery ? styles.nurseryValue : styles.nurseryPlaceholder
                }
              >
                {selectedNursery
                  ? (selectedNursery.name ?? selectedNursery.type)
                  : "Select nursery (optional)"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Remarks field */}
        <View style={styles.remarksRow}>
          <Text style={styles.nurseryLabel}>Remarks</Text>
          <TextInput
            style={styles.remarksInput}
            placeholder="Observation notes (optional)"
            placeholderTextColor="#AAA"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={2}
            returnKeyType="done"
          />
        </View>

        {/* Nursery modal */}
        <Modal visible={showNurseryModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Nursery</Text>
              {nurseryOptions.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedNursery(n);
                    setShowNurseryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedNursery?.id === n.id && styles.modalItemSelected,
                    ]}
                  >
                    {n.name ?? n.type}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowNurseryModal(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Text style={styles.sectionLabel}>Detected Corals</Text>
        <Text style={styles.sectionHint}>
          Tap a tag on the image or a card below to assign a Coral ID
        </Text>

        {/* ── Coral cards ── */}
        {corals.map((coral, idx) => {
          const saved = isSaved(coral.coral_id);
          const isHL = highlightedIdx === idx;
          const cs = confStyle(coral.confidence);

          return (
            <View
              key={coral.coral_id}
              onLayout={(e) => {
                cardOffsets.current[idx] = e.nativeEvent.layout.y;
              }}
            >
              <TouchableOpacity
                style={[styles.card, isHL && styles.cardHL]}
                onPress={() => handleCardPress(idx)}
                activeOpacity={0.85}
              >
                {/* Card header row */}
                <View style={styles.cardHeader}>
                  <View style={[styles.tagMini, isHL && styles.tagMiniHL]}>
                    <Text
                      style={[styles.tagMiniText, isHL && { color: "#fff" }]}
                    >
                      #{idx + 1}
                    </Text>
                  </View>
                  <Text style={styles.speciesName} numberOfLines={1}>
                    {coral.species}
                  </Text>
                  <View style={[styles.confBadge, { backgroundColor: cs.bg }]}>
                    <Text style={[styles.confLabel, { color: cs.color }]}>
                      {cs.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.areaText}>
                  {coral.area_cm2.toFixed(2)} cm²
                </Text>

                {/* Expanded: ID input — only when highlighted and not yet saved */}
                {isHL && !saved && (
                  <View style={styles.expandedSection}>
                    <Text style={styles.inputLabel}>
                      Coral ID (optional — required to track)
                    </Text>
                    <TextInput
                      style={styles.idInput}
                      placeholder="e.g. GP-Acropora-001"
                      placeholderTextColor="#AAA"
                      autoCapitalize="characters"
                      returnKeyType="done"
                      value={coralIdInputs[coral.coral_id] ?? ""}
                      onChangeText={(t) =>
                        setCoralIdInputs((prev) => ({
                          ...prev,
                          [coral.coral_id]: t,
                        }))
                      }
                      onFocus={() => {
                        // Scroll to this card when focused so it stays visible above keyboard
                        if (cardOffsets.current[idx] !== undefined) {
                          scrollRef.current?.scrollTo({
                            y: cardOffsets.current[idx] - 16,
                            animated: true,
                          });
                        }
                      }}
                    />
                    <Text style={styles.scenarioHint}>
                      Leave blank to identify only (no tracking)
                    </Text>
                  </View>
                )}

                {/* Saved state */}
                {saved && (
                  <View style={styles.savedRow}>
                    <View style={styles.savedBadge}>
                      <MaterialIcons
                        name="check-circle"
                        size={14}
                        color="#155724"
                      />
                      <Text style={styles.savedBadgeText}>
                        Saved as {savedCoralIds[coral.coral_id]}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        onTrackGrowth(savedCoralIds[coral.coral_id])
                      }
                    >
                      <Text style={styles.viewGrowthLink}>View Growth →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {anySaved && (
          <View style={styles.allSavedNote}>
            <MaterialIcons name="info-outline" size={14} color="#5D81B4" />
            <Text style={styles.allSavedText}>
              Tap "View Growth →" on any saved coral to open its growth tracker.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Save bar — in normal flow so it stays above keyboard and nav bar ── */}
      <View style={styles.saveBar}>
        <TouchableOpacity
          style={[styles.saveAllBtn, saving && styles.btnDisabled]}
          onPress={handleSaveAll}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="save" size={18} color="#fff" />
              <Text style={styles.saveAllText}>Save All</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {/* Spacer to clear the absolutely-positioned BottomTab (~110px tall) */}
      <View style={{ height: 110 }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  backLink: { paddingVertical: 5, marginBottom: 6 },
  backText: {
    color: "#517AAD",
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 14,
    color: "#1a1a2e",
  },

  // Image + tag overlay — taller for better coral visibility
  imageWrapper: {
    width: "100%",
    height: 300,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#ddd",
  },
  mainImg: { width: "100%", height: "100%" },
  tag: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(93,129,180,0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  tagHL: { backgroundColor: "#1a1a2e", borderColor: "#FFD700", borderWidth: 2 },
  tagText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  tagTextHL: { color: "#FFD700" },

  // Count badge
  countRow: { flexDirection: "row", marginBottom: 14 },
  countBadge: {
    backgroundColor: "#BDD0E7",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  countText: { fontWeight: "700", color: "#1a1a2e", fontSize: 13 },

  // Nursery picker
  nurseryRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  nurseryLabel: {
    width: 70,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  nurseryField: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  nurseryValue: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  nurseryPlaceholder: { fontSize: 14, color: "#aaa" },

  // Remarks
  remarksRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  remarksInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a1a2e",
    minHeight: 60,
    textAlignVertical: "top",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "82%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  modalTitle: { fontWeight: "800", fontSize: 16, marginBottom: 12 },
  modalItem: {
    paddingVertical: 13,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF4FF",
  },
  modalItemText: { fontSize: 15, color: "#333", fontWeight: "600" },
  modalItemSelected: { color: "#5D81B4", fontWeight: "800" },
  modalCancel: { marginTop: 12, paddingVertical: 8 },
  modalCancelText: { color: "#5D81B4", fontWeight: "700" },

  // Section labels
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  sectionHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 14 },

  // Coral card
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardHL: { borderColor: "#5D81B4", backgroundColor: "#EEF4FF" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  tagMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#BDD0E7",
    justifyContent: "center",
    alignItems: "center",
  },
  tagMiniHL: { backgroundColor: "#5D81B4" },
  tagMiniText: { fontSize: 11, fontWeight: "800", color: "#5D81B4" },
  speciesName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  confBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  confLabel: { fontSize: 11, fontWeight: "700" },
  areaText: { fontSize: 13, color: colors.textSecondary, marginLeft: 34 },

  // Expanded ID input
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  idInput: {
    borderWidth: 1.5,
    borderColor: "#5D81B4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#1a1a2e",
    backgroundColor: "#F8FAFF",
    letterSpacing: 0.5,
  },
  scenarioHint: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 5,
    fontStyle: "italic",
  },

  // Saved state
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#d4edda",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  savedBadgeText: { fontSize: 12, color: "#155724", fontWeight: "600" },
  viewGrowthLink: { fontSize: 13, color: "#5D81B4", fontWeight: "700" },

  allSavedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF4FF",
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  allSavedText: { flex: 1, fontSize: 12, color: "#5D81B4", lineHeight: 18 },

  // Save bar — normal flow, not absolute
  saveBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
  },
  saveAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#5D81B4",
    paddingVertical: 15,
    borderRadius: 14,
  },
  saveAllText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.55 },
});
