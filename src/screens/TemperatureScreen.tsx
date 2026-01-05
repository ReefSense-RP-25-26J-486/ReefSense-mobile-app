import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface TempProps {
    onGoToForecast: () => void;
    onGoToStress: () => void;
    onGoToRecords: () => void;
}

export default function TemperatureScreen({ onGoToForecast, onGoToStress, onGoToRecords }: TempProps) {
    return (
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
            {/* Weather Header Section */}
            <View style={styles.weatherSection}>
                <View>
                    <Text style={styles.date}>Today, 18 Sep</Text>
                    <Text style={styles.tempBig}>27°C</Text>
                </View>
                <Image
                    source={require("../assets/images/sun-cloud.png")}
                    style={styles.weatherImg}
                    resizeMode="contain"
                />
            </View>

            {/* Depth Range Card */}
            <View style={styles.dataCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.label}>Depth Range</Text>
                    <Text style={styles.label}>Coral Site Temperature</Text>
                </View>

                <View style={styles.dataRow}>
                    <Text style={styles.depthText}>0 - 2 m</Text>
                    <Text style={styles.tempText}>26.5 °C</Text>
                </View>

                <View style={styles.dataRow}>
                    <Text style={styles.depthText}>3 - 6 m</Text>
                    <Text style={styles.tempText}>26.0 °C</Text>
                </View>

                <View style={styles.dataRow}>
                    <Text style={styles.depthText}>7 - 10 m</Text>
                    <Text style={styles.tempText}>25.4 °C</Text>
                </View>
            </View>

            {/* Navigation Cards */}
            <TouchableOpacity style={styles.navCard} onPress={onGoToForecast}>
                <View style={styles.navContent}>
                    <Text style={styles.navTitle}>7 Days Coral Site Temperature Forecast</Text>
                    <Text style={styles.navSub}>You can see more detailed temperature fluctuation by from graphs and heatmaps</Text>
                </View>
                <MaterialIcons name="chevron-right" size={30} color="#4A78D0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navCard} onPress={onGoToStress}>
                <View style={styles.navContent}>
                    <Text style={styles.navTitle}>Coral Stress Detection & Recommendations</Text>
                    <Text style={styles.navSub}>You can detect coral heat stress for next 7 days and get recommendations with reasons why it recommend.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={30} color="#4A78D0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navCard} onPress={onGoToRecords}>
                <View style={styles.navContent}>
                    <Text style={styles.navTitle}>Coral Site Temperature Records</Text>
                    <Text style={styles.navSub}>You can add coral site temperature data to here when you measuring records.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={30} color="#4A78D0" />
            </TouchableOpacity>

            <View style={{ height: 140 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
    },
    weatherSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    date: {
        fontSize: 22,
        color: '#000',
        fontWeight: '400',
    },
    tempBig: {
        fontSize: 80,
        fontWeight: '400',
        color: '#000',
        marginTop: -10,
    },
    weatherImg: {
        width: 160,
        height: 140,
    },
    dataCard: {
        backgroundColor: '#DEE7F7',
        borderRadius: 25,
        padding: 20,
        marginTop: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000'
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#BDCDE9',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 15,
        marginBottom: 12
    },
    depthText: {
        fontSize: 16,
        color: '#444',
    },
    tempText: {
        fontSize: 16,
        color: '#444',
    },
    navCard: {
        backgroundColor: '#DEE7F7',
        borderRadius: 25,
        padding: 20,
        marginTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    navContent: {
        flex: 1,
        paddingRight: 10,
    },
    navTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#000',
        marginBottom: 5,
    },
    navSub: {
        fontSize: 13,
        color: '#708090',
        lineHeight: 18,
    },
});