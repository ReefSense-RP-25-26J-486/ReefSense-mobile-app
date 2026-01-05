import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

interface IdentificationResultsScreenProps {
    onTrackGrowth: () => void;
}

export default function IdentificationResultsScreen({ onTrackGrowth }: IdentificationResultsScreenProps) {
    const corals = [
        { id: 1, name: 'Euphyllide', img: require("../assets/images/crl1.png") },
        { id: 2, name: 'Euphyllide', img: require("../assets/images/crl2.png") }
    ];

    return (
        <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Identification Results</Text>
            <Image source={require("../assets/images/crl3.jpg")} style={styles.mainImg} />
            <Text style={styles.subtitle}>Identified corals</Text>
            {corals.map(item => (
                <View key={item.id} style={styles.card}>
                    <Image source={item.img} style={styles.coralImg} />
                    <View style={styles.info}>
                        <Text style={styles.name}>{item.name}</Text>
                        <TouchableOpacity style={styles.trackBtn} onPress={onTrackGrowth}>
                            <Text style={styles.btnText}>Track Growth</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    mainImg: { width: '100%', height: 200, borderRadius: 10, marginBottom: 20 },
    subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    card: { flexDirection: 'row', backgroundColor: colors.card, padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center' },
    coralImg: { width: 80, height: 80, borderRadius: 10 },
    info: { flex: 1, marginLeft: 15, alignItems: 'flex-end' },
    name: { fontSize: 18, marginBottom: 10 },
    trackBtn: { backgroundColor: '#5D81B4', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    btnText: { color: 'white', fontWeight: '600' }
});