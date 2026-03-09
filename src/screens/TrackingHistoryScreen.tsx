import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text, TextInput } from '../components/AppText';
import { CoralSummary, deleteCoral, getAllCoralSummaries } from "../api/growthApi";
import { colors } from "../constants/colors";

interface TrackingHistoryScreenProps {
  onViewDetails: (coralId: string) => void;
  onBackToUploads: () => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function speciesInitials(species: string) {
  const parts = species.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return species.slice(0, 2).toUpperCase();
}

export default function TrackingHistoryScreen({
  onViewDetails,
  onBackToUploads,
}: TrackingHistoryScreenProps) {
  const [corals, setCorals] = useState<CoralSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteCoral = (coralId: string, recordCount: number) => {
    Alert.alert(
      "Delete Coral",
      `Delete ${coralId} and all ${recordCount} record${recordCount !== 1 ? "s" : ""}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(coralId);
            try {
              await deleteCoral(coralId);
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

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCoralSummaries();
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.last_recorded).getTime() -
          new Date(a.last_recorded).getTime(),
      );
      setCorals(sorted);
    } catch (err: any) {
      setError(err.message ?? "Failed to load tracking history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const filtered = searchQuery.trim()
    ? corals.filter((c) =>
        c.coral_id.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : corals;

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBackToUploads} style={styles.backLink}>
        <Text style={styles.backText}>{"< Return to Overview"}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Tracking History</Text>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Coral ID…"
          placeholderTextColor="#AAA"
          autoCapitalize="characters"
          returnKeyType="search"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

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
          <Text style={styles.emptyText}>No tracked corals yet.</Text>
          <Text style={styles.emptySubText}>
            Upload an image and track a coral to see it here.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centred}>
          <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
        </View>
      ) : (
        <>
          {/* Summary header */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryVal}>{corals.length}</Text>
              <Text style={styles.summaryLabel}>Tracked Corals</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryVal}>
                {corals.reduce((s, c) => s + c.record_count, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Total Observations</Text>
            </View>
          </View>

          {filtered.map((coral) => (
            <View key={coral.coral_id} style={styles.card}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>{speciesInitials(coral.species)}</Text>
              </View>

              <View style={styles.info}>
                <View style={styles.topRow}>
                  <Text style={styles.coralIdText}>{coral.coral_id}</Text>
                  <View style={styles.topRowRight}>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>
                        {coral.record_count} record{coral.record_count !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      disabled={deletingId === coral.coral_id}
                      onPress={() =>
                        handleDeleteCoral(coral.coral_id, coral.record_count)
                      }
                    >
                      <Text style={styles.deleteBtnText}>
                        {deletingId === coral.coral_id ? "…" : "🗑"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.speciesText}>{coral.species}</Text>
                <Text style={styles.areaText}>
                  Latest area:{" "}
                  <Text style={styles.areaVal}>
                    {parseFloat(coral.latest_area as unknown as string).toFixed(2)} cm²
                  </Text>
                </Text>
                <Text style={styles.dateText}>📅 {formatDate(coral.last_recorded)}</Text>

                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => onViewDetails(coral.coral_id)}
                >
                  <Text style={styles.btnText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  backLink: { marginBottom: 10, paddingVertical: 5 },
  backText: { color: "#517AAD", fontWeight: "bold", fontSize: 16, marginTop: 8 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 14 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#5D81B4",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFF",
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: "#1a1a2e",
    letterSpacing: 0.5,
  },
  clearBtn: { padding: 4 },
  clearText: { color: "#999", fontSize: 16 },
  centred: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  loadingText: { marginTop: 12, color: colors.textSecondary },
  errorText: { color: "#721c24", textAlign: "center", marginBottom: 12 },
  retryBtn: {
    backgroundColor: "#5D81B4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "white", fontWeight: "600" },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  summaryBadge: {
    backgroundColor: "#BDD0E7",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
  },
  summaryVal: { fontSize: 20, fontWeight: "bold", color: "#1a1a2e" },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#BDD0E7",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  avatarText: { fontSize: 18, fontWeight: "bold", color: "#5D81B4" },
  info: { flex: 1, marginLeft: 12 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  topRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: { fontSize: 17 },
  coralIdText: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
  countBadge: {
    backgroundColor: "#5D81B4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countText: { color: "white", fontSize: 11, fontWeight: "600" },
  speciesText: { fontSize: 14, color: colors.textSecondary, marginBottom: 3 },
  areaText: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  areaVal: { fontWeight: "700", color: "#1a1a2e" },
  dateText: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  viewBtn: {
    backgroundColor: "#5D81B4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  btnText: { color: "white", fontWeight: "600", fontSize: 13 },
});
