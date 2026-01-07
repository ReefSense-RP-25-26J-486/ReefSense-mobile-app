import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

interface GrowthDetailsScreenProps {
    onBack: () => void;
    onBackToUploads: () => void; 
}

export default function GrowthDetailsScreen({ onBack, onBackToUploads }: GrowthDetailsScreenProps) {
    return (
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
            {/* Back Navigation Link */}
            <TouchableOpacity onPress={onBackToUploads} style={styles.backLink}>
                <Text style={styles.backText}>{"< Return to Overview"}</Text>
            </TouchableOpacity>

            <View style={styles.mainCard}>
                <Text style={styles.scientificName}>Euphyllidae</Text>
                <Text style={styles.date}>Nov 15, 2025</Text>
                <View style={styles.alertBox}>
                    <Image source={require("../assets/icons/alert_icon.png")} style={styles.icon} />
                    <Text style={styles.alertText}>Transplanting Stage</Text>
                </View>
                <View style={styles.areaBox}>
                    <Text style={styles.areaLabel}>Current Area</Text>
                    <Text style={styles.areaValue}>13.1 cm²</Text>
                </View>
            </View>

            <View style={styles.historyCard}>
                <Text style={styles.historyTitle}>Growth History</Text>
                {[
                    { date: '2025-10-24', val: '12.1 cm²' },
                    { date: '2025-09-03', val: '12.1 cm²' },
                    { date: '2025-08-10', val: '11.9 cm²' }
                ].map((item, i) => (
                    <View key={i} style={styles.historyRow}>
                        <Text style={styles.historyDate}>📅  {item.date}</Text>
                        <Text style={styles.historyVal}>{item.val}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Text style={styles.btnTextWhite}>Back to Results</Text>
            </TouchableOpacity>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FFFFFF' },
    backLink: { marginBottom: 10, paddingVertical: 5 },
    backText: { color: "#517AAD", fontWeight: "bold", fontSize: 16, marginTop: 8 },
    mainCard: { backgroundColor: colors.card, padding: 20, borderRadius: 15, marginBottom: 20 },
    scientificName: { fontSize: 18, color: colors.textSecondary },
    date: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
    alertBox: { flexDirection: 'row', backgroundColor: '#F8D7DA', padding: 10, borderRadius: 10, alignItems: 'center' },
    alertText: { color: '#721c24', fontWeight: '600', marginLeft: 10 },
    icon: { width: 20, height: 20 },
    areaBox: { backgroundColor: '#BDD0E7', padding: 20, borderRadius: 15, marginTop: 15 },
    areaLabel: { fontSize: 16, color: colors.textSecondary },
    areaValue: { fontSize: 28, fontWeight: 'bold' },
    historyCard: { backgroundColor: colors.card, padding: 20, borderRadius: 15 },
    historyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#BDD0E7', padding: 10, borderRadius: 10, marginBottom: 8 },
    historyDate: { fontSize: 14, color: colors.textSecondary },
    historyVal: { fontSize: 14, fontWeight: 'bold', color: colors.textSecondary },
    backBtn: { backgroundColor: '#5D81B4', padding: 15, borderRadius: 12, marginTop: 20, alignItems: 'center' },
    btnTextWhite: { color: 'white', fontWeight: 'bold' }
});