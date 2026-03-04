import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import recommendationIcon from '../assets/icons/recommendation_icon.png';
import alertIcon from '../assets/icons/alert_icon.png';

const screenWidth = Dimensions.get("window").width;

type DepthKey = "3m" | "7m" | "10m";

interface StressScreenProps {
    onBack: () => void;
}

export default function StressScreen({ onBack }: StressScreenProps) {
    const [apiData, setApiData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDepth, setSelectedDepth] = useState<DepthKey>("3m");

    // Scientific Thresholds matching your backend
    const thresholds: Record<DepthKey, number> = {
        "3m": 30.0,
        "7m": 29.6,
        "10m": 29.2
    };

    useEffect(() => {
        fetch("https://gimhanibrahmanage-reefsense-ai.hf.space/api/dashboard")
            .then((res) => res.json())
            .then((json) => {
                setApiData(json);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Stress Fetch Error:", err);
                setLoading(false);
            });
    }, []);

    const getBaseDate = () => {
        const rawString = apiData?.header?.reading_time;
        if (!rawString) return new Date();
        try {
            const parts = rawString.split(/[\s-:]/);
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            return isNaN(d.getTime()) ? new Date() : d;
        } catch (e) {
            return new Date();
        }
    };

    const getGraphLabels = () => {
        const startDate = getBaseDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startDate.getTime());
            d.setDate(startDate.getDate() + i);
            return `${d.getDate()} ${monthNames[d.getMonth()]}`;
        });
    };

    const getChartPoints = () => {
        const rawValues = apiData?.details?.[selectedDepth]?.graph_values || [];
        if (rawValues.length === 0) return [0, 0, 0, 0, 0, 0, 0];
        let dailyPeaks: number[] = [];
        for (let i = 0; i < rawValues.length; i += 4) {
            const daySlice = rawValues.slice(i, i + 4).map((v: any) => parseFloat(v));
            const validSlice = daySlice.filter(v => !isNaN(v));
            dailyPeaks.push(validSlice.length > 0 ? Math.max(...validSlice) : 0);
        }
        return dailyPeaks.length >= 7 ? dailyPeaks.slice(0, 7) : dailyPeaks.concat(new Array(7 - dailyPeaks.length).fill(0));
    };

    if (loading || !apiData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#517AAD" />
                <Text style={{ marginTop: 10, color: '#517AAD' }}>Analyzing Heat Stress...</Text>
            </View>
        );
    }

    const currentData = apiData?.details?.[selectedDepth] || {};
    const graphPoints = getChartPoints();
    const currentLimit = thresholds[selectedDepth];
    const recommendations = currentData?.recommendations || [];
    const depthIndexMap: { [key in DepthKey]: number } = { "3m": 0, "7m": 1, "10m": 2 };
    const statusInfo = apiData?.window_1?.[depthIndexMap[selectedDepth]] || { stress_status: "Normal" };

    // CALCULATE THE SINGLE RECTANGLE
    const renderSingleStressBox = () => {
        const stressedIndices = graphPoints
            .map((temp, idx) => (temp >= currentLimit ? idx : -1))
            .filter((idx) => idx !== -1);

        if (stressedIndices.length === 0) return null;

        const firstIdx = Math.min(...stressedIndices);
        const lastIdx = Math.max(...stressedIndices);

        const chartWidth = screenWidth - 65;
        const paddingLeftOffset = 45; // Alignment for Y-axis
        const paddingRightOffset = 25;
        const availableWidth = chartWidth - paddingLeftOffset - paddingRightOffset;
        const stepWidth = availableWidth / 6;

        // Calculate Position and Width
        const boxLeft = paddingLeftOffset + (firstIdx * stepWidth) - 10;
        const boxWidth = ((lastIdx - firstIdx) * stepWidth) + 20;

        return (
            <View
                style={[
                    styles.singleStressBox,
                    { left: boxLeft, width: boxWidth }
                ]}
                pointerEvents="none"
            />
        );
    };

    return (
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={onBack} style={styles.backLink}>
                <Text style={styles.backText}>{"< Return to Overview"}</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle}>Coral Heat Stress Detection</Text>
            <Text style={styles.dateSubTitle}>7-Day Predictive Analysis ({selectedDepth})</Text>

            <View style={styles.buttonRow}>
                {(["3m", "7m", "10m"] as DepthKey[]).map((depth) => (
                    <TouchableOpacity
                        key={depth}
                        style={[styles.depthBtn, selectedDepth === depth && styles.activeDepthBtn]}
                        onPress={() => setSelectedDepth(depth)}
                    >
                        <Text style={[styles.btnText, selectedDepth === depth && styles.activeBtnText]}>{depth}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.graphCard}>
                <Text style={styles.graphLabel}>Daily Peak Temperature (°C)</Text>
                <View style={styles.chartWrapper}>
                    {/* The Chart (Background) */}
                    <LineChart
                        data={{
                            labels: getGraphLabels(),
                            datasets: [{ data: graphPoints }]
                        }}
                        width={screenWidth - 65}
                        height={240}
                        fromZero={false}
                        chartConfig={{
                            backgroundColor: "#ffffff",
                            backgroundGradientFrom: "#ffffff",
                            backgroundGradientTo: "#ffffff",
                            decimalPlaces: 2,
                            color: (opacity = 1) => `rgba(0, 180, 216, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            propsForDots: { r: "5", strokeWidth: "2", stroke: "#00B4D8" },
                            propsForBackgroundLines: { stroke: "rgba(0,0,0,0.05)" },
                        }}
                        verticalLabelRotation={30}
                        bezier
                        style={styles.chart}
                    />

                    {/* Single Rectangle Overlay (Foreground) */}
                    <View style={styles.overlayContainer} pointerEvents="none">
                        {renderSingleStressBox()}
                    </View>
                </View>
                <Text style={styles.thresholdIndicator}>
                    Current Depth Limit: <Text style={{color: '#D00000', fontWeight: 'bold'}}>{currentLimit}°C</Text>
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Recommendations</Text>
                {recommendations.map((rec: string, index: number) => (
                    <View key={index} style={styles.listRow}>
                        <Image source={recommendationIcon} style={styles.assetIcon} />
                        <Text style={styles.listText}>{rec}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Alerts & warnings</Text>
                {statusInfo.stress_status !== "Normal" ? (
                    <View style={[styles.listRow, styles.alertActive]}>
                        <Image source={alertIcon} style={styles.alertIconStyle} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.listText, { fontWeight: 'bold', color: '#D00000' }]}>
                                Status: {statusInfo.stress_status}
                            </Text>
                            <Text style={styles.listText}>
                                Attention: Heat stress detected for {selectedDepth} layer ({currentLimit}°C limit). Immediate monitoring advised.
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.listRow}>
                        <Image source={alertIcon} style={[styles.alertIconStyle, { opacity: 0.3 }]} />
                        <Text style={styles.listText}>No alert. Current levels are within the safe range.</Text>
                    </View>
                )}
            </View>

            <View style={{ height: 120 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 10 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
    backLink: { marginTop: 10, paddingVertical: 5 },
    backText: { color: "#517AAD", fontWeight: "bold", fontSize: 16 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#000', marginTop: 10 },
    dateSubTitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    depthBtn: { paddingVertical: 12, borderRadius: 15, backgroundColor: '#DEE7F7', width: '30%', alignItems: 'center' },
    activeDepthBtn: { backgroundColor: '#517AAD' },
    btnText: { color: '#517AAD', fontWeight: '700', fontSize: 16 },
    activeBtnText: { color: '#FFFFFF' },
    graphCard: {
        backgroundColor: '#ffffff', borderRadius: 25, padding: 10, marginBottom: 30, elevation: 4,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, alignItems: 'center',
    },
    graphLabel: { fontSize: 13, color: '#6c6c6c', alignSelf: 'flex-start', marginLeft: 15, marginTop: 15, fontWeight: '600' },
    chartWrapper: { position: 'relative', width: '100%', alignItems: 'center' },
    chart: { marginVertical: 8, borderRadius: 16 },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99,
        top: 10, // Higher top to start above the graph lines
        height: 195, // Increased height to reach down to the x-axis
    },
    singleStressBox: {
        position: 'absolute',
        backgroundColor: 'rgba(215, 0, 0, 0.15)',
        height: '100%',
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: 'rgba(215, 0, 0, 0.3)',
    },
    thresholdIndicator: { fontSize: 12, color: '#888', marginTop: 5 },
    section: { marginBottom: 25, paddingHorizontal: 5 },
    sectionHeader: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 15 },
    listRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 12, backgroundColor: '#F8FAFF', borderRadius: 15 },
    alertActive: { backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FFD1D1' },
    assetIcon: { width: 24, height: 24, resizeMode: 'contain' },
    alertIconStyle: { width: 28, height: 28, resizeMode: 'contain' },
    listText: { flex: 1, fontSize: 14, color: '#4A4A4A', marginLeft: 12, lineHeight: 20 },
});