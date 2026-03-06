import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

// depth keys
type DepthKey = "3m" | "7m" | "10m";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL_MODEL_TEMP

export default function ForecastScreen({ onBack }: { onBack: () => void }) {
    const [apiData, setApiData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDepth, setSelectedDepth] = useState<DepthKey>("3m");

    useEffect(() => {
        fetch(`${BASE_URL}/api/dashboard`)
            .then((res) => res.json())
            .then((json) => {
                setApiData(json);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Forecast Fetch Error:", err);
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

    const getMonthName = (monthIdx: number) => {
        return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIdx];
    };

    const formatFullForecast = () => {
        if (!apiData?.details?.[selectedDepth]) return [];
        const rawValues = apiData.details[selectedDepth].graph_values || [];
        const times = ["00:00", "06:00", "12:00", "18:00"];
        const startDate = getBaseDate();

        return rawValues.map((val: any, index: number) => {
            const dayOffset = Math.floor(index / 4);
            const timeIdx = index % 4;

            const currentDay = new Date(startDate.getTime());
            currentDay.setDate(startDate.getDate() + dayOffset);

            return {
                id: index.toString(),
                dateDisplay: `${currentDay.getDate()} ${getMonthName(currentDay.getMonth())}`,
                time: times[timeIdx],
                temp: val ? parseFloat(val).toFixed(1) : "0.0"
            };
        });
    };

    const getGraphLabels = () => {
        const startDate = getBaseDate();
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startDate.getTime());
            d.setDate(startDate.getDate() + i);
            return `${d.getDate()} ${getMonthName(d.getMonth())}`;
        });
    };

    const getGraphData = () => {
        if (!apiData?.details?.[selectedDepth]) return [0, 0, 0, 0, 0, 0, 0];
        const rawValues = apiData.details[selectedDepth].graph_values || [];

        let dailyMaxes = [];
        for (let i = 0; i < rawValues.length; i += 4) {
            const dayValues = rawValues.slice(i, i + 4).map((v: any) => parseFloat(v));
            const validValues = dayValues.filter(v => !isNaN(v));
            if (validValues.length > 0) {
                dailyMaxes.push(Math.max(...validValues));
            } else {
                dailyMaxes.push(0);
            }
        }
        return dailyMaxes.length >= 7 ? dailyMaxes.slice(0, 7) : dailyMaxes.concat(new Array(7 - dailyMaxes.length).fill(0));
    };

    const getStabilityData = () => {
        const values = apiData?.details?.[selectedDepth]?.graph_values || [];
        if (values.length === 0) return { label: "N/A", color: "#999", desc: "No data" };

        // Calculate the range (Difference between Max and Min)
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min;

        // get thermal variance
        if (range < 0.2) {
            return {
                label: "High Stability",
                color: "#4CAF50",
                desc: `The temperature only varies by ${range.toFixed(2)}°C. This depth is well-buffered against surface weather.`
            };
        } else if (range < 0.5) {
            return {
                label: "Moderate",
                color: "#FFA500",
                desc: `A variance of ${range.toFixed(2)}°C indicates moderate thermal mixing between layers.`
            };
        } else {
            return {
                label: "Low Stability",
                color: "#FF4B4B",
                desc: `High variance (${range.toFixed(2)}°C). This layer is sensitive to external environmental factors.`
            };
        }
    };

    const stability = getStabilityData();

    if (loading || !apiData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#517AAD" />
                <Text style={styles.loadingText}>Fetching 7-Day Predictions...</Text>
            </View>
        );
    }

    const finalGraphData = getGraphData();
    const finalGraphLabels = getGraphLabels();
    const forecastItems = formatFullForecast();

    return (
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>

            <TouchableOpacity onPress={onBack} style={styles.backLink}>
                <Text style={styles.backText}>{"< Return to Overview"}</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle}>Temperature Fluctuation Predictions</Text>

            {/* Depth Selection Buttons */}
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

            {/* Graph Card with Real Dates */}
            <View style={styles.graphCard}>
                <Text style={styles.graphLabel}>Daily Peak Temperature (°C)</Text>
                <View style={styles.chartWrapper}>
                    {finalGraphData.length > 0 ? (
                        <LineChart
                            data={{
                                labels: finalGraphLabels,
                                datasets: [{ data: finalGraphData }]
                            }}
                            width={screenWidth - 65}
                            height={220}
                            fromZero={false}
                            segments={4}
                            chartConfig={chartConfig}
                            verticalLabelRotation={30}
                            bezier
                            style={styles.chart}
                        />
                    ) : (
                        <Text>No data available</Text>
                    )}
                </View>
            </View>

            {/* 6-Hour Detailed Forecast List */}
            <Text style={styles.sectionTitle}>Detailed Forecast Outlook</Text>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={formatFullForecast()}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.timeCard}>
                        <Text style={styles.timeDay}>{item.dateDisplay}</Text>
                        <Text style={styles.timeLabel}>{item.time}</Text>
                        <View style={styles.tempBadge}>
                            <Text style={styles.timeTemp}>{item.temp}°C</Text>
                        </View>
                    </View>
                )}
                contentContainerStyle={styles.timeListContent}
            />

            <Text style={styles.sectionTitle}>Layer Analytics</Text>

            <View style={styles.analyticsRow}>
                {/* Thermal Range */}
                <View style={styles.analyticCard}>
                    <Text style={styles.analyticLabel}>24h Variance</Text>
                    <Text style={styles.analyticValue}>
                        { (Math.max(...apiData.details[selectedDepth].graph_values.slice(0,4)) -
                            Math.min(...apiData.details[selectedDepth].graph_values.slice(0,4))).toFixed(2) }°C
                    </Text>
                    <Text style={styles.analyticSub}>Max - Min fluctuation</Text>
                </View>

                {/* Stability Index */}
                <View style={styles.analyticCard}>
                    <Text style={styles.analyticLabel}>Stability Index</Text>
                    <Text style={[styles.analyticValue, { color: stability.color }]}>
                        {stability.label}
                    </Text>
                    <Text style={styles.analyticSub}>Based on real-time flux</Text>
                </View>
            </View>

            {/* Insight Card */}
            <View style={styles.infoHighlight}>
                <Text style={styles.infoTitle}>Insight</Text>
                <Text style={styles.infoBody}>{stability.desc}</Text>
            </View>

            {/* Bottom Padding for Navbar overlap */}
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}
const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 180, 216, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    propsForDots: { r: "5", strokeWidth: "2", stroke: "#00B4D8" },
    propsForBackgroundLines: { stroke: "rgba(0,0,0,0.05)" },

    // dark blue
    //color: (opacity = 1) => `rgba(81, 122, 173, ${opacity})`,
    //labelColor: (opacity = 1) => `rgba(50, 50, 50, ${opacity})`,
    //propsForDots: { r: "5", strokeWidth: "2", stroke: "#517AAD" },
};

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
        marginBottom: 10,
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
        alignItems: 'center',
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
        alignSelf: 'flex-start',
        marginLeft: 10,
        fontWeight: '600'
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingRight: 10,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginTop: 25,
        marginBottom: 15
    },
    timeListContent: {
        paddingLeft: 5,
        paddingBottom: 10
    },
    timeCard: {
        backgroundColor: '#E8EFFF',
        width: 85,
        height: 110,
        borderRadius: 18,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E8EFFF',
        elevation: 2,
    },
    timeDay: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#517AAD',
        marginBottom: 2
    },
    timeLabel: {
        fontSize: 10,
        color: '#999',
        marginBottom: 8
    },
    tempBadge: {
        backgroundColor: '#f9fbff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10
    },
    timeTemp: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1A1A1A'
    },
    analyticsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    analyticCard: {
        backgroundColor: '#F8FAFF',
        width: '48%',
        padding: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E8EFFF',
    },
    analyticLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
        marginBottom: 5,
    },
    analyticValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    analyticSub: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
    },
    infoHighlight: {
        backgroundColor: '#517AAD',
        padding: 20,
        borderRadius: 25,
        marginBottom: 25,
    },
    infoTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    infoBody: {
        color: '#FFF',
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.9,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 10,
        color: '#517AAD',
        fontWeight: '600',
    },
});