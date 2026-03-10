import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from '../components/AppText';
import { useAuth } from '../context/AuthContext';

interface TempProps {
    onGoToForecast: () => void;
    onGoToStress: () => void;
    onGoToRecords: () => void;
}

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL_MODEL_TEMP

const PORT_CITY_LAT = 6.9297;
const PORT_CITY_LON = 79.8476;

export default function TemperatureScreen({ onGoToForecast, onGoToStress, onGoToRecords }: TempProps) {
    const { selectedLocation } = useAuth();
    const [apiData, setApiData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const getTimeBlock = () => {
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 6) return "00:00 AM - 06:00 AM";
        if (hour >= 6 && hour < 12) return "06:00 AM - 12:00 PM";
        if (hour >= 12 && hour < 18) return "12:00 PM - 06:00 PM";
        return "06:00 PM - 12:00 AM";
    };

    const getWeatherImage = () => {
        const hour = new Date().getHours();

        if (hour >= 0 && hour < 6) {
            return require("../assets/images/moon-stars.png");
        } else if (hour >= 6 && hour < 12) {
            return require("../assets/images/bright-sun.png");
        } else if (hour >= 12 && hour < 18) {
            return require("../assets/images/sun-cloud.png");
        } else {
            return require("../assets/images/moon-cloud.png");
        }
    };

    const isPortCity =
        !selectedLocation ||
        (Math.abs((selectedLocation as any).center_lat - PORT_CITY_LAT) < 0.08 &&
         Math.abs((selectedLocation as any).center_lon - PORT_CITY_LON) < 0.08);

    useEffect(() => {
        // Skip fetch if location isn't Port City or if the AI service URL isn't configured
        if (!isPortCity || !BASE_URL) { setLoading(false); setApiData(null); return; }
        setLoading(true);
        fetch(`${BASE_URL}/api/dashboard`)
            .then((res) => res.json())
            .then((json) => { setApiData(json); setLoading(false); })
            .catch((err) => { console.error("AI Fetch Error:", err); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPortCity]);

    const mainTemp = (isPortCity && apiData?.header?.main_temp)
        ? `${Math.round(parseFloat(apiData.header.main_temp))}°C`
        : '—°C';
    const readingTime = (isPortCity && apiData?.header?.reading_time) ? apiData.header.reading_time : '—';
    const depthList = isPortCity
        ? (apiData?.window_1 || [])
        : [
            { depth_range: '0 – 2 m',  current_temp: '—' },
            { depth_range: '3 – 6 m',  current_temp: '—' },
            { depth_range: '7 – 10 m', current_temp: '—' },
          ];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A78D0" />
                <Text style={styles.loadingTitle}>Loading Temperature Data</Text>
                <Text style={styles.loadingSubtitle}>Fetching live coral site readings...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
            {/* Weather Header Section */}
            <View style={styles.weatherSection}>
                <View>
                    <Text style={styles.date}>{readingTime}</Text>
                    <Text style={{fontSize: 14, color: '#708090', marginTop: 5}}>Current Air Temp</Text>
                    <Text style={styles.tempBig}>{mainTemp}</Text>

                    <View style={styles.timeBlockBadge}>
                        <MaterialIcons name="access-time" size={16} color="#4A78D0" />
                        <Text style={styles.timeBlockText}>{getTimeBlock()}</Text>
                    </View>
                </View>
                <Image
                    source={getWeatherImage()}
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

                {depthList.map((item: any, index: number) => (
                    <View key={index} style={styles.dataRow}>
                        <Text style={styles.depthText}>{item.depth_range}</Text>
                        <Text style={styles.tempText}>{item.current_temp}</Text>
                    </View>
                ))}
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
    loadingContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
    },
    loadingTitle: {
        marginTop: 16, fontSize: 16, fontWeight: '600', color: '#3b3b3b',
    },
    loadingSubtitle: {
        marginTop: 6, fontSize: 13, color: '#708090',
    },
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
        fontSize: 60,
        fontWeight: '300',
        color: '#3b3b3b',
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
        paddingHorizontal: 30,
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
        paddingLeft: 150,
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
    timeBlockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F0FE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 5,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#D1E3FF'
    },
    timeBlockText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4A78D0',
        marginLeft: 5,
    },
});