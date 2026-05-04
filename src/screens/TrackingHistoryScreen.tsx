import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CoralSummary,
  deleteCoral,
  getAllCoralSummaries,
} from "../api/growthApi";
import { Text, TextInput } from "../components/AppText";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

interface Props {
  onViewDetails: (coralId: string) => void;
  onBackToUploads: () => void;
}

const STAGES = [
  { abbr: "RF", label: "Recruit", bg: "#47a0ff" },
  { abbr: "EJ", label: "Juvenile", bg: "#15be5b" },
  { abbr: "BE", label: "Branching", bg: "#b09113" },
  { abbr: "MC", label: "Mature", bg: "#eda34e" },
];

const DATE_RANGES = [
  { label: "All", days: null },
  { label: "30 d", days: 30 },
  { label: "3 mo", days: 90 },
  { label: "6 mo", days: 180 },
  { label: "1 yr", days: 365 },
] as const;

function growthStage(area: number) {
  if (area < 10)
    return {
      label: "Recruit / Fragment",
      abbr: "RF",
      color: "#fff",
      bg: "#47a0ff",
    };
  if (area < 25)
    return {
      label: "Established Juvenile",
      abbr: "EJ",
      color: "#fff",
      bg: "#15be5b",
    };
  if (area < 50)
    return {
      label: "Branching / Encrusting Phase",
      abbr: "BE",
      color: "#ffffff",
      bg: "#b09113",
    };
  return { label: "Mature Colony", abbr: "MC", color: "#fff", bg: "#eda34e" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Component

export default function TrackingHistoryScreen({
  onViewDetails,
  onBackToUploads,
}: Props) {
  const { token, selectedLocation } = useAuth();
  const [corals, setCorals] = useState<CoralSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterSpecies, setFilterSpecies] = useState<string[]>([]);
  const [filterStages, setFilterStages] = useState<string[]>([]);
  const [filterDays, setFilterDays] = useState<number | null>(null);

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCoralSummaries(token!, selectedLocation!.id);
      setCorals(
        [...data].sort(
          (a, b) =>
            new Date(b.last_recorded).getTime() -
            new Date(a.last_recorded).getTime(),
        ),
      );
    } catch (err: any) {
      setError(err.message ?? "Failed to load tracking history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleDelete = (coralId: string, count: number) => {
    Alert.alert(
      "Delete Coral",
      `Delete ${coralId} and all ${count} record${count !== 1 ? "s" : ""}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(coralId);
            try {
              await deleteCoral(coralId, token!, selectedLocation!.id);
              setCorals((prev) => prev.filter((c) => c.coral_id !== coralId));
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

  const uniqueSpecies = useMemo(
    () => [...new Set(corals.map((c) => c.species))].sort(),
    [corals],
  );

  const activeFilterCount =
    filterSpecies.length + filterStages.length + (filterDays !== null ? 1 : 0);

  const filtered = useMemo(() => {
    let result = corals;

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.coral_id.toLowerCase().includes(q) ||
          c.species.toLowerCase().includes(q),
      );
    }

    if (filterSpecies.length > 0) {
      result = result.filter((c) => filterSpecies.includes(c.species));
    }

    if (filterStages.length > 0) {
      result = result.filter((c) => {
        const area = parseFloat(c.latest_area as unknown as string);
        const stage = growthStage(area);
        return filterStages.includes(stage.abbr);
      });
    }

    if (filterDays !== null) {
      const cutoff = Date.now() - filterDays * 24 * 60 * 60 * 1000;
      result = result.filter(
        (c) => new Date(c.last_recorded).getTime() >= cutoff,
      );
    }

    return result;
  }, [corals, query, filterSpecies, filterStages, filterDays]);

  const toggleSpecies = (sp: string) =>
    setFilterSpecies((prev) =>
      prev.includes(sp) ? prev.filter((s) => s !== sp) : [...prev, sp],
    );

  const toggleStage = (abbr: string) =>
    setFilterStages((prev) =>
      prev.includes(abbr) ? prev.filter((s) => s !== abbr) : [...prev, abbr],
    );

  const clearFilters = () => {
    setFilterSpecies([]);
    setFilterStages([]);
    setFilterDays(null);
    setQuery("");
  };

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBackToUploads} style={styles.backLink}>
        <Text style={styles.backText}>{"< Return to Overview"}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Growth Tracker</Text>

      {/* Search + filter toggle row */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={18} color="#aaa" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID or Species…"
            placeholderTextColor="#AAA"
            returnKeyType="search"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              style={styles.clearBtn}
            >
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterToggleBtn,
            showFilters && styles.filterToggleBtnActive,
          ]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <MaterialIcons
            name="tune"
            size={20}
            color={showFilters ? "#fff" : "#5D81B4"}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Expandable filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          {/* Species */}
          {uniqueSpecies.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Species</Text>
              <View style={styles.chipRow}>
                {uniqueSpecies.map((sp) => {
                  const active = filterSpecies.includes(sp);
                  return (
                    <TouchableOpacity
                      key={sp}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleSpecies(sp)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {sp}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Growth Stage */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Growth Stage</Text>
            <View style={styles.chipRow}>
              {STAGES.map((s) => {
                const active = filterStages.includes(s.abbr);
                return (
                  <TouchableOpacity
                    key={s.abbr}
                    style={[
                      styles.chip,
                      active && { backgroundColor: s.bg, borderColor: s.bg },
                    ]}
                    onPress={() => toggleStage(s.abbr)}
                  >
                    <Text
                      style={[styles.chipText, active && { color: "#fff" }]}
                    >
                      {s.abbr} · {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Last Recorded</Text>
            <View style={styles.chipRow}>
              {DATE_RANGES.map((dr) => {
                const active = filterDays === dr.days;
                return (
                  <TouchableOpacity
                    key={String(dr.days)}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setFilterDays(active ? null : dr.days)}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {dr.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearAllBtn} onPress={clearFilters}>
              <MaterialCommunityIcons
                name="filter-remove-outline"
                size={15}
                color="#5D81B4"
              />
              <Text style={styles.clearAllText}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color="#5D81B4" />
          <Text style={styles.loadingText}>Loading records…</Text>
        </View>
      ) : error ? (
        <View style={styles.centred}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSummaries}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : corals.length === 0 ? (
        <View style={styles.centred}>
          <MaterialCommunityIcons name="fish" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No tracked corals yet.</Text>
          <Text style={styles.emptySubText}>
            Upload an image and assign a Coral ID to start tracking.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centred}>
          <MaterialCommunityIcons
            name="filter-off-outline"
            size={36}
            color="#ccc"
          />
          <Text style={styles.emptyText}>No results match your filters.</Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearAllText}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Summary strip */}
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{corals.length}</Text>
              <Text style={styles.summaryLabel}>Tracked Corals</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>
                {corals.reduce((s, c) => s + c.record_count, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Total Observations</Text>
            </View>
          </View>

          {/* Colony summary cards */}
          {filtered.map((coral) => {
            const area = parseFloat(coral.latest_area as unknown as string);
            const stage = growthStage(area);

            return (
              <View key={coral.coral_id} style={styles.card}>
                {/* Top row: ID + stage pill + delete */}
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coralId}>{coral.coral_id}</Text>
                    <Text style={styles.speciesText}>{coral.species}</Text>
                  </View>
                  <View
                    style={[styles.stagePill, { backgroundColor: stage.bg }]}
                  >
                    <Text
                      style={[styles.stagePillText, { color: stage.color }]}
                    >
                      {stage.abbr}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    disabled={deletingId === coral.coral_id}
                    onPress={() =>
                      handleDelete(coral.coral_id, coral.record_count)
                    }
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color="#CC3344"
                    />
                  </TouchableOpacity>
                </View>

                {/* Stage label bar */}
                <View
                  style={[
                    styles.stageBar,
                    { backgroundColor: stage.bg + "28" },
                  ]}
                >
                  <View
                    style={[styles.stageDot, { backgroundColor: stage.bg }]}
                  />
                  <Text
                    style={[
                      styles.stageBarText,
                      { color: stage.bg === "#F1C40F" ? "#856404" : stage.bg },
                    ]}
                  >
                    {stage.label}
                  </Text>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{area.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>cm² (latest)</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{coral.record_count}</Text>
                    <Text style={styles.statLabel}>Observations</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statVal} numberOfLines={1}>
                      {formatDate(coral.last_recorded)}
                    </Text>
                    <Text style={styles.statLabel}>Last Recorded</Text>
                  </View>
                </View>

                {/* CTA */}
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => onViewDetails(coral.coral_id)}
                >
                  <MaterialIcons name="trending-up" size={16} color="#fff" />
                  <Text style={styles.viewBtnText}>View Growth Pattern</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
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

  // Search row
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#5D81B4",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFF",
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: "#1a1a2e" },
  clearBtn: { padding: 4 },
  clearText: { color: "#999", fontSize: 15 },

  filterToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#5D81B4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFF",
  },
  filterToggleBtnActive: { backgroundColor: "#5D81B4", borderColor: "#5D81B4" },
  filterBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#e05c2a",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { fontSize: 9, color: "#fff", fontWeight: "800" },

  // Filter panel
  filterPanel: {
    backgroundColor: "#F0F5FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#c8d8ec",
  },
  filterSection: { marginBottom: 12 },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 7,
    textTransform: "uppercase",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#b0c4de",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#5D81B4", borderColor: "#5D81B4" },
  chipText: { fontSize: 12, color: "#444", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  clearAllText: { fontSize: 12, color: "#5D81B4", fontWeight: "600" },

  centred: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  loadingText: { marginTop: 12, color: colors.textSecondary },
  errorText: { color: "#721c24", textAlign: "center", marginBottom: 12 },
  retryBtn: {
    backgroundColor: "#5D81B4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },

  // Summary strip
  summaryStrip: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryVal: { fontSize: 22, fontWeight: "bold", color: "#1a1a2e" },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: "#c0cfe8" },

  // Colony card
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  coralId: { fontSize: 16, fontWeight: "800", color: "#1a1a2e" },
  speciesText: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  stagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 34,
    alignItems: "center",
  },
  stagePillText: { fontSize: 11, fontWeight: "800" },
  deleteBtn: { padding: 4 },
  stageBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  stageDot: { width: 8, height: 8, borderRadius: 4 },
  stageBarText: { fontSize: 12, fontWeight: "600" },

  // Stats row
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  statItem: { flex: 1, alignItems: "center" },
  statVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  statDivider: { width: 1, height: 28, backgroundColor: "#c0cfe8" },

  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#5D81B4",
    paddingVertical: 11,
    borderRadius: 12,
  },
  viewBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
