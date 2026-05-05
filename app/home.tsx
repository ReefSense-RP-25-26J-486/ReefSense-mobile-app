import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnalyzedCoral } from "../src/api/growthApi";
import { ImageCoords } from "../src/screens/MediaUploadScreen";
import BottomTab from "../src/components/BottomTab";
import Header from "../src/components/Header";
import { useAuth } from "../src/context/AuthContext";
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
import BleachingAnalysis from "../src/screens/sahan/BleachingAnalysis";
import BleachingHistory from "../src/screens/sahan/BleachingHistory";
import BleachingHome from "../src/screens/sahan/BleachingHome";
import { colors } from "../src/constants/colors";

// Sub-view types per tab
type Tab1View = "LIST" | "FORECAST" | "STRESS" | "RECORDS" | "ADD_RECORD";
type Tab2View = "LIST" | "IDENTIFICATION_RESULTS" | "GROWTH_DETAILS" | "TRACKING_HISTORY" | "TRACKING_DETAIL";
type Tab3View = "LIST" | "BLEACHING_ANALYSIS" | "BLEACHING_HISTORY";

export default function Home() {
  const { userLocations, selectedLocation, setSelectedLocation } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);

  // Track which tabs have been visited so we only mount them lazily.
  // Tab 0 is mounted immediately (it's the default landing tab).
  const [mountedTabs, setMountedTabs] = useState<Set<number>>(new Set([0]));

  // Per-tab sub-view state — preserved when switching tabs
  const [tab1View, setTab1View] = useState<Tab1View>("LIST");
  const [tab2View, setTab2View] = useState<Tab2View>("LIST");
  const [tab3View, setTab3View] = useState<Tab3View>("LIST");

  // Growth tab data
  const [analyzeResults, setAnalyzeResults] = useState<AnalyzedCoral[]>([]);
  const [analyzedImageUri, setAnalyzedImageUri] = useState<string>("");
  const [annotatedImageBase64, setAnnotatedImageBase64] = useState<string | null>(null);
  const [enhancedImageBase64, setEnhancedImageBase64] = useState<string | null>(null);
  const [imageSizeData, setImageSizeData] = useState<[number, number] | undefined>();
  const [selectedCoralId, setSelectedCoralId] = useState<string>("");
  const [savedCoralIds, setSavedCoralIds] = useState<Record<string, string>>({});
  const [imageCoords, setImageCoords] = useState<ImageCoords | null>(null);

  const handleTabPress = (index: number) => {
    // Mark the tab as mounted the first time it is visited
    setMountedTabs((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setActiveIndex(index);
    // Pressing the ALREADY ACTIVE tab resets it to its home view (iOS convention)
    if (index === activeIndex) {
      if (index === 1) setTab1View("LIST");
      if (index === 2) setTab2View("LIST");
      if (index === 3) setTab3View("LIST");
    }
  };

  // ── Tab 1: Temperature ────────────────────────────────────────────────────
  const renderTab1 = () => {
    switch (tab1View) {
      case "FORECAST":
        return <ForecastScreen onBack={() => setTab1View("LIST")} />;
      case "STRESS":
        return <StressScreen onBack={() => setTab1View("LIST")} />;
      case "RECORDS":
        return (
          <RecordsScreen
            onBack={() => setTab1View("LIST")}
            onAdd={() => setTab1View("ADD_RECORD")}
          />
        );
      case "ADD_RECORD":
        return <AddRecordScreen onBack={() => setTab1View("RECORDS")} />;
      default:
        return (
          <TemperatureScreen
            onGoToForecast={() => setTab1View("FORECAST")}
            onGoToStress={() => setTab1View("STRESS")}
            onGoToRecords={() => setTab1View("RECORDS")}
          />
        );
    }
  };

  // ── Tab 2: Coral ID & Growth Monitoring ───────────────────────────────────
  const renderTab2 = () => {
    switch (tab2View) {
      case "IDENTIFICATION_RESULTS":
        return (
          <IdentificationResultsScreen
            corals={analyzeResults}
            imageUri={analyzedImageUri}
            annotatedImage={annotatedImageBase64}
            enhancedImage={enhancedImageBase64}
            imageSize={imageSizeData}
            savedCoralIds={savedCoralIds}
            imageCoords={imageCoords}
            onCoralSaved={(tempId, userCoralId) =>
              setSavedCoralIds((prev) => ({ ...prev, [tempId]: userCoralId }))
            }
            onBackToUploads={() => setTab2View("LIST")}
            onTrackGrowth={(coralId) => {
              setSelectedCoralId(coralId);
              setTab2View("GROWTH_DETAILS");
            }}
          />
        );
      case "GROWTH_DETAILS":
        return (
          <GrowthDetailsScreen
            coralId={selectedCoralId}
            onBackToUploads={() => setTab2View("LIST")}
            onBack={() => setTab2View("IDENTIFICATION_RESULTS")}
          />
        );
      case "TRACKING_HISTORY":
        return (
          <TrackingHistoryScreen
            onBackToUploads={() => setTab2View("LIST")}
            onViewDetails={(coralId) => {
              setSelectedCoralId(coralId);
              setTab2View("TRACKING_DETAIL");
            }}
          />
        );
      case "TRACKING_DETAIL":
        return (
          <GrowthDetailsScreen
            coralId={selectedCoralId}
            onBack={() => setTab2View("TRACKING_HISTORY")}
            onBackToUploads={() => setTab2View("LIST")}
          />
        );
      default:
        return (
          <MediaUploadScreen
            onBrowse={(result, imageUri, coords) => {
              setAnalyzeResults(result.corals);
              setAnalyzedImageUri(imageUri);
              setAnnotatedImageBase64(result.annotatedImage);
              setEnhancedImageBase64(result.enhancedImage);
              setImageSizeData(result.imageSize);
              // Prefer GPS extracted server-side from raw JPEG EXIF (reliable on
              // all platforms). Fall back to client-side coords only if the
              // server returned null (image had no EXIF GPS data).
              const backendCoords =
                result.imageLatitude != null && result.imageLongitude != null
                  ? { latitude: result.imageLatitude, longitude: result.imageLongitude }
                  : null;
              setImageCoords(backendCoords ?? coords);
              setSavedCoralIds({});
              setTab2View("IDENTIFICATION_RESULTS");
            }}
            onHistory={() => setTab2View("TRACKING_HISTORY")}
          />
        );
    }
  };

  // ── Tab 3: Bleaching Analysis ─────────────────────────────────────────────
  const renderTab3 = () => {
    switch (tab3View) {
      case "BLEACHING_ANALYSIS":
        return <BleachingAnalysis onClose={() => setTab3View("LIST")} />;
      case "BLEACHING_HISTORY":
        return <BleachingHistory onBack={() => setTab3View("LIST")} />;
      default:
        return (
          <BleachingHome
            onRunAnalysis={() => setTab3View("BLEACHING_ANALYSIS")}
            onViewHistory={() => setTab3View("BLEACHING_HISTORY")}
            onBack={() => handleTabPress(0)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        locations={userLocations}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        onProfilePress={() => router.push("/profile")}
      />

      {/*
        Keep-alive tab containers.
        - Each tab is mounted lazily (only once the user first visits it).
        - Once mounted it stays in the tree; inactive tabs are hidden with
          display:'none' so their component state (and fetched data) is preserved.
        - Switching tabs never triggers a remount → no extra API calls.
        - Pull-to-refresh inside each screen is the only way to reload data.
      */}

      {/* Tab 0: GIS Nursery Planning */}
      {mountedTabs.has(0) && (
        <View style={[styles.content, activeIndex !== 0 && styles.hidden]}>
          <NurseryPlanningScreen />
        </View>
      )}

      {/* Tab 1: Temperature */}
      {mountedTabs.has(1) && (
        <View style={[styles.content, activeIndex !== 1 && styles.hidden]}>
          {renderTab1()}
        </View>
      )}

      {/* Tab 2: Coral ID & Growth */}
      {mountedTabs.has(2) && (
        <View style={[styles.content, activeIndex !== 2 && styles.hidden]}>
          {renderTab2()}
        </View>
      )}

      {/* Tab 3: Bleaching Analysis */}
      {mountedTabs.has(3) && (
        <View style={[styles.content, activeIndex !== 3 && styles.hidden]}>
          {renderTab3()}
        </View>
      )}

      <BottomTab
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16 },
  /** Hides a tab without unmounting it — preserves component state. */
  hidden: { display: "none" },
});
