import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from '../../components/AppText';
import { useAuth } from '../../context/AuthContext';
import { fetchHistory, type HistoryRecord } from "../../services/api";

interface Props {
  onRunAnalysis?: () => void;
  onBack?: () => void;
  onViewHistory?: () => void;
}

const colors = {
  primary:  "#4A78D0",
  muted:    "#9AA6BF",
  bg:       "#FFFFFF",
  card:     "#F6F9FF",
  bleached: "#C0392B",
  warning:  "#F39C12",
  healthy:  "#2ECC71",
};

const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
});

/** Derive severity tier from bleaching percentage */
const getSeverity = (pct: number) => {
  if (pct < 20)
    return { label: "Low Severity",    color: colors.healthy,  icon: "checkmark-circle" as const };
  if (pct < 50)
    return { label: "Medium Severity", color: colors.warning,  icon: "warning"          as const };
  return   { label: "High Severity",   color: colors.bleached, icon: "alert-circle"     as const };
};

export default function BleachingDetectionScreen({
  onRunAnalysis,
  onBack,
  onViewHistory,
}: Props) {
  const { token, selectedLocation } = useAuth();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !selectedLocation) return;
    try {
      setLoading(true);
      const data = await fetchHistory(token, selectedLocation.id);
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Derived values — latest is the first (newest) record
  const latest = records.length > 0 ? records[0] : null;
  const latestSiteName = latest?.location_details?.name ?? latest?.location;

  // Latest record stats
  const bleachedPct  = latest ? Math.round(latest.bleaching_percentage) : 0;
  const healthyPct   = 100 - bleachedPct;
  const healthyCount = latest ? latest.coral_detected - latest.bleaching_detected : 0;
  const sev          = latest ? getSeverity(latest.bleaching_percentage) : null;

  // ── Aggregated summary across ALL records ───────────────────────────────
  const totalAnalyses      = records.length;
  const totalCorals        = records.reduce((s, r) => s + r.coral_detected,     0);
  const totalBleached      = records.reduce((s, r) => s + r.bleaching_detected, 0);
  const totalHealthy       = totalCorals - totalBleached;
  const avgBleachingRate   = totalAnalyses > 0
    ? records.reduce((s, r) => s + r.bleaching_percentage, 0) / totalAnalyses
    : 0;
  const overallBleachedPct = totalCorals > 0
    ? Math.round((totalBleached / totalCorals) * 100)
    : 0;
  const overallHealthyPct  = 100 - overallBleachedPct;

  // Severity breakdown counts
  const sevCounts = records.reduce(
    (acc, r) => {
      const tier = getSeverity(r.bleaching_percentage).label.split(" ")[0]; // "Low"|"Medium"|"High"
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Date range
  const dateRange = records.length > 1
    ? `${new Date(records[records.length - 1].date).toLocaleDateString("en-US", { month: "short", year: "numeric" })} — ${new Date(records[0].date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
    : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingTitle}>Loading Analysis</Text>
        <Text style={styles.loadingSubtitle}>Fetching bleaching detection history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back link */}
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backLink}>
              <Text style={styles.backText}>{"< Return to Overview"}</Text>
            </TouchableOpacity>
          )}

          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.smallMuted}>Site</Text>
              <Text style={styles.location}>
                {latestSiteName ?? "—"}
              </Text>
            </View>
            <Text style={styles.date}>
              {latest
                ? new Date(latest.date).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </Text>
          </View>

          <Text style={styles.title}>Bleaching Detection</Text>

          {/* ── Empty state ─────────────────────────────────────────── */}
          {!loading && records.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="analytics-outline" size={52} color={colors.muted} />
              <Text style={styles.emptyTitle}>No Analysis Yet</Text>
              <Text style={styles.emptyText}>
                Run your first reef analysis to see bleaching statistics here.
              </Text>
            </View>
          )}

          {/* ── Data ────────────────────────────────────────────────── */}
          {!loading && latest && sev && (
            <>
              {/* Severity banner */}
              <View
                style={[
                  styles.severityBanner,
                  { backgroundColor: sev.color + "18", borderColor: sev.color + "55" },
                ]}
              >
                <Ionicons name={sev.icon} size={20} color={sev.color} />
                <Text style={[styles.severityLabel, { color: sev.color }]}>
                  {sev.label}
                </Text>
                <Text style={styles.severityDate}>
                  {new Date(latest.date).toLocaleDateString()}
                </Text>
              </View>

              {/* ── Latest Detection Summary card ───────────────────── */}
              <View style={[styles.summaryCard, { borderTopColor: sev.color }]}>
                <Text style={styles.summaryCardTitle}>Latest Detection Summary</Text>

                {/* Image + description row */}
                <View style={styles.summaryTopRow}>
                  {latest.annotated_image_url ? (
                    <Image
                      source={{ uri: latest.annotated_image_url }}
                      style={styles.summaryImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.summaryImage, styles.summaryImagePlaceholder]}>
                      <Ionicons name="image-outline" size={28} color={colors.muted} />
                    </View>
                  )}

                  <View style={styles.summaryDescCol}>
                    {/* Natural-language summary */}
                    <Text style={styles.summaryText}>
                      <Text style={[styles.summaryHighlight, { color: sev.color }]}>
                        {latest.bleaching_percentage.toFixed(1)}%{" "}
                      </Text>
                      of corals at{" "}
                      <Text style={styles.summaryHighlight}>
                        {latestSiteName}{" "}
                      </Text>
                      are bleached.{" "}
                      <Text style={[styles.summaryHighlight, { color: sev.color }]}>
                        {sev.label}
                      </Text>{" "}
                      detected.
                    </Text>

                    {/* Meta pills */}
                    <View style={styles.summaryMetaRow}>
                      <View style={styles.summaryMetaPill}>
                        <Ionicons name="calendar-outline" size={11} color={colors.muted} />
                        <Text style={styles.summaryMetaText}>
                          {new Date(latest.date).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </Text>
                      </View>
                      <View style={styles.summaryMetaPill}>
                        <Ionicons name="business-outline" size={11} color={colors.muted} />
                        <Text style={styles.summaryMetaText}>{latest.nursery}</Text>
                      </View>
                    </View>
                    {latest.coral_id != null && (
                      <View style={[styles.summaryMetaPill, { marginTop: 4 }]}>
                        <Ionicons name="pricetag-outline" size={11} color={colors.muted} />
                        <Text style={styles.summaryMetaText}>Coral ID: {latest.coral_id}</Text>
                      </View>
                    )}
                    {latest.location_details?.slug && (
                      <View style={[styles.summaryMetaPill, { marginTop: 4 }]}>
                        <Ionicons name="map-outline" size={11} color={colors.muted} />
                        <Text style={styles.summaryMetaText}>
                          Site: {latest.location_details.slug}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 3-column stat grid */}
                <View style={styles.summaryStatGrid}>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatValue}>{latest.coral_detected}</Text>
                    <Text style={styles.summaryStatLabel}>Coral{"\n"}Detected</Text>
                  </View>
                  <View style={[styles.summaryStatItem, styles.summaryStatBorder]}>
                    <Text style={[styles.summaryStatValue, { color: colors.bleached }]}>
                      {latest.bleaching_detected}
                    </Text>
                    <Text style={styles.summaryStatLabel}>Bleaching{"\n"}Detected</Text>
                  </View>
                  <View style={styles.summaryStatItem}>
                    <Text style={[styles.summaryStatValue, { color: sev.color }]}>
                      {latest.bleaching_percentage.toFixed(1)}%
                    </Text>
                    <Text style={styles.summaryStatLabel}>Bleaching{"\n"}Rate</Text>
                  </View>
                </View>

                {/* Progress bars */}
                <View style={styles.summaryDivider} />

                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Bleached</Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${bleachedPct}%`, backgroundColor: colors.bleached },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressNumber, { color: colors.bleached }]}>
                    {bleachedPct}%
                  </Text>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Healthy</Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${healthyPct}%`, backgroundColor: colors.healthy },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressNumber, { color: colors.healthy }]}>
                    {healthyPct}%
                  </Text>
                </View>
              </View>

              {/* Stat cards + ring */}
              <View style={styles.statRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Bleached</Text>
                  <Text style={[styles.statValue, { color: colors.bleached }]}>
                    {latest.bleaching_detected}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.dot, { backgroundColor: colors.bleached }]} />
                    <Text style={styles.badgeText}>{bleachedPct}%</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Healthy</Text>
                  <Text style={[styles.statValue, { color: colors.healthy }]}>
                    {healthyCount}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.dot, { backgroundColor: colors.healthy }]} />
                    <Text style={styles.badgeText}>{healthyPct}%</Text>
                  </View>
                </View>

                {/* Severity ring */}
                <View style={styles.pieCard}>
                  <View style={[styles.pieCircle, { borderColor: sev.color }]}>
                    <Text style={[styles.piePct, { color: sev.color }]}>
                      {bleachedPct}%
                    </Text>
                    <Text style={styles.pieLabel}>bleached</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ── Overall Analyses Summary ─────────────────────────────── */}
          {!loading && totalAnalyses > 0 && (
            <View style={styles.pastSection}>

              {/* Section header */}
              <View style={styles.pastHeaderRow}>
                <Text style={styles.pastSectionTitle}>Overall Analyses Summary</Text>
                <View style={styles.pastCountBadge}>
                  <Text style={styles.pastCountText}>{totalAnalyses} runs</Text>
                </View>
              </View>

              {/* Date range */}
              {dateRange && (
                <View style={styles.dateRangeRow}>
                  <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                  <Text style={styles.dateRangeText}>{dateRange}</Text>
                </View>
              )}

              {/* ── Coral count grid ─────────────────────────────── */}
              <View style={styles.summaryGrid}>
                <View style={styles.summaryGridItem}>
                  <Ionicons name="grid-outline" size={18} color={colors.primary} />
                  <Text style={styles.summaryGridValue}>{totalCorals}</Text>
                  <Text style={styles.summaryGridLabel}>Total Corals{"\n"}Scanned</Text>
                </View>
                <View style={[styles.summaryGridItem, styles.summaryGridBorder]}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.bleached} />
                  <Text style={[styles.summaryGridValue, { color: colors.bleached }]}>
                    {totalBleached}
                  </Text>
                  <Text style={styles.summaryGridLabel}>Bleached{"\n"}Corals</Text>
                </View>
                <View style={styles.summaryGridItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.healthy} />
                  <Text style={[styles.summaryGridValue, { color: colors.healthy }]}>
                    {totalHealthy}
                  </Text>
                  <Text style={styles.summaryGridLabel}>Healthy{"\n"}Corals</Text>
                </View>
              </View>

              {/* ── Avg bleaching rate card ──────────────────────── */}
              <View style={styles.avgCard}>
                <View style={styles.avgLeft}>
                  <Text style={styles.avgLabel}>Avg. Bleaching Rate</Text>
                  <Text style={styles.avgSub}>Across all {totalAnalyses} analyses</Text>
                </View>
                <Text style={[
                  styles.avgValue,
                  { color: getSeverity(avgBleachingRate).color },
                ]}>
                  {avgBleachingRate.toFixed(1)}%
                </Text>
              </View>

              {/* ── Overall bleached vs healthy bars ────────────── */}
              <View style={styles.overallBarsCard}>
                <Text style={styles.overallBarsTitle}>Coral Health Distribution</Text>

                <View style={styles.overallBarRow}>
                  <View style={styles.overallBarLabelCol}>
                    <View style={[styles.overallDot, { backgroundColor: colors.bleached }]} />
                    <Text style={styles.overallBarLabel}>Bleached</Text>
                  </View>
                  <View style={styles.overallBarBg}>
                    <View
                      style={[
                        styles.overallBarFill,
                        { width: `${overallBleachedPct}%`, backgroundColor: colors.bleached },
                      ]}
                    />
                  </View>
                  <Text style={[styles.overallBarPct, { color: colors.bleached }]}>
                    {overallBleachedPct}%
                  </Text>
                </View>

                <View style={styles.overallBarRow}>
                  <View style={styles.overallBarLabelCol}>
                    <View style={[styles.overallDot, { backgroundColor: colors.healthy }]} />
                    <Text style={styles.overallBarLabel}>Healthy</Text>
                  </View>
                  <View style={styles.overallBarBg}>
                    <View
                      style={[
                        styles.overallBarFill,
                        { width: `${overallHealthyPct}%`, backgroundColor: colors.healthy },
                      ]}
                    />
                  </View>
                  <Text style={[styles.overallBarPct, { color: colors.healthy }]}>
                    {overallHealthyPct}%
                  </Text>
                </View>
              </View>

              {/* ── Severity breakdown ───────────────────────────── */}
              <View style={styles.sevBreakCard}>
                <Text style={styles.sevBreakTitle}>Severity Breakdown</Text>
                <View style={styles.sevBreakRow}>
                  {(["Low", "Medium", "High"] as const).map((tier) => {
                    const tierColors: Record<string, string> = {
                      Low: colors.healthy, Medium: colors.warning, High: colors.bleached,
                    };
                    const count = sevCounts[tier] ?? 0;
                    const pct   = totalAnalyses > 0 ? Math.round((count / totalAnalyses) * 100) : 0;
                    const col   = tierColors[tier];
                    return (
                      <View key={tier} style={styles.sevBreakItem}>
                        <View style={[styles.sevBreakBar]}>
                          <View
                            style={[
                              styles.sevBreakFill,
                              { height: `${pct}%`, backgroundColor: col },
                            ]}
                          />
                        </View>
                        <Text style={[styles.sevBreakCount, { color: col }]}>{count}</Text>
                        <Text style={styles.sevBreakLabel}>{tier}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

            </View>
          )}

          {/* ── Action buttons ──────────────────────────────────────── */}
          <Pressable
            onPress={() => onRunAnalysis && onRunAnalysis()}
            style={styles.primaryBtn}
            android_ripple={{ color: "#3e64c6" }}
          >
            <View style={styles.btnInner}>
              <MaterialIcons name="analytics" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Run Analysis</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#fff" />
          </Pressable>

          <Pressable
            onPress={() => onViewHistory && onViewHistory()}
            style={styles.ghostBtn}
            android_ripple={{ color: "#e6eefc" }}
          >
            <View style={styles.btnInner}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.ghostBtnText}>View History</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
          </Pressable>

          <View style={{ height: 140 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg,
  },
  loadingTitle: { marginTop: 16, fontSize: 16, fontWeight: "600", color: "#333" },
  loadingSubtitle: { marginTop: 6, fontSize: 13, color: "#aaa" },
  safe:      { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 18, backgroundColor: colors.bg },

  backLink: { marginTop: 10, paddingVertical: 5 },
  backText:  { color: "#517AAD", fontWeight: "700", fontSize: 16 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  smallMuted: { color: colors.muted, fontSize: 12 },
  location:   { fontSize: 16, fontWeight: "700" },
  date:       { color: colors.muted, fontWeight: "600" },
  title:      { fontSize: 20, fontWeight: "800", marginVertical: 14 },

  /* Loading / empty */
  centred: { alignItems: "center", marginTop: 40, gap: 12 },
  mutedText: { color: colors.muted, fontWeight: "600" },

  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    marginBottom: 16,
    gap: 10,
    ...shadow,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#34495e" },
  emptyText:  { color: colors.muted, textAlign: "center", lineHeight: 20, fontSize: 13 },

  /* Severity banner */
  severityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  severityLabel: { fontWeight: "800", fontSize: 14, flex: 1 },
  severityDate:  { color: colors.muted, fontSize: 12 },

  /* Stat cards */
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    ...shadow,
  },
  statLabel: { color: colors.muted, fontWeight: "700", marginBottom: 4, fontSize: 12 },
  statValue: { fontSize: 24, fontWeight: "900" },
  badgeRow:  { flexDirection: "row", alignItems: "center", marginTop: 8 },
  dot:       { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  badgeText: { fontWeight: "700", fontSize: 12 },

  /* Ring */
  pieCard:   { width: 88, alignItems: "center", justifyContent: "center" },
  pieCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  piePct:   { fontWeight: "900", fontSize: 14 },
  pieLabel: { fontSize: 10, color: colors.muted, fontWeight: "600" },

  /* ── Latest Detection Summary card ─────────────────────────── */
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderTopWidth: 4,
    ...shadow,
  },
  summaryCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.4,
    marginBottom: 12,
    textTransform: "uppercase",
  },

  /* Image + description */
  summaryTopRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  summaryImage: {
    width: 100,
    height: 90,
    borderRadius: 10,
  },
  summaryImagePlaceholder: {
    backgroundColor: "#eef4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryDescCol: { flex: 1, justifyContent: "space-between" },
  summaryText: {
    fontSize: 13,
    color: "#34495e",
    lineHeight: 19,
    marginBottom: 8,
  },
  summaryHighlight: { fontWeight: "800" },

  summaryMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  summaryMetaText: { fontSize: 11, color: colors.muted, fontWeight: "600" },

  /* 3-column stat grid */
  summaryStatGrid: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  summaryStatBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#DDE8FF",
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1A2B45",
  },
  summaryStatLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 3,
    lineHeight: 14,
  },

  summaryDivider: { height: 1, backgroundColor: "#eef4ff", marginBottom: 10 },

  /* Progress rows (inside summary card) */
  progressRow: { flexDirection: "row", alignItems: "center", marginVertical: 5 },
  progressLabel: { width: 72, color: colors.muted, fontWeight: "600", fontSize: 12 },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#eef4ff",
    borderRadius: 6,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  progressBarFill: { height: 8, borderRadius: 6 },
  progressNumber:  { width: 38, textAlign: "right", fontWeight: "800", fontSize: 12 },

  /* Buttons */
  primaryBtn: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, marginLeft: 12 },
  btnInner: { flexDirection: "row", alignItems: "center" },

  ghostBtn: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e6eefc",
  },
  ghostBtnText: { color: colors.primary, fontWeight: "800", fontSize: 16, marginLeft: 12 },

  /* ── Overall Analyses Summary section ──────────────────────── */
  pastSection: { marginTop: 4, marginBottom: 16 },

  pastHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  pastSectionTitle: { fontSize: 16, fontWeight: "800", color: "#1A2B45" },
  pastCountBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pastCountText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  /* Date range */
  dateRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 14,
  },
  dateRangeText: { color: colors.muted, fontSize: 12, fontWeight: "600" },

  /* 3-column coral count grid */
  summaryGrid: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    ...shadow,
  },
  summaryGridItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 4,
  },
  summaryGridBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#DDE8FF",
  },
  summaryGridValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A2B45",
  },
  summaryGridLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 14,
  },

  /* Avg bleaching rate */
  avgCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...shadow,
  },
  avgLeft:  { flex: 1 },
  avgLabel: { fontWeight: "800", fontSize: 14, color: "#1A2B45" },
  avgSub:   { color: colors.muted, fontSize: 11, marginTop: 2 },
  avgValue: { fontSize: 28, fontWeight: "900" },

  /* Overall distribution bars */
  overallBarsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    ...shadow,
  },
  overallBarsTitle: {
    fontWeight: "800",
    color: "#1A2B45",
    marginBottom: 12,
    fontSize: 13,
  },
  overallBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  overallBarLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    width: 76,
    gap: 5,
  },
  overallDot:   { width: 9, height: 9, borderRadius: 5 },
  overallBarLabel: { color: colors.muted, fontWeight: "600", fontSize: 12 },
  overallBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: "#EEF4FF",
    borderRadius: 6,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  overallBarFill: { height: 10, borderRadius: 6 },
  overallBarPct:  { width: 38, textAlign: "right", fontWeight: "800", fontSize: 12 },

  /* Severity breakdown vertical bars */
  sevBreakCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
    ...shadow,
  },
  sevBreakTitle: { fontWeight: "800", color: "#1A2B45", marginBottom: 14, fontSize: 13 },
  sevBreakRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 90,
  },
  sevBreakItem: { alignItems: "center", flex: 1, gap: 4 },
  sevBreakBar: {
    width: 36,
    height: 60,
    backgroundColor: "#EEF4FF",
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  sevBreakFill:  { width: "100%", borderRadius: 8 },
  sevBreakCount: { fontSize: 15, fontWeight: "900" },
  sevBreakLabel: { fontSize: 11, color: colors.muted, fontWeight: "700" },
});
