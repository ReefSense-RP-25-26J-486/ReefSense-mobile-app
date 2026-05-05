import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from '../../components/AppText';
import { useAuth } from '../../context/AuthContext';
import { fetchHistory, type HistoryRecord } from "../../services/api";
import { exportToCsv } from "../../utils/exportCsv";

const colors = {
  primary: "#4A78D0",
  muted: "#9AA6BF",
  bg: "#FFFFFF",
  card: "#F6F9FF",
  bleached: "#C0392B",
  warning: "#F39C12",
  healthy: "#2ECC71",
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

/** Maps bleaching percentage → severity tier */
const getSeverity = (pct: number) => {
  if (pct < 20)
    return {
      label: "Low",
      fullLabel: "Low Severity",
      color: colors.healthy,
      bg: "#EAFAF1",
      icon: "checkmark-circle" as const,
    };
  if (pct < 50)
    return {
      label: "Medium",
      fullLabel: "Medium Severity",
      color: colors.warning,
      bg: "#FEF9E7",
      icon: "warning" as const,
    };
  return {
    label: "High",
    fullLabel: "High Severity",
    color: colors.bleached,
    bg: "#FDEDEC",
    icon: "alert-circle" as const,
  };
};

/** Formats an ISO date string to "Mar 5, 2026" */
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const fmtCoordinate = (value?: number | string | null) => {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(5) : String(value);
};

export default function BleachingHistory({ onBack }: { onBack?: () => void }) {
  const { token, selectedLocation } = useAuth();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async (isPullRefresh = false) => {
    if (!token || !selectedLocation) return;
    try {
      if (isPullRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await fetchHistory(token, selectedLocation.id);
      setRecords(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedLocation]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    exportToCsv(
      'bleaching_history',
      records.map((r) => ({
        id: r.id,
        date: fmtDate(r.date),
        location: r.location_details?.name ?? r.location,
        nursery: r.nursery,
        coral_id: r.coral_id ?? '',
        coral_detected: r.coral_detected,
        bleaching_detected: r.bleaching_detected,
        healthy_corals: r.coral_detected - r.bleaching_detected,
        bleaching_percentage: r.bleaching_percentage.toFixed(1),
        severity: getSeverity(r.bleaching_percentage).label,
        latitude: r.image_latitude ?? '',
        longitude: r.image_longitude ?? '',
      })),
      [
        { key: 'id',                  label: 'ID' },
        { key: 'date',                label: 'Date' },
        { key: 'location',            label: 'Location' },
        { key: 'nursery',             label: 'Nursery' },
        { key: 'coral_id',            label: 'Coral ID' },
        { key: 'coral_detected',      label: 'Coral Detected' },
        { key: 'bleaching_detected',  label: 'Bleaching Detected' },
        { key: 'healthy_corals',      label: 'Healthy Corals' },
        { key: 'bleaching_percentage',label: 'Bleaching %' },
        { key: 'severity',            label: 'Severity' },
        { key: 'latitude',            label: 'Latitude' },
        { key: 'longitude',           label: 'Longitude' },
      ],
    );
  };

  // Filter by coral ID search query
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredRecords = trimmedQuery
    ? records.filter((r) =>
        r.coral_id != null &&
        String(r.coral_id).toLowerCase().includes(trimmedQuery),
      )
    : records;

  // Summary counts derived from records
  const totalBleached = records.filter(
    (r) => r.bleaching_percentage >= 20,
  ).length;
  const totalHealthy = records.length - totalBleached;

  // ── Detail modal helpers ───────────────────────────────────────────────
  const modalSev = selectedRecord
    ? getSeverity(selectedRecord.bleaching_percentage)
    : null;
  const modalBPct = selectedRecord
    ? Math.round(selectedRecord.bleaching_percentage)
    : 0;
  const modalHPct = 100 - modalBPct;
  const modalHCount = selectedRecord
    ? selectedRecord.coral_detected - selectedRecord.bleaching_detected
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backLink}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Overview</Text>
        </TouchableOpacity>
        <View style={styles.topBarActions}>
          {!loading && records.length > 0 && (
            <TouchableOpacity onPress={handleExport} style={styles.iconBtn}>
              <MaterialIcons name="file-download" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
          {!loading && (
            <TouchableOpacity onPress={() => load()} style={styles.iconBtn}>
              <MaterialIcons name="refresh" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Page heading ────────────────────────────────────────────── */}
        <Text style={styles.pageTitle}>Analysis History</Text>

        {/* ── Summary bar (only when data is loaded) ──────────────────── */}
        {!loading && !error && records.length > 0 && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{records.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: colors.bleached }]}>
                {totalBleached}
              </Text>
              <Text style={styles.summaryLabel}>Bleached</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: colors.healthy }]}>
                {totalHealthy}
              </Text>
              <Text style={styles.summaryLabel}>Healthy</Text>
            </View>
          </View>
        )}

        {/* ── Coral ID Search bar ─────────────────────────────────────── */}
        {!loading && !error && records.length > 0 && (
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Coral ID…"
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchClear}>
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {loading && (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.mutedText}>Loading history…</Text>
          </View>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {!loading && error && (
          <View style={styles.centred}>
            <MaterialIcons
              name="error-outline"
              size={44}
              color={colors.bleached}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Empty ───────────────────────────────────────────────────── */}
        {!loading && !error && records.length === 0 && (
          <View style={styles.centred}>
            <Ionicons name="images-outline" size={52} color={colors.muted} />
            <Text style={styles.emptyTitle}>No Analyses Yet</Text>
            <Text style={styles.mutedText}>
              Run an analysis to start building your reef history.
            </Text>
          </View>
        )}

        {/* ── No search results ───────────────────────────────────────── */}
        {!loading && !error && records.length > 0 && filteredRecords.length === 0 && (
          <View style={styles.centred}>
            <Ionicons name="search-outline" size={40} color={colors.muted} />
            <Text style={styles.emptyTitle}>No Results</Text>
            <Text style={styles.mutedText}>
              No records match Coral ID "{searchQuery.trim()}".
            </Text>
          </View>
        )}

        {/* ── Records ─────────────────────────────────────────────────── */}
        {!loading &&
          !error &&
          filteredRecords.map((rec) => {
            const sev = getSeverity(rec.bleaching_percentage);
            const bleachedPct = rec.bleaching_percentage.toFixed(1);
            const healthyCnt = rec.coral_detected - rec.bleaching_detected;
            const siteName = rec.location_details?.name ?? rec.location;

            return (
              <TouchableOpacity
                key={rec.id}
                activeOpacity={0.75}
                onPress={() => setSelectedRecord(rec)}
                style={[styles.card, { borderLeftColor: sev.color }]}
              >
                {/* Thumbnail */}
                {rec.annotated_image_url ? (
                  <Image
                    source={{ uri: rec.annotated_image_url }}
                    style={styles.thumb}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Ionicons
                      name="image-outline"
                      size={28}
                      color={colors.muted}
                    />
                  </View>
                )}

                {/* Card body */}
                <View style={styles.cardBody}>
                  {/* Row 1: Location + Date */}
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardLocation} numberOfLines={1}>
                      {siteName}
                    </Text>
                    <Text style={styles.cardDate}>{fmtDate(rec.date)}</Text>
                  </View>

                  {/* Row 2: Nursery + Coral ID */}
                  <View style={styles.cardMetaRow}>
                    <Ionicons
                      name="business-outline"
                      size={12}
                      color={colors.muted}
                    />
                    <Text style={styles.cardMeta}>{rec.nursery}</Text>
                    {rec.location_details?.slug && (
                      <>
                        <Ionicons
                          name="map-outline"
                          size={12}
                          color={colors.muted}
                          style={{ marginLeft: 10 }}
                        />
                        <Text style={styles.cardMeta}>
                          {rec.location_details.slug}
                        </Text>
                      </>
                    )}
                    {rec.coral_id != null && (
                      <>
                        <Ionicons
                          name="pricetag-outline"
                          size={12}
                          color={colors.muted}
                          style={{ marginLeft: 10 }}
                        />
                        <Text style={styles.cardMeta}>ID: {rec.coral_id}</Text>
                      </>
                    )}
                  </View>

                  {/* Row 3: Coral counts */}
                  <View style={styles.cardCountRow}>
                    <View style={styles.countChip}>
                      <View
                        style={[
                          styles.countDot,
                          { backgroundColor: colors.bleached },
                        ]}
                      />
                      <Text style={styles.countText}>
                        {rec.bleaching_detected} bleached
                      </Text>
                    </View>
                    <View style={styles.countChip}>
                      <View
                        style={[
                          styles.countDot,
                          { backgroundColor: colors.healthy },
                        ]}
                      />
                      <Text style={styles.countText}>{healthyCnt} healthy</Text>
                    </View>
                  </View>

                  {/* Row 4: Severity badge + Percentage pill + tap hint */}
                  <View style={styles.cardFooter}>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: sev.bg },
                      ]}
                    >
                      <Text style={[styles.severityText, { color: sev.color }]}>
                        {sev.label} Severity
                      </Text>
                    </View>
                    <View style={styles.cardFooterRight}>
                      <View
                        style={[
                          styles.pctPill,
                          {
                            backgroundColor: sev.bg,
                            borderColor: sev.color + "55",
                          },
                        ]}
                      >
                        <Text style={[styles.pctText, { color: sev.color }]}>
                          {bleachedPct}% bleached
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.muted}
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          Detail Modal
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={selectedRecord !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRecord(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {selectedRecord && modalSev && (
              <>
                {/* ── Header bar ───────────────────────────────── */}
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: modalSev.color + "44" },
                  ]}
                >
                  <View style={styles.modalTitleCol}>
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      {selectedRecord.location_details?.name ??
                        selectedRecord.location}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {fmtDate(selectedRecord.date)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedRecord(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.modalScroll}
                >
                  {/* ── Annotated image ──────────────────────── */}
                  {selectedRecord.annotated_image_url ? (
                    <Image
                      source={{ uri: selectedRecord.annotated_image_url }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[styles.modalImage, styles.modalImagePlaceholder]}
                    >
                      <Ionicons
                        name="image-outline"
                        size={42}
                        color={colors.muted}
                      />
                      <Text style={styles.mutedText}>No image available</Text>
                    </View>
                  )}

                  {/* ── Severity banner ───────────────────────── */}
                  <View
                    style={[
                      styles.modalSevBanner,
                      {
                        backgroundColor: modalSev.color + "18",
                        borderColor: modalSev.color + "55",
                      },
                    ]}
                  >
                    <Ionicons
                      name={modalSev.icon}
                      size={20}
                      color={modalSev.color}
                    />
                    <Text
                      style={[styles.modalSevLabel, { color: modalSev.color }]}
                    >
                      {modalSev.fullLabel}
                    </Text>
                    <Text
                      style={[styles.modalSevPct, { color: modalSev.color }]}
                    >
                      {selectedRecord.bleaching_percentage.toFixed(1)}% bleached
                    </Text>
                  </View>

                  {/* ── 3-column stat grid ────────────────────── */}
                  <View style={styles.modalStatGrid}>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatValue}>
                        {selectedRecord.coral_detected}
                      </Text>
                      <Text style={styles.modalStatLabel}>
                        Coral{"\n"}Detected
                      </Text>
                    </View>
                    <View
                      style={[styles.modalStatItem, styles.modalStatBorder]}
                    >
                      <Text
                        style={[
                          styles.modalStatValue,
                          { color: colors.bleached },
                        ]}
                      >
                        {selectedRecord.bleaching_detected}
                      </Text>
                      <Text style={styles.modalStatLabel}>
                        Bleaching{"\n"}Detected
                      </Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text
                        style={[
                          styles.modalStatValue,
                          { color: colors.healthy },
                        ]}
                      >
                        {modalHCount}
                      </Text>
                      <Text style={styles.modalStatLabel}>
                        Healthy{"\n"}Corals
                      </Text>
                    </View>
                  </View>

                  {/* ── Progress bars ─────────────────────────── */}
                  <View style={styles.modalBarsCard}>
                    <Text style={styles.modalBarsTitle}>
                      Coral Health Breakdown
                    </Text>

                    <View style={styles.modalBarRow}>
                      <View style={styles.modalBarLabelCol}>
                        <View
                          style={[
                            styles.modalBarDot,
                            { backgroundColor: colors.bleached },
                          ]}
                        />
                        <Text style={styles.modalBarLabel}>Bleached</Text>
                      </View>
                      <View style={styles.modalBarBg}>
                        <View
                          style={[
                            styles.modalBarFill,
                            {
                              width: `${modalBPct}%`,
                              backgroundColor: colors.bleached,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.modalBarPct, { color: colors.bleached }]}
                      >
                        {modalBPct}%
                      </Text>
                    </View>

                    <View style={styles.modalBarRow}>
                      <View style={styles.modalBarLabelCol}>
                        <View
                          style={[
                            styles.modalBarDot,
                            { backgroundColor: colors.healthy },
                          ]}
                        />
                        <Text style={styles.modalBarLabel}>Healthy</Text>
                      </View>
                      <View style={styles.modalBarBg}>
                        <View
                          style={[
                            styles.modalBarFill,
                            {
                              width: `${modalHPct}%`,
                              backgroundColor: colors.healthy,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.modalBarPct, { color: colors.healthy }]}
                      >
                        {modalHPct}%
                      </Text>
                    </View>
                  </View>

                  {/* ── Natural-language summary ──────────────── */}
                  <View style={styles.modalSummaryCard}>
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color={colors.primary}
                      style={{ marginBottom: 6 }}
                    />
                    <Text style={styles.modalSummaryText}>
                      <Text
                        style={[
                          styles.modalSummaryBold,
                          { color: modalSev.color },
                        ]}
                      >
                        {selectedRecord.bleaching_percentage.toFixed(1)}%{" "}
                      </Text>
                      of corals at{" "}
                      <Text style={styles.modalSummaryBold}>
                        {selectedRecord.location_details?.name ??
                          selectedRecord.location}
                      </Text>{" "}
                      showed bleaching signs. Out of{" "}
                      <Text style={styles.modalSummaryBold}>
                        {selectedRecord.coral_detected}
                      </Text>{" "}
                      corals scanned,{" "}
                      <Text
                        style={[
                          styles.modalSummaryBold,
                          { color: colors.bleached },
                        ]}
                      >
                        {selectedRecord.bleaching_detected} were bleached
                      </Text>{" "}
                      and{" "}
                      <Text
                        style={[
                          styles.modalSummaryBold,
                          { color: colors.healthy },
                        ]}
                      >
                        {modalHCount} were healthy
                      </Text>
                      .
                    </Text>
                  </View>

                  {/* ── Meta details ──────────────────────────── */}
                  {selectedRecord.location_details && (
                    <View style={styles.modalLocationCard}>
                      <View style={styles.modalLocationHeader}>
                        <Ionicons
                          name="map-outline"
                          size={17}
                          color={colors.primary}
                        />
                        <Text style={styles.modalMetaTitle}>Research Site</Text>
                      </View>
                      <Text style={styles.modalLocationName}>
                        {selectedRecord.location_details.name}
                      </Text>
                      {selectedRecord.location_details.description ? (
                        <Text style={styles.modalLocationDescription}>
                          {selectedRecord.location_details.description}
                        </Text>
                      ) : null}
                      <View style={styles.modalLocationGrid}>
                        <View style={styles.modalLocationItem}>
                          <Text style={styles.modalLocationLabel}>Site ID</Text>
                          <Text style={styles.modalLocationValue}>
                            {selectedRecord.location_details.id}
                          </Text>
                        </View>
                        {selectedRecord.location_details.slug ? (
                          <View style={styles.modalLocationItem}>
                            <Text style={styles.modalLocationLabel}>Slug</Text>
                            <Text style={styles.modalLocationValue}>
                              {selectedRecord.location_details.slug}
                            </Text>
                          </View>
                        ) : null}
                        {fmtCoordinate(
                          selectedRecord.location_details.center_lat,
                        ) &&
                        fmtCoordinate(
                          selectedRecord.location_details.center_lon,
                        ) ? (
                          <View style={styles.modalLocationItem}>
                            <Text style={styles.modalLocationLabel}>
                              Center
                            </Text>
                            <Text style={styles.modalLocationValue}>
                              {fmtCoordinate(
                                selectedRecord.location_details.center_lat,
                              )}
                              ,{" "}
                              {fmtCoordinate(
                                selectedRecord.location_details.center_lon,
                              )}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}

                  <View style={styles.modalMetaCard}>
                    <Text style={styles.modalMetaTitle}>Analysis Details</Text>

                    <View style={styles.modalMetaRow}>
                      <Ionicons
                        name="location-outline"
                        size={15}
                        color={colors.muted}
                      />
                      <Text style={styles.modalMetaLabel}>Location</Text>
                      <Text style={styles.modalMetaValue}>
                        {selectedRecord.location}
                      </Text>
                    </View>
                    <View style={styles.modalMetaDivider} />

                    <View style={styles.modalMetaRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={colors.muted}
                      />
                      <Text style={styles.modalMetaLabel}>Date</Text>
                      <Text style={styles.modalMetaValue}>
                        {fmtDate(selectedRecord.date)}
                      </Text>
                    </View>
                    <View style={styles.modalMetaDivider} />

                    <View style={styles.modalMetaRow}>
                      <Ionicons
                        name="business-outline"
                        size={15}
                        color={colors.muted}
                      />
                      <Text style={styles.modalMetaLabel}>Nursery</Text>
                      <Text style={styles.modalMetaValue}>
                        {selectedRecord.nursery}
                      </Text>
                    </View>

                    {selectedRecord.coral_id != null && (
                      <>
                        <View style={styles.modalMetaDivider} />
                        <View style={styles.modalMetaRow}>
                          <Ionicons
                            name="pricetag-outline"
                            size={15}
                            color={colors.muted}
                          />
                          <Text style={styles.modalMetaLabel}>Coral ID</Text>
                          <Text style={styles.modalMetaValue}>
                            {selectedRecord.coral_id}
                          </Text>
                        </View>
                      </>
                    )}

                    {fmtCoordinate(selectedRecord.image_latitude) &&
                    fmtCoordinate(selectedRecord.image_longitude) ? (
                      <>
                        <View style={styles.modalMetaDivider} />
                        <View style={styles.modalMetaRow}>
                          <Ionicons
                            name="navigate-outline"
                            size={15}
                            color={colors.muted}
                          />
                          <Text style={styles.modalMetaLabel}>Image GPS</Text>
                          <Text style={styles.modalMetaValue}>
                            {fmtCoordinate(selectedRecord.image_latitude)},{" "}
                            {fmtCoordinate(selectedRecord.image_longitude)}
                          </Text>
                        </View>
                      </>
                    ) : null}
                  </View>

                  <View style={{ height: 32 }} />
                </ScrollView>

                {/* ── Close button ─────────────────────────────── */}
                <Pressable
                  onPress={() => setSelectedRecord(null)}
                  style={styles.modalCloseBar}
                  android_ripple={{ color: "#e6eefc" }}
                >
                  <Text style={styles.modalCloseBarText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  /* Top bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 18 : 14,
    paddingBottom: 8,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF4FF",
  },
  backLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { padding: 6 },

  /* Scroll content */
  container: { paddingHorizontal: 16, paddingTop: 16 },

  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A2B45",
    marginBottom: 14,
  },

  /* Summary bar */
  summaryBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "space-around",
    ...shadow,
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryCount: { fontSize: 22, fontWeight: "900", color: "#1A2B45" },
  summaryLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "700",
    marginTop: 2,
  },
  summaryDivider: { width: 1, height: 36, backgroundColor: "#DDE8FF" },

  /* Search bar */
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DDE8FF",
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: "#1A2B45",
    fontFamily: "DMSans_400Regular",
  },
  searchClear: { padding: 4 },

  /* Loading / error / empty */
  centred: { alignItems: "center", marginTop: 56, gap: 12 },
  mutedText: { color: colors.muted, fontWeight: "600", textAlign: "center" },
  errorText: { color: colors.bleached, fontWeight: "600", textAlign: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#34495e" },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "800" },

  /* Card */
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...shadow,
  },

  /* Thumbnail */
  thumb: {
    width: 82,
    height: 82,
    borderRadius: 10,
    marginRight: 12,
    resizeMode: "cover",
  },
  thumbPlaceholder: {
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Card body rows */
  cardBody: { flex: 1, justifyContent: "space-between" },

  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardLocation: {
    fontWeight: "800",
    color: "#1A2B45",
    maxWidth: "58%",
    fontSize: 14,
  },
  cardDate: { color: colors.muted, fontSize: 11, fontWeight: "600" },

  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 4,
  },
  cardMeta: { color: colors.muted, fontSize: 11, fontWeight: "600" },

  cardCountRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  countChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  countDot: { width: 8, height: 8, borderRadius: 4 },
  countText: { fontSize: 11, color: "#34495e", fontWeight: "600" },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardFooterRight: { flexDirection: "row", alignItems: "center", gap: 4 },

  /* Severity badge */
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: { fontSize: 11, fontWeight: "800" },

  /* Percentage pill */
  pctPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  pctText: { fontSize: 11, fontWeight: "800" },

  /* ══════════════════════════════════════════
     Detail Modal styles
  ══════════════════════════════════════════ */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    overflow: "hidden",
  },

  /* Modal header */
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitleCol: { flex: 1, marginRight: 12 },
  modalTitle: { fontSize: 17, fontWeight: "900", color: "#1A2B45" },
  modalSubtitle: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 2,
  },
  modalCloseBtn: { padding: 4 },

  /* Scrollable modal content */
  modalScroll: { paddingHorizontal: 18, paddingTop: 14 },

  /* Annotated image */
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    marginBottom: 14,
  },
  modalImagePlaceholder: {
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  /* Severity banner */
  modalSevBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  modalSevLabel: { fontWeight: "800", fontSize: 14, flex: 1 },
  modalSevPct: { fontWeight: "800", fontSize: 13 },

  /* 3-column stat grid */
  modalStatGrid: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    ...shadow,
  },
  modalStatItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  modalStatBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#DDE8FF",
  },
  modalStatValue: { fontSize: 22, fontWeight: "900", color: "#1A2B45" },
  modalStatLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 14,
  },

  /* Progress bars card */
  modalBarsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    ...shadow,
  },
  modalBarsTitle: {
    fontWeight: "800",
    color: "#1A2B45",
    fontSize: 13,
    marginBottom: 12,
  },
  modalBarRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  modalBarLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    width: 76,
    gap: 5,
  },
  modalBarDot: { width: 9, height: 9, borderRadius: 5 },
  modalBarLabel: { color: colors.muted, fontWeight: "600", fontSize: 12 },
  modalBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: "#EEF4FF",
    borderRadius: 6,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  modalBarFill: { height: 10, borderRadius: 6 },
  modalBarPct: {
    width: 36,
    textAlign: "right",
    fontWeight: "800",
    fontSize: 12,
  },

  /* Natural-language summary */
  modalSummaryCard: {
    backgroundColor: "#F0F7FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  modalSummaryText: {
    fontSize: 13,
    color: "#34495e",
    lineHeight: 20,
  },
  modalSummaryBold: { fontWeight: "800" },

  /* Location details card */
  modalLocationCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E3ECFF",
    ...shadow,
  },
  modalLocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  modalLocationName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1A2B45",
  },
  modalLocationDescription: {
    color: "#607087",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  modalLocationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  modalLocationItem: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: "30%",
    flexGrow: 1,
  },
  modalLocationLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  modalLocationValue: {
    color: "#1A2B45",
    fontSize: 12,
    fontWeight: "800",
  },

  /* Meta details card */
  modalMetaCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
    ...shadow,
  },
  modalMetaTitle: {
    fontWeight: "800",
    fontSize: 13,
    color: "#1A2B45",
    marginBottom: 10,
  },
  modalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  modalMetaLabel: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 12,
    width: 72,
  },
  modalMetaValue: {
    flex: 1,
    color: "#1A2B45",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
  },
  modalMetaDivider: { height: 1, backgroundColor: "#EEF4FF" },

  /* Close button at bottom */
  modalCloseBar: {
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEF4FF",
    backgroundColor: "#fff",
  },
  modalCloseBarText: { color: colors.primary, fontWeight: "800", fontSize: 15 },
});
