import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  onRunAnalysis?: () => void;
  onBack?: () => void;
  onViewHistory?: () => void;
}

export default function BleachingDetectionScreen({ onRunAnalysis, onBack, onViewHistory }: Props) {
  // Hardcoded demo values
  const bleached = 26;
  const healthy = 12;
  const total = bleached + healthy;
  const bleachedPct = Math.round((bleached / total) * 100);
  const healthyPct = 100 - bleachedPct;
  // activeIndex handled by parent. Use onRunAnalysis to request navigation.

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backLink}>
            <Text style={styles.backText}>{"< Return to Overview"}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.smallMuted}>Site</Text>
            <Text style={styles.location}>Tropical Bay</Text>
          </View>
          <Text style={styles.date}>Mar 2025</Text>
        </View>

        <Text style={styles.title}>Bleaching Detection</Text>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Bleached</Text>
            <Text style={styles.statValue}>{bleached}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.dot, styles.dotBleached]} />
              <Text style={styles.badgeText}>{bleachedPct}%</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Healthy</Text>
            <Text style={styles.statValue}>{healthy}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.dot, styles.dotHealthy]} />
              <Text style={styles.badgeText}>{healthyPct}%</Text>
            </View>
          </View>

          <View style={styles.pieCard}>
            <View style={styles.pieCircle}>
              <Text style={styles.piePct}>{bleachedPct}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.period}>Last month</Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Bleached</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${bleachedPct}%`, backgroundColor: colors.bleached }]} />
            </View>
            <Text style={styles.progressNumber}>{bleachedPct}%</Text>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Healthy</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${healthyPct}%`, backgroundColor: colors.healthy }]} />
            </View>
            <Text style={styles.progressNumber}>{healthyPct}%</Text>
          </View>
        </View>

        <Pressable onPress={() => onRunAnalysis && onRunAnalysis()} style={styles.primaryBtn} android_ripple={{ color: '#3e64c6' }}>
          <View style={styles.btnInner}>
            <MaterialIcons name="analytics" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Run Analysis</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#fff" />
        </Pressable>

        <Pressable onPress={() => onViewHistory && onViewHistory()} style={styles.ghostBtn} android_ripple={{ color: '#e6eefc' }}>
          <View style={styles.btnInner}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.ghostBtnText}>View History</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
        </Pressable>

        <View style={{ height: 140 }} />
        </ScrollView>
      </View>

      {/* Navigation to analysis is handled by parent `Home` component via onRunAnalysis */}
    </SafeAreaView>
  );
}

const colors = {
  primary: '#4A78D0',
  muted: '#9AA6BF',
  bg: '#FFFFFF',
  card: '#F6F9FF',
  bleached: '#C0392B',
  healthy: '#2ECC71',
};

const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  android: { elevation: 4 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 18, paddingBottom: 110, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  smallMuted: { color: colors.muted, fontSize: 12 },
  location: { fontSize: 16, fontWeight: '700' },
  date: { color: colors.muted, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', marginVertical: 14, textAlign: 'left' },

  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 12, marginRight: 10, ...shadow },
  statLabel: { color: colors.muted, fontWeight: '700', marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '900' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotBleached: { backgroundColor: colors.bleached },
  dotHealthy: { backgroundColor: colors.healthy },
  badgeText: { fontWeight: '700' },

  pieCard: { width: 86, alignItems: 'center', justifyContent: 'center' },
  pieCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 6, borderColor: colors.healthy, alignItems: 'center', justifyContent: 'center' },
  piePct: { fontWeight: '900' },

  progressCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 16, ...shadow },
  period: { color: colors.muted, fontWeight: '700', marginBottom: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  progressLabel: { width: 80, color: colors.muted, fontWeight: '600' },
  progressBarBg: { flex: 1, height: 12, backgroundColor: '#eef4ff', borderRadius: 8, overflow: 'hidden', marginHorizontal: 10 },
  progressBarFill: { height: 12, borderRadius: 8 },
  progressNumber: { width: 40, textAlign: 'right', fontWeight: '700' },

  primaryBtn: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 12 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },

  ghostBtn: { marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e6eefc' },
  ghostBtnText: { color: colors.primary, fontWeight: '800', fontSize: 16, marginLeft: 12 },

  backLink: { marginTop: 10, paddingVertical: 5 },
  backText: { color: '#517AAD', fontWeight: '700', fontSize: 16 },

});
