import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

interface TrackingHistoryScreenProps {
    onViewDetails: () => void;
}

export default function TrackingHistoryScreen({ onViewDetails }: TrackingHistoryScreenProps) {
    return (
        <ScrollView>
            <Text style={styles.title}>Tracking History</Text>
            {[1, 2, 3, 4].map((item) => (
                <View key={item} style={styles.card}>
                    <Image source={require("../assets/images/crl1.png")} style={styles.img} />
                    <View style={styles.info}>
                        <Text style={styles.obsText}>Observation #24</Text>
                        <Text style={styles.dateText}>Oct 23, 2025</Text>
                        <TouchableOpacity style={styles.viewBtn} onPress={onViewDetails}>
                            <Text style={styles.btnText}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    card: { flexDirection: 'row', backgroundColor: colors.card, padding: 15, borderRadius: 15, marginBottom: 15 },
    img: { width: 90, height: 90, borderRadius: 10 },
    info: { flex: 1, marginLeft: 15, alignItems: 'flex-end' },
    obsText: { fontSize: 18, fontWeight: '600' },
    dateText: { fontSize: 16, color: colors.textSecondary, marginBottom: 10 },
    viewBtn: { backgroundColor: '#5D81B4', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
    btnText: { color: 'white', fontWeight: '600' }
});