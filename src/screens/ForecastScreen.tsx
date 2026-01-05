import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

// depth keys
type DepthKey = "0-2m" | "3-6m" | "7-10m";

const depthData: Record<DepthKey, number[]> = {
    "0-2m": [26.5, 26.8, 27.2, 26.9, 27.5, 28.0, 27.8],
    "3-6m": [26.0, 26.2, 26.5, 26.3, 26.8, 27.1, 26.9],
    "7-10m": [25.4, 25.6, 25.8, 25.5, 25.9, 26.2, 26.0],
};

// heatmap image
const heatMapAssets: Record<DepthKey, any> = {
    "0-2m": require("../assets/images/heatmap_0_2m.jpg"),
    "3-6m": require("../assets/images/heatmap_3_6m.jpg"),
    "7-10m": require("../assets/images/heatmap_7_10m.jpg"),
};

export default function ForecastScreen({ onBack }: { onBack: () => void }) {
    const [selectedDepth, setSelectedDepth] = useState<DepthKey>("0-2m");

    const chartData = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{ data: depthData[selectedDepth] }]
    };

    return (
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>

            <TouchableOpacity onPress={onBack} style={styles.backLink}>
                <Text style={styles.backText}>{"< Return to Overview"}</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle}>Temperature Fluctuation Predictions</Text>
            <Text style={styles.dateSubTitle}>December 18 - 24</Text>

            {/* Depth Selection Buttons */}
            <View style={styles.buttonRow}>
                {(Object.keys(depthData) as DepthKey[]).map((depth) => (
                    <TouchableOpacity
                        key={depth}
                        style={[
                            styles.depthBtn,
                            selectedDepth === depth && styles.activeDepthBtn
                        ]}
                        onPress={() => setSelectedDepth(depth)}
                    >
                        <Text style={[
                            styles.btnText,
                            selectedDepth === depth && styles.activeBtnText
                        ]}>
                            {depth}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Graph Card */}
            <View style={styles.graphCard}>
                <Text style={styles.graphLabel}>Temperature (°C)</Text>
                <LineChart
                    data={chartData}
                    width={screenWidth - 82}
                    height={220}
                    chartConfig={{
                        backgroundColor: "#ffffff",
                        backgroundGradientFrom: "#ffffff",
                        backgroundGradientTo: "#ffffff",
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(74, 120, 208, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        propsForDots: { r: "5", strokeWidth: "2", stroke: "#517AAD" },
                        propsForBackgroundLines: {
                            strokeDasharray: "", // makes background lines solid
                            stroke: "rgba(0,0,0,0.05)"
                        }
                    }}
                    bezier
                    style={styles.chart}
                />
            </View>

            <Text style={styles.pageTitle_1}>Coral Site Heat Map</Text>

            <View style={styles.heatMapContainer}>
                <Image
                    source={heatMapAssets[selectedDepth]}
                    style={styles.heatMapImage}
                    resizeMode="cover"
                />
                {/* Overlay text to show which depth is active on the map */}
                <View style={styles.mapOverlay}>
                    <Text style={styles.overlayText}>Viewing: {selectedDepth} Depth</Text>
                </View>
            </View>

            {/* Bottom Padding for Navbar overlap */}
            <View style={{ height: 130 }} />
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
        marginBottom: 10,
        paddingVertical: 5,
    },
    backText: {
        color: "#517AAD",
        fontWeight: "bold",
        fontSize: 16,
        marginTop: 8,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 0,
    },
    pageTitle_1: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 20,
        marginTop: 30,
    },
    dateSubTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    depthBtn: {
        paddingVertical: 12,
        borderRadius: 15,
        backgroundColor: '#DEE7F7',
        width: '30%',
        alignItems: 'center'
    },
    activeDepthBtn: {
        backgroundColor: '#517AAD'
    },
    btnText: {
        color: '#517AAD',
        fontWeight: '700',
        fontSize: 16,
    },
    activeBtnText: {
        color: '#FFFFFF'
    },
    graphCard: {
        backgroundColor: '#ffffff',
        borderRadius: 25,
        padding: 15,
        // Optional: add a slight shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    graphLabel: {
        fontSize: 14,
        color: '#6c6c6c',
        marginBottom: 10,
        marginLeft: 15,
        marginTop: 10,
        fontWeight: '600'
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16
    },
    heatMapContainer: {
        width: '100%',
        height: 250,
        borderRadius: 25,
        overflow: 'hidden',
        backgroundColor: '#F0F0F0',
        elevation: 2,
    },
    heatMapImage: {
        width: '100%',
        height: '100%',
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 10,
        right: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    overlayText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#517AAD',
    },
    backButton: {
        marginTop: 20,
        alignItems: 'center',
    }
});