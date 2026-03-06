import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { fetchHistory, type HistoryRecord } from "../../services/api";

export default function BleachingHistory({ onBack }: { onBack?: () => void }) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHistory();
      setRecords(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = (pct: number) =>
    pct >= 20 ? "Bleached coral" : "Healthy Coral";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backLink}>
          <Text style={styles.backText}>{"< Return to Overview"}</Text>
        </TouchableOpacity>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>History</Text>
          {!loading && (
            <TouchableOpacity onPress={load} style={styles.refreshBtn}>
              <MaterialIcons name="refresh" size={20} color="#4A78D0" />
            </TouchableOpacity>
          )}
        </View>

        {/* Loading state */}
        {loading && (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color="#4A78D0" />
            <Text style={styles.mutedText}>Loading history…</Text>
          </View>
        )}

        {/* Error state */}
        {!loading && error && (
          <View style={styles.centred}>
            <MaterialIcons name="error-outline" size={40} color="#C0392B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {!loading && !error && records.length === 0 && (
          <View style={styles.centred}>
            <MaterialIcons name="photo-library" size={48} color="#9AA6BF" />
            <Text style={styles.mutedText}>No analyses recorded yet.</Text>
          </View>
        )}

        {/* Records */}
        {!loading &&
          !error &&
          records.map((rec) => (
            <View key={rec.id} style={styles.card}>
              {rec.annotated_image_url ? (
                <Image
                  source={{ uri: rec.annotated_image_url }}
                  style={styles.thumb}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <MaterialIcons name="image" size={28} color="#9AA6BF" />
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {rec.location}
                  </Text>
                  <Text style={styles.cardDate}>
                    {new Date(rec.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.cardNursery}>Nursery: {rec.nursery}</Text>
                <Text style={styles.cardCoral}>
                  Coral ID: {rec.coral_id ?? "—"}
                </Text>
                <Text style={styles.cardStatus}>
                  {statusLabel(rec.bleaching_percentage)}
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>
                      {rec.bleaching_percentage.toFixed(1)}%
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.detailsBtn}>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color="#4A78D0"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 18 : 22,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backLink: { paddingVertical: 6 },
  backText: { color: "#517AAD", fontWeight: "700" },

  container: { paddingHorizontal: 18, paddingTop: 6 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, color: "#708090", fontWeight: "700" },
  refreshBtn: { padding: 4 },

  centred: { alignItems: "center", marginTop: 48, gap: 12 },
  mutedText: { color: "#9AA6BF", fontWeight: "600" },
  errorText: { color: "#C0392B", fontWeight: "600", textAlign: "center" },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#4A78D0",
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "800" },

  card: {
    flexDirection: "row",
    backgroundColor: "#F6F9FF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  thumb: {
    width: 84,
    height: 64,
    borderRadius: 10,
    marginRight: 12,
    resizeMode: "cover",
  },
  thumbPlaceholder: {
    backgroundColor: "#eef4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontWeight: "800", maxWidth: "60%" },
  cardDate: { color: "#9AA6BF" },
  cardNursery: { marginTop: 2, color: "#9AA6BF", fontSize: 12 },
  cardCoral: { marginTop: 2, color: "#9AA6BF", fontSize: 12 },
  cardStatus: { marginTop: 4, color: "#34495e" },
  cardFooter: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pill: {
    backgroundColor: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e6eefc",
  },
  pillText: { fontWeight: "800" },
  detailsBtn: { padding: 6 },
});
