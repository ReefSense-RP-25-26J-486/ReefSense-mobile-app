import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import recommendationIcon from '../assets/icons/recommendation_icon.png';
import alertIcon from '../assets/icons/alert_icon.png';

const screenWidth = Dimensions.get("window").width;

interface StressScreenProps {
    onBack: () => void;
}

export default function StressScreen({ onBack }: StressScreenProps) {

    // Data for Dec 18 - 24
    const chartData = {
        labels: ["18", "19", "20", "21", "22", "23", "24"],
        datasets: [
            {
                data: [29, 28.2, 30.5, 32, 31.5, 29, 28.5],
                color: (opacity = 1) => `rgba(0, 180, 216, ${opacity})`,
                strokeWidth: 3
            }
        ]
    };

    return (
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>

            <TouchableOpacity onPress={onBack} style={styles.backLink}>
                <Text style={styles.backText}>{"< Return to Overview"}</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle}>Coral Heat Stress Detection</Text>
            <Text style={styles.dateSubTitle}>December 18 - 24 (Predictions)</Text>

            {/* Graph Card */}
            <View style={styles.graphCard}>
                <Text style={styles.graphLabel}>Temperature (°C)</Text>

                {/* This wrapper ensures everything stays centered and contained */}
                <View style={styles.chartWrapper}>
                    <LineChart
                        data={chartData}
                        width={screenWidth - 50}
                        height={220}
                        fromNumber={33}
                        fromZero={false}
                        chartConfig={{
                            backgroundColor: "#ffffff",
                            backgroundGradientFrom: "#ffffff",
                            backgroundGradientTo: "#ffffff",
                            decimalPlaces: 1,
                            color: (opacity = 1) => `rgba(0, 180, 216, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            propsForDots: { r: "5", strokeWidth: "2", stroke: "#00B4D8" },
                            propsForBackgroundLines: {
                                strokeDasharray: "",
                                stroke: "rgba(0,0,0,0.05)"
                            },
                        }}
                        bezier
                        style={styles.chart}
                    />

                    {/* Red Stress Highlight - BROUGHT TO FRONT */}
                    <View style={styles.stressHighlight} pointerEvents="none" />
                </View>
            </View>

            {/* Recommendations Section */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Recommendations</Text>
                <View style={styles.listRow}>
                    <Image source={recommendationIcon} style={styles.assetIcon} />
                    <Text style={styles.listText}>Prefer deeper depths with lower predicted thermal stress.</Text>
                </View>
                <View style={styles.listRow}>
                    <Image source={recommendationIcon} style={styles.assetIcon} />
                    <Text style={styles.listText}>Increase monitoring frequency during rising temperature trends.</Text>
                </View>
            </View>

            {/* Alerts Section */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Alerts and Warnings</Text>
                <View style={styles.listRow}>
                    <Image source={alertIcon} style={styles.alertIconStyle} />
                    <Text style={styles.listText}>High coral heat stress risk detected.</Text>
                </View>
                <View style={styles.listRow}>
                    <Image source={alertIcon} style={styles.alertIconStyle} />
                    <Text style={styles.listText}>Potential coral bleaching risk in the next 7 days.</Text>
                </View>
            </View>

            <View style={{ height: 120 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
    },
    backLink: {
        marginTop: 10,
        paddingVertical: 5,
    },
    backText: {
        color: "#517AAD",
        fontWeight: "bold",
        fontSize: 16,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 10,
    },
    dateSubTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    graphCard: {
        backgroundColor: '#ffffff',
        borderRadius: 25,
        padding: 10,
        marginBottom: 30,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        overflow: 'hidden',
        alignItems: 'center',
    },
    graphLabel: {
        fontSize: 13,
        color: '#6c6c6c',
        alignSelf: 'flex-start',
        marginLeft: 15,
        marginTop: 15,
        fontWeight: '600'
    },
    chartWrapper: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
        // Removed heavy right padding to keep it centered
    },
    stressHighlight: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 0, 0, 0.15)', // Slightly darker for visibility
        width: '38%',
        height: '72%',
        left: '32%',
        top: '8%',
        zIndex: 10, // Higher Z-index brings it to the front
        borderRadius: 4,
    },
    section: {
        marginBottom: 25,
        paddingHorizontal: 5
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 15,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    assetIcon: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    alertIconStyle: {
        width: 32,
        height: 32,
        resizeMode: 'contain',
    },
    listText: {
        flex: 1,
        fontSize: 14,
        color: '#4A4A4A',
        marginLeft: 15,
        lineHeight: 20,
    },
});