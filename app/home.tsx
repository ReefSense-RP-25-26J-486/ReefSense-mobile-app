import React, { useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import BottomTab from "../src/components/BottomTab";
import Header from "../src/components/Header";
import AddRecordScreen from "../src/screens/AddRecordScreen";
import ForecastScreen from "../src/screens/ForecastScreen";
import GrowthDetailsScreen from "../src/screens/GrowthDetailsScreen";
import HomeScreen from "../src/screens/HomeScreen";
import IdentificationResultsScreen from "../src/screens/IdentificationResultsScreen";
import MediaUploadScreen from "../src/screens/MediaUploadScreen";
import RecordsScreen from "../src/screens/RecordsScreen";
import StressScreen from "../src/screens/StressScreen";
import TemperatureScreen from "../src/screens/TemperatureScreen";
import TrackingHistoryScreen from "../src/screens/TrackingHistoryScreen";
// Import other screens as you create them
import BleachingAnalysis from "../src/screens/sahan/BleachingAnalysis";
import BleachingHistory from "../src/screens/sahan/BleachingHistory";
import BleachingHome from "../src/screens/sahan/BleachingHome";

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
    if (activeIndex === 2) {
      switch (currentView) {
        case "IDENTIFICATION_RESULTS":
          return (
            <IdentificationResultsScreen
              onBackToUploads={() => setCurrentView("LIST")}
              onTrackGrowth={() => setCurrentView("GROWTH_DETAILS")}
            />
          );
        case "GROWTH_DETAILS":
          return (
            <GrowthDetailsScreen
              onBackToUploads={() => setCurrentView("LIST")}
              onBack={() => setCurrentView("IDENTIFICATION_RESULTS")}
            />
          );
        case "TRACKING_HISTORY":
          return (
            <TrackingHistoryScreen
              onBackToUploads={() => setCurrentView("LIST")}
              onViewDetails={() => setCurrentView("GROWTH_DETAILS")}
            />
          );
        default:
          return (
            <MediaUploadScreen
              onBrowse={() => setCurrentView("IDENTIFICATION_RESULTS")}
              onHistory={() => setCurrentView("TRACKING_HISTORY")}
            />
          );
      }
    }

    // Tab 3: coral bleaching & its sub-screens
    if (activeIndex === 3) {
      if (currentView === "BLEACHING_ANALYSIS") {
        return <BleachingAnalysis onClose={() => setCurrentView("LIST")} />;
      }
      if (currentView === "BLEACHING_HISTORY") {
        return <BleachingHistory onBack={() => setCurrentView("LIST")} />;
      }
      return (
        <BleachingHome
          onRunAnalysis={() => setCurrentView("BLEACHING_ANALYSIS")}
          onViewHistory={() => setCurrentView("BLEACHING_HISTORY")}
          onBack={() => setActiveIndex(0)}
        />
      );
    }

    return <HomeScreen />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.content}>{renderContent()}</View>
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
