import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const sample = [
  { id: '1', title: 'Location 1', date: '2025-12-21', status: 'Bleached coral', pct: '43%', img: require('../../assets/images/heatmap_0_2m.jpg') },
  { id: '2', title: 'Location 1', date: '2025-12-21', status: 'Healthy Coral', pct: '12%', img: require('../../assets/images/heatmap_3_6m.jpg') },
  { id: '3', title: 'Location 2', date: '2025-12-20', status: 'Healthy Coral', pct: '8%', img: require('../../assets/images/heatmap_7_10m.jpg') },
];

export default function BleachingHistory({ onBack }: { onBack?: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backLink}>
          <Text style={styles.backText}>{'< Return to Overview'}</Text>
        </TouchableOpacity>
       
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>History</Text>

        {sample.map((s) => (
          <View key={s.id} style={styles.card}>
            <Image source={s.img} style={styles.thumb} />
            <View style={styles.cardBody}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Text style={styles.cardDate}>{s.date}</Text>
              </View>
              <Text style={styles.cardStatus}>{s.status}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.pill}><Text style={styles.pillText}>{s.pct}</Text></View>
                <TouchableOpacity style={styles.detailsBtn}>
                  <MaterialIcons name="chevron-right" size={20} color="#4A78D0" />
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
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? 18 : 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backLink: { paddingVertical: 6 },
  backText: { color: '#517AAD', fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800' },

  container: { paddingHorizontal: 18, paddingTop: 6 },
  sectionTitle: { fontSize: 16, color: '#708090', marginBottom: 12, fontWeight: '700' },

  card: { flexDirection: 'row', backgroundColor: '#F6F9FF', borderRadius: 14, padding: 12, marginBottom: 12, alignItems: 'center' },
  thumb: { width: 84, height: 64, borderRadius: 10, marginRight: 12, resizeMode: 'cover' },
  cardBody: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '800' },
  cardDate: { color: '#9AA6BF' },
  cardStatus: { marginTop: 6, color: '#34495e' },
  cardFooter: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e6eefc' },
  pillText: { fontWeight: '800' },
  detailsBtn: { padding: 6 },
});
