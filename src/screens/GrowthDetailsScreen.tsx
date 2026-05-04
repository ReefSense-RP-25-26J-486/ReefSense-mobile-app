import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import {
  CoralRecord,
  deleteCoral,
  deleteCoralRecord,
  getCoralHistory,
} from "../api/growthApi";
import { Text } from "../components/AppText";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

interface Props {
  coralId: string;
  onBack: () => void;
  onBackToUploads: () => void;
}

// Growth stage (scientific 4-tier)

function growthStage(area: number) {
  if (area < 10)
    return { label: "Recruit / Fragment", color: "#fff", bg: "#47a0ff" };
  if (area < 25)
    return { label: "Established Juvenile", color: "#fff", bg: "#15be5b" };
  if (area < 50)
    return {
      label: "Branching / Encrusting Phase",
      color: "#ffffff",
      bg: "#b09113",
    };
  return { label: "Mature Colony", color: "#fff", bg: "#eda34e" };
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function GrowthDetailsScreen({
  coralId,
  onBack,
  onBackToUploads,
}: Props) {
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
      setRecords([...data].reverse()); // newest first
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
  const oldest = records[records.length - 1] ?? null;
  const stage = latest ? growthStage(latest.area_cm2) : null;

  const netGrowth = useMemo(() => {
    if (records.length < 2) return null;
    return (latest!.area_cm2 - oldest.area_cm2).toFixed(2);
  }, [records]);

  const avgMonthlyRate = useMemo(() => {
    if (records.length < 2 || !netGrowth) return null;
    const first = new Date(oldest.recorded_at);
    const last = new Date(latest!.recorded_at);
    const months =
      (last.getFullYear() - first.getFullYear()) * 12 +
      (last.getMonth() - first.getMonth());
    if (months <= 0) return null;
    return (parseFloat(netGrowth) / months).toFixed(2);
  }, [records, netGrowth]);

  const chartData = useMemo(
    () =>
      [...records].reverse().map((r) => ({
        value: r.area_cm2,
        label: formatDateShort(r.recorded_at),
        dataPointText: r.area_cm2.toFixed(1),
      })),
    [records],
  );

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
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
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
              <Text style={styles.btnWhite}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !latest ? (
          <View style={styles.centred}>
            <Text style={styles.errorText}>
              No records found for this coral.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Identification Header ── */}
            <View style={styles.idHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.coralIdLabel}>CORAL ID</Text>
                <Text style={styles.coralIdValue}>{coralId}</Text>
                <Text style={styles.speciesName}>{latest.species}</Text>
                {latest.latitude != null && latest.longitude != null && (
                  <View style={styles.coordsRow}>
                    <MaterialIcons name="location-on" size={12} color={colors.textSecondary} />
                    <Text style={styles.coordsText}>
                      {latest.latitude.toFixed(5)}, {latest.longitude.toFixed(5)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.stagePill, { backgroundColor: stage!.bg }]}>
                <Text style={[styles.stagePillText, { color: stage!.color }]}>
                  {stage!.label}
                </Text>
              </View>
            </View>

            {/* ── Coral Image ── */}
            {latest.image_url ? (
              <View style={styles.coralImageCard}>
                <Image
                  source={{ uri: latest.image_url }}
                  style={styles.coralImage}
                  resizeMode="cover"
                />
                {latest.remarks ? (
                  <Text style={styles.remarksText}>{latest.remarks}</Text>
                ) : null}
              </View>
            ) : latest.remarks ? (
              <View style={styles.remarksCard}>
                <Text style={styles.remarksText}>{latest.remarks}</Text>
              </View>
            ) : null}

            {/* ── Current Area ── */}
            <View style={styles.areaCard}>
              <Text style={styles.areaLabel}>Current Area</Text>
              <Text style={styles.areaValue}>
                {latest.area_cm2.toFixed(2)} cm²
              </Text>
              <Text style={styles.areaDate}>
                Last recorded {formatDate(latest.recorded_at)}
              </Text>
            </View>

            {/* ── Summary Stats ── */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{records.length}</Text>
                <Text style={styles.statLabel}>Observations</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>
                  {netGrowth != null
                    ? `${Number(netGrowth) >= 0 ? "+" : ""}${netGrowth}`
                    : "—"}
                </Text>
                <Text style={styles.statLabel}>Net Growth (cm²)</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>
                  {avgMonthlyRate != null ? `${avgMonthlyRate}` : "—"}
                </Text>
                <Text style={styles.statLabel}>Avg / Month (cm²)</Text>
              </View>
            </View>

            {/* ── Growth Chart ── */}
            {chartData.length >= 2 ? (
              <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>Growth Pattern</Text>
                <LineChart
                  data={chartData}
                  areaChart
                  color="#5D81B4"
                  thickness={3}
                  curved
                  startFillColor="#5D81B4"
                  endFillColor="#BDD0E7"
                  startOpacity={0.45}
                  endOpacity={0.05}
                  dataPointsColor="#e05c2a"
                  dataPointsRadius={6}
                  textColor="#5D81B4"
                  textFontSize={10}
                  yAxisTextStyle={styles.axisText}
                  xAxisLabelTextStyle={styles.axisText}
                  height={180}
                  spacing={Math.max(
                    50,
                    280 / Math.max(chartData.length - 1, 1),
                  )}
                  initialSpacing={16}
                  noOfSections={4}
                  rulesColor="#ECECEC"
                  xAxisColor="#DADADA"
                  yAxisColor="#DADADA"
                />
              </View>
            ) : (
              <View style={styles.chartPlaceholder}>
                <MaterialIcons name="show-chart" size={28} color="#bbb" />
                <Text style={styles.placeholderText}>
                  Chart appears after 2+ observations
                </Text>
              </View>
            )}

            {/* ── Growth Log Table ── */}
            <View style={styles.tableCard}>
              <Text style={styles.sectionTitle}>Growth Log</Text>

              {/* Table header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { flex: 1.2, textAlign: "right" },
                  ]}
                >
                  Area (cm²)
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { flex: 1.2, textAlign: "right" },
                  ]}
                >
                  Change
                </Text>
                <View style={{ width: 56 }} />
              </View>

              {records.map((rec, i) => {
                const delta = rec.growth_cm2;
                const isLast = i === records.length - 1;

                return (
                  <View
                    key={rec.id}
                    style={[
                      styles.tableRow,
                      isLast && { borderBottomWidth: 0 },
                    ]}
                  >
                    {/* Date */}
                    <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={2}>
                      {formatDate(rec.recorded_at)}
                    </Text>

                    {/* Area */}
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1.2, textAlign: "right", fontWeight: "700" },
                      ]}
                    >
                      {rec.area_cm2.toFixed(2)}
                    </Text>

                    {/* Delta */}
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1.2, textAlign: "right", fontWeight: "600" },
                        delta != null
                          ? { color: delta >= 0 ? "#155724" : "#721c24" }
                          : { color: "#aaa" },
                      ]}
                    >
                      {i < records.length - 1 && delta != null
                        ? `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(2)}`
                        : "—"}
                    </Text>

                    {/* Delete */}
                    <TouchableOpacity
                      style={styles.deleteRecordBtn}
                      disabled={deletingId === rec.id}
                      onPress={() =>
                        handleDeleteRecord(rec.id, formatDate(rec.recorded_at))
                      }
                    >
                      <Text style={styles.deleteRecordText}>
                        {deletingId === rec.id ? "…" : "Del"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* ── Secondary actions ── */}
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.btnWhite}>Back to Results</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteCoralBtn}
              onPress={handleDeleteCoral}
            >
              <MaterialIcons name="delete-outline" size={16} color="#c0392b" />
              <Text style={styles.deleteCoralText}>Delete This Coral</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

    </View>
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
  centred: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  loadingText: { marginTop: 12, color: colors.textSecondary },
  errorText: { color: "#721c24", textAlign: "center", marginBottom: 16 },
  retryBtn: {
    backgroundColor: "#5D81B4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnWhite: { color: "#fff", fontWeight: "bold" },

  // Identification header
  idHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    gap: 12,
  },
  coralIdLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  coralIdValue: { fontSize: 20, fontWeight: "800", color: "#1a1a2e" },
  speciesName: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  coordsRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
  coordsText: { fontSize: 11, color: colors.textSecondary },
  coralImageCard: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#ddd",
  },
  coralImage: { width: "100%", height: 220 },
  remarksCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  remarksText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
    padding: 10,
  },
  stagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 130,
  },
  stagePillText: { fontSize: 11, fontWeight: "700", textAlign: "center" },

  // Area card
  areaCard: {
    backgroundColor: "#BDD0E7",
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    alignItems: "center",
  },
  areaLabel: { fontSize: 13, color: colors.textSecondary },
  areaValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1a1a2e",
    marginVertical: 4,
  },
  areaDate: { fontSize: 12, color: colors.textSecondary },

  // Stats row
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 15, fontWeight: "800", color: "#1a1a2e" },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 3,
    textAlign: "center",
  },
  statDivider: { width: 1, height: 32, backgroundColor: "#c0cfe8" },

  // Chart
  chartCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 14,
  },
  axisText: { color: "#999", fontSize: 9 },
  chartPlaceholder: {
    backgroundColor: colors.card,
    padding: 28,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: "center",
    gap: 8,
  },
  placeholderText: { color: colors.textSecondary, fontSize: 13 },

  // Growth log table
  tableCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: "#b0c4de",
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#d0dff0",
    gap: 4,
  },
  tableCell: { fontSize: 12, color: "#1a1a2e", flex: 1 },
  deleteRecordBtn: {
    width: 48,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CC3344",
    backgroundColor: "#fff0f0",
    alignItems: "center",
  },
  deleteRecordText: { fontSize: 11, color: "#CC3344", fontWeight: "600" },

  // Actions
  backBtn: {
    backgroundColor: "#5D81B4",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  deleteCoralBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff0f0",
    borderWidth: 1.5,
    borderColor: "#c0392b",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  deleteCoralText: { color: "#c0392b", fontWeight: "700", fontSize: 15 },
});
