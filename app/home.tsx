import React, { useState } from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import Header from "../src/components/Header";
import BottomTab from "../src/components/BottomTab";
import HomeScreen from "../src/screens/HomeScreen";
import TemperatureScreen from "../src/screens/TemperatureScreen";
import ForecastScreen from "../src/screens/ForecastScreen";
import StressScreen from "../src/screens/StressScreen";
import RecordsScreen from "../src/screens/RecordsScreen";
import AddRecordScreen from "../src/screens/AddRecordScreen";
// Import other screens as you create them

import { colors } from "../src/constants/colors";

export default function Home() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [currentView, setCurrentView] = useState("LIST");

    const renderContent = () => {
        // Tab 0: Location & its sub-screens
        if (activeIndex === 0) return <HomeScreen />;


        // Tab 1: Temperature & its sub-screens
        if (activeIndex === 1) {
            switch (currentView) {
                case "FORECAST":
                    return <ForecastScreen onBack={() => setCurrentView("LIST")} />;
                case "STRESS":
                    return <StressScreen onBack={() => setCurrentView("LIST")} />;
                case "RECORDS":
                    return (
                        <RecordsScreen
                            onBack={() => setCurrentView("LIST")}
                            onAdd={() => setCurrentView("ADD_RECORD")}
                        />
                    );
                case "ADD_RECORD":
                    return <AddRecordScreen onBack={() => setCurrentView("RECORDS")} />;
                default:
                    return (
                        <TemperatureScreen
                            onGoToForecast={() => setCurrentView("FORECAST")}
                            onGoToStress={() => setCurrentView("STRESS")}
                            onGoToRecords={() => setCurrentView("RECORDS")}
                        />
                    );
            }
        }


        // Tab 2: coral & its sub-screens


        // Tab 3: coral bleaching & its sub-screens



        return <HomeScreen />;
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header />
            <View style={styles.content}>
                {renderContent()}
            </View>
            <BottomTab
                activeIndex={activeIndex}
                onTabPress={(index: number) => {
                    setActiveIndex(index);
                    setCurrentView("LIST");
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 40 },
    content: { flex: 1, paddingHorizontal: 16 },
});