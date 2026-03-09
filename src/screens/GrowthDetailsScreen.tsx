import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from '../components/AppText';
import { LineChart } from "react-native-gifted-charts";
import {
  CoralRecord,
  deleteCoral,
  deleteCoralRecord,
  getCoralHistory,
} from "../api/growthApi";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

interface GrowthDetailsScreenProps {
  coralId: string;
  onBack: () => void;
  onBackToUploads: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function growthStageLabel(area: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (area < 5)
    return { label: "Early Growth", color: "#155724", bg: "#d4edda" };
  if (area < 15)
    return { label: "Transplanting Stage", color: "#721c24", bg: "#f8d7da" };
  if (area < 30)
    return { label: "Established Colony", color: "#856404", bg: "#fff3cd" };
  return { label: "Mature Colony", color: "#0c5460", bg: "#d1ecf1" };
}

/** Returns an Image source for cnn_feed_image (base64 or URI) or null if empty. */
function thumbSource(cnn: string | undefined): { uri: string } | null {
  if (!cnn) return null;
  if (
    cnn.startsWith("data:") ||
    cnn.startsWith("http") ||
    cnn.startsWith("file://") ||
    cnn.startsWith("/")
  ) {
    return { uri: cnn };
  }
  return { uri: `data:image/jpeg;base64,${cnn}` };
}

export default function GrowthDetailsScreen({
  coralId,
  onBack,
  onBackToUploads,
}: GrowthDetailsScreenProps) {
  const { token, selectedLocation } = useAuth();
  const [records, setRecords] = useState<CoralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCoralHistory(coralId, token!, selectedLocation!.id);
      setRecords([...data].reverse()); // newest first for display
    } catch (err: any) {
      setError(err.message ?? "Failed to load growth data.");
    } finally {
      setLoading(false);
    }
  }, [coralId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const latest = records[0] ?? null;
  const stage = latest ? growthStageLabel(latest.area_cm2) : null;
  const oldest = records[records.length - 1];
  const netGrowth =
    records.length >= 2
      ? (latest!.area_cm2 - oldest.area_cm2).toFixed(2)
      : null;

  const chartData = [...records].reverse().map((r) => ({
    value: r.area_cm2,
    label: formatDateShort(r.recorded_at),
    dataPointText: r.area_cm2.toFixed(1),
  }));

  // ─── Delete single record ─────────────────────────────────────────────────
  const handleDeleteRecord = (recId: number, dateLabel: string) => {
    Alert.alert(
      "Delete Record",
      `Remove observation from ${dateLabel}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(recId);
            try {
              await deleteCoralRecord(recId, token!, selectedLocation!.id);
              await fetchHistory();
            } catch (err: any) {
              Alert.alert("Delete Failed", err.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  // ─── Delete entire coral ──────────────────────────────────────────────────
  const handleDeleteCoral = () => {
    Alert.alert(
      "Delete Coral",
      `Delete ${coralId} and all ${records.length} record${records.length !== 1 ? "s" : ""}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCoral(coralId, token!, selectedLocation!.id);
              onBackToUploads();
            } catch (err: any) {
              Alert.alert("Delete Failed", err.message);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBackToUploads} style={styles.backLink}>
        <Text style={styles.backText}>{"< Return to Overview"}</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color="#5D81B4" />
          <Text style={styles.loadingText}>Loading growth data…</Text>
        </View>
      ) : error ? (
        <View style={styles.centred}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchHistory}>
            <Text style={styles.btnTextWhite}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !latest ? (
        <View style={styles.centred}>
          <Text style={styles.errorText}>No records found for this coral.</Text>
        </View>
      ) : (
        <>
          {/* ── Main info card ── */}
          <View style={styles.mainCard}>
            <Text style={styles.coralId}>ID: {coralId}</Text>
            <Text style={styles.scientificName}>{latest.species}</Text>
            <Text style={styles.date}>{formatDate(latest.recorded_at)}</Text>

            <View style={[styles.alertBox, { backgroundColor: stage!.bg }]}>
              <Text style={[styles.alertText, { color: stage!.color }]}>
                ⚠ {stage!.label}
              </Text>
            </View>

            <View style={styles.areaBox}>
              <Text style={styles.areaLabel}>Current Area</Text>
              <Text style={styles.areaValue}>
                {latest.area_cm2.toFixed(2)} cm²
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{records.length}</Text>
                <Text style={styles.statLabel}>Observations</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>
                  {netGrowth != null
                    ? `${Number(netGrowth) >= 0 ? "+" : ""}${netGrowth}`
                    : "—"}
                </Text>
                <Text style={styles.statLabel}>Net Growth (cm²)</Text>
              </View>
            </View>
          </View>

          {/* ── Growth chart ── */}
          {chartData.length >= 2 ? (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Growth Pattern</Text>
              <LineChart
                data={chartData}
                color="#5D81B4"
                thickness={3}
                curved
                dataPointsColor="#5D81B4"
                dataPointsRadius={5}
                textColor="#555"
                textFontSize={10}
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={styles.axisText}
                height={180}
                spacing={Math.max(50, 280 / Math.max(chartData.length - 1, 1))}
                initialSpacing={16}
                noOfSections={4}
                rulesColor="#ECECEC"
                xAxisColor="#DADADA"
                yAxisColor="#DADADA"
                hideDataPoints={false}
              />
            </View>
          ) : (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.placeholderText}>
                📈 Chart appears after 2+ observations
              </Text>
            </View>
          )}

          {/* ── Growth history ── */}
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Growth History</Text>

            {records.map((rec, i) => {
              const thumb = thumbSource(rec.cnn_feed_image);
              return (
                <View key={rec.id} style={styles.historyRow}>
                  {/* Photo thumbnail */}
                  {thumb ? (
                    <Image source={thumb} style={styles.historyThumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={styles.thumbIcon}>🪸</Text>
                    </View>
                  )}

                  {/* Date + growth delta */}
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>
                      📅 {formatDate(rec.recorded_at)}
                    </Text>
                    {i < records.length - 1 && rec.growth_cm2 != null && (
                      <Text
                        style={[
                          styles.growthDelta,
                          {
                            color:
                              rec.growth_cm2 >= 0 ? "#155724" : "#721c24",
                          },
                        ]}
                      >
                        {rec.growth_cm2 >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(rec.growth_cm2).toFixed(4)} cm²
                      </Text>
                    )}
                  </View>

                  {/* Area value + delete */}
                  <View style={styles.historyRight}>
                    <Text style={styles.historyVal}>
                      {rec.area_cm2.toFixed(2)} cm²
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteRecordBtn}
                      disabled={deletingId === rec.id}
                      onPress={() =>
                        handleDeleteRecord(rec.id, formatDate(rec.recorded_at))
                      }
                    >
                      <Text style={styles.deleteRecordIcon}>
                        {deletingId === rec.id ? "…" : "🗑"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Action buttons ── */}
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.btnTextWhite}>Back to Results</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteCoralBtn}
            onPress={handleDeleteCoral}
          >
            <Text style={styles.deleteCoralText}>🗑  Delete This Coral</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  backLink: { marginBottom: 10, paddingVertical: 5 },
  backText: {
    color: "#517AAD",
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 8,
  },
  centred: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  loadingText: { marginTop: 12, color: colors.textSecondary },
  errorText: {
    color: "#721c24",
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: "#5D81B4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  mainCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
  },
  coralId: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  scientificName: { fontSize: 18, color: colors.textSecondary },
  date: { fontSize: 20, fontWeight: "bold", marginVertical: 10 },
  alertBox: {
    flexDirection: "row",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  alertText: { fontWeight: "600", fontSize: 14 },
  areaBox: {
    backgroundColor: "#BDD0E7",
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
  },
  areaLabel: { fontSize: 16, color: colors.textSecondary },
  areaValue: { fontSize: 28, fontWeight: "bold" },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center", flex: 1 },
  statVal: { fontSize: 16, fontWeight: "bold", color: "#1a1a2e" },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  chartCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 15,
    marginBottom: 20,
    overflow: "hidden",
  },
  chartTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 14 },
  axisText: { color: "#999", fontSize: 9 },
  chartPlaceholder: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: "center",
  },
  placeholderText: { color: colors.textSecondary, fontSize: 14 },
  historyCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 15,
  },
  historyTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#BDD0E7",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  historyThumb: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#aac",
  },
  thumbPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#c8d8ec",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbIcon: { fontSize: 22 },
  historyLeft: { flex: 1 },
  historyRight: { alignItems: "flex-end", gap: 6 },
  historyDate: { fontSize: 13, color: colors.textSecondary },
  growthDelta: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  historyVal: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.textSecondary,
  },
  deleteRecordBtn: { padding: 2 },
  deleteRecordIcon: { fontSize: 17 },
  backBtn: {
    backgroundColor: "#5D81B4",
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  deleteCoralBtn: {
    backgroundColor: "#fff0f0",
    borderWidth: 1.5,
    borderColor: "#c0392b",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center",
  },
  deleteCoralText: { color: "#c0392b", fontWeight: "700", fontSize: 15 },
  btnTextWhite: { color: "white", fontWeight: "bold" },
});
