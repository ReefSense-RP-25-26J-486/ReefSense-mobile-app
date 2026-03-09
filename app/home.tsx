import React, { useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { AnalyzedCoral } from "../src/api/growthApi";
import BottomTab from "../src/components/BottomTab";
import Header from "../src/components/Header";
import AddRecordScreen from "../src/screens/AddRecordScreen";
import ForecastScreen from "../src/screens/ForecastScreen";
import GrowthDetailsScreen from "../src/screens/GrowthDetailsScreen";
import IdentificationResultsScreen from "../src/screens/IdentificationResultsScreen";
import MediaUploadScreen from "../src/screens/MediaUploadScreen";
import NurseryPlanningScreen from "../src/screens/NurseryPlanningScreen";
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
  const [analyzeResults, setAnalyzeResults] = useState<AnalyzedCoral[]>([]);
  const [analyzedImageUri, setAnalyzedImageUri] = useState<string>("");
  const [annotatedImageBase64, setAnnotatedImageBase64] = useState<
    string | null
  >(null);
  const [selectedCoralId, setSelectedCoralId] = useState<string>("");
  const [savedCoralIds, setSavedCoralIds] = useState<Record<string, string>>(
    {},
  );

  const renderContent = () => {
    // Tab 0: GIS Nursery Planning
    if (activeIndex === 0) return <NurseryPlanningScreen />;

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

    if (activeIndex === 2) {
      switch (currentView) {
        case "IDENTIFICATION_RESULTS":
          return (
            <IdentificationResultsScreen
              corals={analyzeResults}
              imageUri={analyzedImageUri}
              annotatedImage={annotatedImageBase64}
              savedCoralIds={savedCoralIds}
              onCoralSaved={(tempId, userCoralId) =>
                setSavedCoralIds((prev) => ({ ...prev, [tempId]: userCoralId }))
              }
              onBackToUploads={() => setCurrentView("LIST")}
              onTrackGrowth={(coralId) => {
                setSelectedCoralId(coralId);
                setCurrentView("GROWTH_DETAILS");
              }}
            />
          );
        case "GROWTH_DETAILS":
          return (
            <GrowthDetailsScreen
              coralId={selectedCoralId}
              onBackToUploads={() => setCurrentView("LIST")}
              onBack={() => setCurrentView("IDENTIFICATION_RESULTS")}
            />
          );
        case "TRACKING_HISTORY":
          return (
            <TrackingHistoryScreen
              onBackToUploads={() => setCurrentView("LIST")}
              onViewDetails={(coralId) => {
                setSelectedCoralId(coralId);
                setCurrentView("TRACKING_DETAIL");
              }}
            />
          );
        case "TRACKING_DETAIL":
          return (
            <GrowthDetailsScreen
              coralId={selectedCoralId}
              onBack={() => setCurrentView("TRACKING_HISTORY")}
              onBackToUploads={() => setCurrentView("LIST")}
            />
          );
        default:
          return (
            <MediaUploadScreen
              onBrowse={(result, imageUri) => {
                setAnalyzeResults(result.corals);
                setAnalyzedImageUri(imageUri);
                setAnnotatedImageBase64(result.annotatedImage);
                setSavedCoralIds({});
                setCurrentView("IDENTIFICATION_RESULTS");
              }}
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

    return <NurseryPlanningScreen />;
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
  container: { flex: 1, backgroundColor: colors.background},
  content: { flex: 1, paddingHorizontal: 16 },
});
