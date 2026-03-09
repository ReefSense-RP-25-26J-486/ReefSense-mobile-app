import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import { Circle, Ellipse, Line, Path, Rect, Svg } from "react-native-svg";
import { Text, TextInput } from "../components/AppText";
import { useAuth } from "../context/AuthContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Fixed map height — avoids the MapView flex-expansion bug on iOS/Android
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.44);

// Bottom-sheet constants
const TOP_SAFE = 60;
const PARTIAL_OFFSET = MAP_HEIGHT - TOP_SAFE; // translateY when sheet is "collapsed" (visible top = MAP_HEIGHT)

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const PORT_CITY_REGION = {
  latitude: 6.92,
  longitude: 79.828,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

// Approximate boundary of the Port City coral restoration zone
const RESTORATION_ZONE = [
  { latitude: 6.944, longitude: 79.818 },
  { latitude: 6.944, longitude: 79.854 },
  { latitude: 6.926, longitude: 79.861 },
  { latitude: 6.906, longitude: 79.857 },
  { latitude: 6.903, longitude: 79.82 },
  { latitude: 6.917, longitude: 79.809 },
];

const CORAL_SPECIES = [
  "Acropora",
  "Porites",
  "Montipora",
  "Pocillopora",
  "Stylophora",
];

// Module-level flag — persists across tab navigation (component re-mounts).
// After the first successful marker boot, subsequent mounts skip the 800ms
// delay and immediately use epoch=1 + locked=true so icons never revert.
let _markersBootstrapped = false;

// Icon + display label for each nursery type key
const TYPE_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  table: { label: "Nursery Table", icon: "grid", color: "#517AAD" },
  tree: { label: "Tree Nursery", icon: "leaf", color: "#27975A" },
  drum: { label: "Drum Nursery", icon: "layers", color: "#D97624" },
  reef_ball: { label: "Reef Ball", icon: "planet", color: "#7E35AD" },
};

// Used only in map markers — safe text characters for Android bitmap capture
const TYPE_CHAR: Record<string, string> = {
  table: '━',
  tree: '🌿',
  drum: '◎',
  reef_ball: '●',
};

const renderNurseryIcon = (type: string) => {
  const ch = TYPE_CHAR[type] ?? '🪸';
  return <Text style={{ fontSize: 15 }}>{ch}</Text>;
};

// SVG illustration shown in the SELECT_TYPE card grid
const TypeCardIllustration = ({ type, size }: { type: string; size: number }) => {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  if (type === 'table') {
    // Table nursery: wide horizontal top + 4 legs + coral dots below
    return (
      <Svg width={s} height={s}>
        {/* Table top */}
        <Rect x={s * 0.1} y={cy - 4} width={s * 0.8} height={8} rx={3} fill="#fff" />
        {/* Left leg */}
        <Rect x={s * 0.15} y={cy + 4} width={5} height={s * 0.28} rx={2} fill="#fff" />
        {/* Right leg */}
        <Rect x={s * 0.8} y={cy + 4} width={5} height={s * 0.28} rx={2} fill="#fff" />
        {/* Inner left leg */}
        <Rect x={s * 0.35} y={cy + 4} width={5} height={s * 0.22} rx={2} fill="#fff" />
        {/* Inner right leg */}
        <Rect x={s * 0.6} y={cy + 4} width={5} height={s * 0.22} rx={2} fill="#fff" />
        {/* Coral dots hanging below table */}
        <Circle cx={s * 0.25} cy={cy - 10} r={4} fill="#fff" opacity={0.8} />
        <Circle cx={s * 0.5} cy={cy - 14} r={5} fill="#fff" opacity={0.9} />
        <Circle cx={s * 0.75} cy={cy - 10} r={4} fill="#fff" opacity={0.8} />
        <Circle cx={s * 0.38} cy={cy - 8} r={3} fill="#fff" opacity={0.7} />
        <Circle cx={s * 0.62} cy={cy - 8} r={3} fill="#fff" opacity={0.7} />
      </Svg>
    );
  }

  if (type === 'tree') {
    // Tree nursery: vertical pole + 2 horizontal arms + coral ovals at ends
    return (
      <Svg width={s} height={s}>
        {/* Vertical pole */}
        <Rect x={cx - 3} y={s * 0.18} width={6} height={s * 0.64} rx={3} fill="#fff" />
        {/* Top arm */}
        <Rect x={s * 0.2} y={s * 0.28} width={s * 0.6} height={5} rx={2} fill="#fff" />
        {/* Bottom arm */}
        <Rect x={s * 0.25} y={s * 0.5} width={s * 0.5} height={5} rx={2} fill="#fff" />
        {/* Coral ovals at top arm ends */}
        <Ellipse cx={s * 0.2} cy={s * 0.3} rx={6} ry={8} fill="#fff" opacity={0.85} />
        <Ellipse cx={s * 0.8} cy={s * 0.3} rx={6} ry={8} fill="#fff" opacity={0.85} />
        {/* Coral ovals at bottom arm ends */}
        <Ellipse cx={s * 0.25} cy={s * 0.52} rx={5} ry={7} fill="#fff" opacity={0.75} />
        <Ellipse cx={s * 0.75} cy={s * 0.52} rx={5} ry={7} fill="#fff" opacity={0.75} />
      </Svg>
    );
  }

  if (type === 'drum') {
    // Drum nursery: rounded rectangle body + 3 horizontal band lines
    return (
      <Svg width={s} height={s}>
        {/* Drum body */}
        <Rect x={s * 0.2} y={s * 0.15} width={s * 0.6} height={s * 0.7} rx={10} fill="#fff" opacity={0.25} />
        <Rect x={s * 0.2} y={s * 0.15} width={s * 0.6} height={s * 0.7} rx={10} stroke="#fff" strokeWidth={3} fill="transparent" />
        {/* Band 1 */}
        <Line x1={s * 0.2} y1={s * 0.35} x2={s * 0.8} y2={s * 0.35} stroke="#fff" strokeWidth={3} />
        {/* Band 2 */}
        <Line x1={s * 0.2} y1={s * 0.52} x2={s * 0.8} y2={s * 0.52} stroke="#fff" strokeWidth={3} />
        {/* Band 3 */}
        <Line x1={s * 0.2} y1={s * 0.68} x2={s * 0.8} y2={s * 0.68} stroke="#fff" strokeWidth={3} />
      </Svg>
    );
  }

  if (type === 'reef_ball') {
    // Reef ball: dome half-circle + flat base + 3 holes
    const domeR = s * 0.34;
    const basY = cy + 4;
    return (
      <Svg width={s} height={s}>
        {/* Dome using path */}
        <Path
          d={`M ${cx - domeR} ${basY} A ${domeR} ${domeR} 0 0 1 ${cx + domeR} ${basY} Z`}
          fill="#fff"
          opacity={0.25}
        />
        <Path
          d={`M ${cx - domeR} ${basY} A ${domeR} ${domeR} 0 0 1 ${cx + domeR} ${basY}`}
          stroke="#fff"
          strokeWidth={3}
          fill="transparent"
        />
        {/* Flat base */}
        <Rect x={cx - domeR} y={basY} width={domeR * 2} height={6} rx={2} fill="#fff" opacity={0.6} />
        {/* Hole left */}
        <Circle cx={cx - domeR * 0.45} cy={basY - domeR * 0.42} r={5} fill="#fff" opacity={0.9} />
        {/* Hole center */}
        <Circle cx={cx} cy={basY - domeR * 0.65} r={5} fill="#fff" opacity={0.9} />
        {/* Hole right */}
        <Circle cx={cx + domeR * 0.45} cy={basY - domeR * 0.42} r={5} fill="#fff" opacity={0.9} />
      </Svg>
    );
  }

  // Fallback
  return (
    <Svg width={s} height={s}>
      <Circle cx={cx} cy={cy} r={s * 0.35} fill="#fff" opacity={0.6} />
    </Svg>
  );
};

type ScreenView =
  | "MAIN"
  | "SELECT_TYPE"
  | "ENTER_DIMENSIONS"
  | "SUGGESTED_LOCATIONS"
  | "LOCATION_DETAIL"
  | "ADD_STEP1"
  | "ADD_STEP2"
  | "VIEW_NURSERY"
  | "EDIT_NURSERY";

interface Nursery {
  id: number;
  name: string | null;
  type: string;
  area_m2: number;
  width_m: number | null;
  length_m: number | null;
  radius_m: number | null;
  height_m: number | null;
  coral_species: string | null;
  date_placement: string | null;
  depth_m: number | null;
  notes: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

interface CandidatePoint {
  id: number;
  latitude: number;
  longitude: number;
  suitability_score: number;
  is_available: boolean;
}

interface SuggestedLocation {
  id: number;
  fid: number;
  latitude: number;
  longitude: number;
  suitability_score: number;
  space_area_m2: number;
}

interface NurseryTypeInfo {
  shape: "rectangle" | "circle";
  required_fields: string[];
  optional_fields: string[];
  description: string;
}

export default function NurseryPlanningScreen() {
  const { token, selectedLocation: authLocation } = useAuth();
  const mapRef = useRef<MapView>(null);

  // ── Bottom-sheet animation ────────────────────────────────────────────────────
  const sheetAnim = useRef(new Animated.Value(PARTIAL_OFFSET)).current;
  const sheetOffset = useRef(PARTIAL_OFFSET); // current resting offset (0 = expanded, PARTIAL_OFFSET = collapsed)

  const snapSheet = (toValue: number) => {
    sheetOffset.current = toValue;
    Animated.spring(sheetAnim, {
      toValue,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) => Math.abs(gs.dy) > 8,
      onPanResponderGrant: () => {
        // Stop any in-flight animation and read the current animated value
        sheetAnim.stopAnimation((val) => {
          sheetOffset.current = val;
          sheetAnim.setValue(val);
        });
      },
      onPanResponderMove: (_e, gs) => {
        const next = Math.max(0, Math.min(PARTIAL_OFFSET, sheetOffset.current + gs.dy));
        sheetAnim.setValue(next);
      },
      onPanResponderRelease: (_e, gs) => {
        if (gs.dy < -60 || gs.vy < -0.4) {
          snapSheet(0);
        } else if (gs.dy > 60 || gs.vy > 0.4) {
          snapSheet(PARTIAL_OFFSET);
        } else {
          snapSheet(sheetOffset.current);
        }
      },
    }),
  ).current;

  const [view, setView] = useState<ScreenView>("MAIN");
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [availablePoints, setAvailablePoints] = useState<CandidatePoint[]>([]);
  const [unavailablePoints, setUnavailablePoints] = useState<CandidatePoint[]>(
    [],
  );
  const [suggestedLocations, setSuggestedLocations] = useState<
    SuggestedLocation[]
  >([]);
  const [selectedLocation, setSelectedLocation] =
    useState<SuggestedLocation | null>(null);
  const [selectedNursery, setSelectedNursery] = useState<Nursery | null>(null);
  const [nurseryTypes, setNurseryTypes] = useState<
    Record<string, NurseryTypeInfo>
  >({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [restorationZone, setRestorationZone] = useState<{
    coordinates: { latitude: number; longitude: number }[];
    area_m2: number;
  } | null>(null);
  // Two-phase marker fix:
  // 1) markerEpoch key-flip forces a fresh bitmap capture after fonts are loaded
  // 2) markersLocked freezes tracksViewChanges=false for performance
  // If already bootstrapped (returned from another tab), skip straight to ready state.
  const [markerEpoch, setMarkerEpoch] = useState(_markersBootstrapped ? 1 : 0);
  const [markersLocked, setMarkersLocked] = useState(_markersBootstrapped);

  // Add-nursery form
  const [selectedType, setSelectedType] = useState<string>("table");
  const [heightCm, setHeightCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [coralSpecies, setCoralSpecies] = useState("Acropora");
  const [nurseryName, setNurseryName] = useState("");
  const [datePlacement] = useState(new Date().toISOString().split("T")[0]);
  const [depthM, setDepthM] = useState("");
  const [notes, setNotes] = useState("");
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [heightUnit, setHeightUnit] = useState<"cm" | "m">("cm");
  const [widthUnit, setWidthUnit] = useState<"cm" | "m">("cm");

  // Edit-nursery form
  const [editHeight, setEditHeight] = useState("");
  const [editWidth, setEditWidth] = useState("");
  const [editCoralSpecies, setEditCoralSpecies] = useState("Acropora");
  const [editNotes, setEditNotes] = useState("");
  const [editDepth, setEditDepth] = useState("");
  const [showEditSpeciesPicker, setShowEditSpeciesPicker] = useState(false);
  const [editHeightUnit, setEditHeightUnit] = useState<"cm" | "m">("cm");
  const [editWidthUnit, setEditWidthUnit] = useState<"cm" | "m">("cm");

  // ── Data fetching ────────────────────────────────────────────────────────────

  const gisHeaders = (): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    'X-Location-ID': String(authLocation?.id ?? ''),
  });

  const fetchAll = useCallback(async () => {
    try {
      const hdrs = gisHeaders();
      const [nursRes, avRes, unavRes, typesRes, zoneRes] = await Promise.all([
        fetch(`${BASE_URL}/api/gis/nurseries`, { headers: hdrs }),
        fetch(`${BASE_URL}/api/gis/candidate-points?available=true&limit=120`, { headers: hdrs }),
        fetch(`${BASE_URL}/api/gis/candidate-points?available=false&limit=80`, { headers: hdrs }),
        fetch(`${BASE_URL}/api/gis/nursery-types`, { headers: hdrs }),
        fetch(`${BASE_URL}/api/gis/restoration-zone`, { headers: hdrs }),
      ]);
      if (nursRes.ok) {
        const d = await nursRes.json();
        setNurseries(d.nurseries ?? []);
      }
      if (avRes.ok) {
        const d = await avRes.json();
        setAvailablePoints(d.points ?? []);
      }
      if (unavRes.ok) {
        const d = await unavRes.json();
        setUnavailablePoints(d.points ?? []);
      }
      if (typesRes.ok) {
        const d = await typesRes.json();
        setNurseryTypes(d.nursery_types ?? {});
      }
      if (zoneRes.ok) {
        const d = await zoneRes.json();
        if (d.coordinates && d.area_m2 != null) {
          setRestorationZone({ coordinates: d.coordinates, area_m2: d.area_m2 });
        }
      }
    } catch (e) {
      console.warn("GIS fetch error:", e);
    } finally {
      setInitialLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLocation]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Phase 1 (800ms): bump markerEpoch → marker keys change → React Native Maps
  //   destroys old markers and creates new ones, taking a fresh bitmap now that
  //   icon fonts are definitely loaded.
  // Phase 2 (950ms): lock tracksViewChanges=false so markers stop re-rendering.
  // Skipped entirely on subsequent mounts thanks to _markersBootstrapped.
  useEffect(() => {
    if (_markersBootstrapped) return;
    const t1 = setTimeout(() => setMarkerEpoch((e) => e + 1), 800);
    const t2 = setTimeout(() => {
      setMarkersLocked(true);
      _markersBootstrapped = true;
    }, 950);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Collapse sheet whenever the active view changes
  useEffect(() => {
    snapSheet(PARTIAL_OFFSET);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Pan map to the currently selected auth location
  useEffect(() => {
    if (!authLocation) return;
    mapRef.current?.animateToRegion(
      {
        latitude: (authLocation as any).center_lat,
        longitude: (authLocation as any).center_lon,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      600,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(authLocation as any)?.id]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const resetToMain = () => {
    setView("MAIN");
    setSuggestedLocations([]);
    setSelectedLocation(null);
    setSelectedNursery(null);
    mapRef.current?.animateToRegion(PORT_CITY_REGION, 400);
  };

  const resetAddForm = () => {
    setHeightCm("");
    setWidthCm("");
    setCoralSpecies("Acropora");
    setNurseryName("");
    setDepthM("");
    setNotes("");
    setHeightUnit("cm");
    setWidthUnit("cm");
  };

  const isCircleType = (type: string) => nurseryTypes[type]?.shape === "circle";

  // Converts a user-entered value to metres based on the selected unit
  const toMeters = (val: string, unit: "cm" | "m"): number =>
    unit === "cm" ? parseFloat(val) / 100 : parseFloat(val);

  const getNurseryDisplayName = (n: Nursery) =>
    n.name ??
    (n.type === "reef_ball" ? `Reef Ball #${n.id}` : `Nursery #${n.id}`);

  const getWidthDisplay = (n: Nursery): string => {
    if (n.type === "table")
      return n.width_m != null ? `${Math.round(n.width_m * 100)} CM` : "--";
    return n.radius_m != null ? `${Math.round(n.radius_m * 200)} CM` : "--";
  };

  const formatDate = (raw: string | null | undefined): string => {
    if (!raw) return "--";
    // Plain ISO date "YYYY-MM-DD" — append noon local time so the day never
    // shifts due to UTC-midnight ambiguity across different device timezones.
    const str = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
    const d = new Date(str);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleDateString("en-GB");
  };

  const typeLabel = (key: string) =>
    TYPE_META[key]?.label ?? key.replace("_", " ");

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleFindLocations = async () => {
    if (!heightCm.trim() || !widthCm.trim()) {
      Alert.alert("Missing Dimensions", "Please enter both values.");
      return;
    }
    setLoading(true);
    try {
      const widthM = toMeters(widthCm, widthUnit);
      const heightM = toMeters(heightCm, heightUnit);
      const body: Record<string, unknown> = {
        nursery_type: selectedType,
        height_m: heightM,
        limit: 8,
      };
      if (!isCircleType(selectedType)) {
        body.width_m = widthM;
        body.length_m = widthM;
      } else {
        body.radius_m = widthM / 2;
      }

      const res = await fetch(`${BASE_URL}/api/gis/top-locations-by-nursery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gisHeaders() },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const pts: SuggestedLocation[] = data.points ?? [];
        setSuggestedLocations(pts);
        setView("SUGGESTED_LOCATIONS");
        if (pts.length > 0) {
          mapRef.current?.animateToRegion(
            {
              latitude: pts[0].latitude,
              longitude: pts[0].longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            },
            500,
          );
        }
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to get locations.");
      }
    } catch {
      Alert.alert("Network Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteNursery = async () => {
    if (!selectedLocation) return;
    if (!depthM.trim()) {
      Alert.alert("Missing Info", "Please enter the depth.");
      return;
    }
    setLoading(true);
    try {
      const widthM = toMeters(widthCm, widthUnit);
      const heightM = toMeters(heightCm, heightUnit);
      const body: Record<string, unknown> = {
        type: selectedType,
        longitude: selectedLocation.longitude,
        latitude: selectedLocation.latitude,
        height_m: heightM,
        name: nurseryName.trim() || `Nursery #${nurseries.length + 1}`,
        coral_species: coralSpecies,
        date_placement: datePlacement,
        depth_m: parseFloat(depthM),
        notes: notes.trim() || null,
      };
      if (!isCircleType(selectedType)) {
        body.width_m = widthM;
        body.length_m = widthM;
      } else {
        body.radius_m = widthM / 2;
      }

      const res = await fetch(`${BASE_URL}/api/gis/nurseries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gisHeaders() },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetAddForm();
        await fetchAll();
        resetToMain();
        Alert.alert("Success", "Nursery added successfully!");
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to add nursery.");
      }
    } catch {
      Alert.alert("Network Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedNursery) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        coral_species: editCoralSpecies,
        notes: editNotes.trim() || null,
        depth_m: editDepth ? parseFloat(editDepth) : null,
        height_m: editHeight ? toMeters(editHeight, editHeightUnit) : null,
      };
      if (!isCircleType(selectedNursery.type) && editWidth) {
        const wm = toMeters(editWidth, editWidthUnit);
        body.width_m = wm;
        body.length_m = wm;
      } else if (editWidth) {
        body.radius_m = toMeters(editWidth, editWidthUnit) / 2;
      }
      const res = await fetch(
        `${BASE_URL}/api/gis/nurseries/${selectedNursery.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...gisHeaders() },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        await fetchAll();
        resetToMain();
        Alert.alert("Updated", "Nursery updated.");
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to update.");
      }
    } catch {
      Alert.alert("Network Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const openNurseryView = (n: Nursery) => {
    setSelectedNursery(n);
    setView("VIEW_NURSERY");
  };

  const openNurseryEdit = () => {
    if (!selectedNursery) return;
    setEditHeight(
      selectedNursery.height_m
        ? String(Math.round(selectedNursery.height_m * 100))
        : "",
    );
    setEditWidth(
      !isCircleType(selectedNursery.type)
        ? selectedNursery.width_m
          ? String(Math.round(selectedNursery.width_m * 100))
          : ""
        : selectedNursery.radius_m
          ? String(Math.round(selectedNursery.radius_m * 200))
          : "",
    );
    setEditCoralSpecies(selectedNursery.coral_species ?? "Acropora");
    setEditNotes(selectedNursery.notes ?? "");
    setEditDepth(
      selectedNursery.depth_m != null ? String(selectedNursery.depth_m) : "",
    );
    setEditHeightUnit("cm");
    setEditWidthUnit("cm");
    setView("EDIT_NURSERY");
  };

  // ── MAP ───────────────────────────────────────────────────────────────────────

  const renderMap = () => (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType="standard"
        initialRegion={PORT_CITY_REGION}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled={false}
      >
        {/* Restoration zone highlight — uses live coordinates fetched from backend,
            falls back to the hardcoded approximate polygon while loading */}
        <Polygon
          coordinates={restorationZone?.coordinates ?? RESTORATION_ZONE}
          fillColor="rgba(92, 198, 184, 0.18)"
          strokeColor="rgba(52, 168, 154, 0.55)"
          strokeWidth={2}
        />

        {/* Existing nurseries — icon + name label, type-specific icon */}
        {nurseries.map((n) => {
          const meta = TYPE_META[n.type];
          const label = getNurseryDisplayName(n);
          return (
            <Marker
              key={`nurs-${n.id}-${markerEpoch}`}
              coordinate={{ latitude: n.latitude, longitude: n.longitude }}
              onPress={() => {
                if (view === "MAIN") openNurseryView(n);
              }}
              tracksViewChanges={!markersLocked}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View collapsable={false} style={styles.nurseryMarker}>
                {/* Label */}
                <View style={styles.nurseryLabel}>
                  <Text style={styles.nurseryLabelText} numberOfLines={1}>
                    {label}
                  </Text>
                </View>

                {/* Coral nursery icon */}
                <View style={styles.nurseryIconWrap}>
                  {renderNurseryIcon(n.type)}
                </View>

                {/* Pin pointer */}
                <View style={styles.nurseryPinTip} />
              </View>
            </Marker>
          );
        })}

        {/* Suggested location pins */}
        {(view === "SUGGESTED_LOCATIONS" || view === "LOCATION_DETAIL") &&
          suggestedLocations.map((loc, idx) => {
            const isActive = selectedLocation?.id === loc.id;
            return (
              <Marker
                key={`sug-${loc.id}`}
                coordinate={{
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                }}
                onPress={() => {
                  setSelectedLocation(loc);
                  setView("LOCATION_DETAIL");
                }}
                tracksViewChanges={false}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View collapsable={false} style={styles.locationMarker}>
                  {/* Location label */}
                  <View style={styles.locationLabel}>
                    <Text style={styles.locationLabelText}>
                      Location {idx + 1}
                    </Text>
                  </View>

                  {/* Location icon */}
                  <View
                    style={[
                      styles.locationIconWrap,
                      isActive && styles.locationIconActive,
                    ]}
                  >
                    <Text style={styles.locationIcon}>📍</Text>
                  </View>

                  {/* Pointer */}
                  <View
                    style={[
                      styles.locationPinTip,
                      isActive && styles.locationPinTipActive,
                    ]}
                  />
                </View>
              </Marker>
            );
          })}
      </MapView>
    </View>
  );

  // ── PANEL VIEWS ───────────────────────────────────────────────────────────────

  const renderMainPanel = () => (
    <View style={styles.panel}>
      <View style={styles.summaryTitleRow}>
        <Text style={styles.summaryTitle}>Total Nurseries</Text>
        <Text style={styles.summaryCount}>{nurseries.length}</Text>
      </View>
      <View style={styles.divider} />
      {Object.keys(TYPE_META).map((key) => (
        <View style={styles.summarySubRow} key={key}>
          <Text style={styles.summarySubLabel}>{TYPE_META[key].label}</Text>
          <Text style={styles.summarySubCount}>
            {nurseries.filter((n) => n.type === key).length}
          </Text>
        </View>
      ))}
      {restorationZone != null && (
        <>
          <View style={styles.divider} />
          <View style={styles.summarySubRow}>
            <Text style={styles.summarySubLabel}>Restoration Zone</Text>
            <Text style={styles.summarySubCount}>
              {Math.round(restorationZone.area_m2).toLocaleString()} m²
            </Text>
          </View>
        </>
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setView("SELECT_TYPE")}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderSelectTypePanel = () => {
    // All types from backend, fall back to defaults if not yet loaded
    const typeKeys =
      Object.keys(nurseryTypes).length > 0
        ? Object.keys(nurseryTypes)
        : ["table", "tree", "drum", "reef_ball"];

    return (
      <View style={styles.fullScreen}>
        <ScrollView
          contentContainerStyle={styles.fullScreenContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.panelTitle}>Select Structure Type</Text>
          <View style={styles.typeGrid}>
            {typeKeys.map((key) => {
              const meta = TYPE_META[key] ?? {
                label: typeLabel(key),
                icon: "help-circle",
                iconFamily: "Ionicons",
                color: PRIMARY,
              };
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.typeCard}
                  onPress={() => {
                    setSelectedType(key);
                    setView("ENTER_DIMENSIONS");
                  }}
                >
                  <View
                    style={[
                      styles.typeCardIconWrap,
                      { backgroundColor: meta.color },
                    ]}
                  >
                    <TypeCardIllustration type={key} size={48} />
                  </View>
                  <Text style={styles.typeCardLabel}>{meta.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => setView("MAIN")}
          >
            <Text style={styles.backLinkText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderEnterDimensionsPanel = () => {
    const circle = isCircleType(selectedType);
    const dimLabel = circle ? "Radius" : "Width";
    return (
      <KeyboardAvoidingView
        style={styles.panel}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.panelTitle}>Enter Structure Dimensions</Text>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Height</Text>
            <TextInput
              style={styles.formInput}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#bbb"
              returnKeyType="next"
            />
            <TouchableOpacity
              style={[
                styles.unitTag,
                heightUnit === "m" && styles.unitTagActive,
              ]}
              onPress={() => setHeightUnit((u) => (u === "cm" ? "m" : "cm"))}
            >
              <Text
                style={[
                  styles.unitTagText,
                  heightUnit === "m" && styles.unitTagTextActive,
                ]}
              >
                {heightUnit.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>{dimLabel}</Text>
            <TextInput
              style={styles.formInput}
              value={widthCm}
              onChangeText={setWidthCm}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#bbb"
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[
                styles.unitTag,
                widthUnit === "m" && styles.unitTagActive,
              ]}
              onPress={() => setWidthUnit((u) => (u === "cm" ? "m" : "cm"))}
            >
              <Text
                style={[
                  styles.unitTagText,
                  widthUnit === "m" && styles.unitTagTextActive,
                ]}
              >
                {widthUnit.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Coral{"\n"}Species</Text>
            <TouchableOpacity
              style={[styles.formInput, styles.dropdownInput]}
              onPress={() => setShowSpeciesPicker(true)}
            >
              <Text style={styles.dropdownInputText}>{coralSpecies}</Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color="#555"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { marginTop: 8 },
              loading && styles.primaryBtnDisabled,
            ]}
            onPress={handleFindLocations}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Find Locations</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => setView("SELECT_TYPE")}
          >
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderSuggestedLocationsPanel = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Suggested Locations</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {suggestedLocations.map((loc, idx) => (
          <TouchableOpacity
            key={loc.id}
            style={styles.locationListItem}
            onPress={() => {
              setSelectedLocation(loc);
              setView("LOCATION_DETAIL");
            }}
          >
            <Text style={styles.locationListItemText}>Location {idx + 1}</Text>
            <MaterialIcons name="chevron-right" size={22} color="#517AAD" />
          </TouchableOpacity>
        ))}
        {suggestedLocations.length === 0 && (
          <Text style={styles.emptyText}>
            No locations found. Try adjusting dimensions.
          </Text>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setView("SELECT_TYPE")}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.backLink}
        onPress={() => setView("ENTER_DIMENSIONS")}
      >
        <Text style={styles.backLinkText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  // ── LOCATION_DETAIL — full-screen height (same as ADD_STEP1 / VIEW_NURSERY) ──

  const renderLocationDetailPanel = () => {
    const idx = suggestedLocations.findIndex(
      (l) => l.id === selectedLocation?.id,
    );
    return (
      <ScrollView
        style={styles.fullScreen}
        contentContainerStyle={styles.fullScreenContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.panelTitle}>Location {idx + 1}</Text>
        <View style={styles.coordRow}>
          <Text style={styles.coordLabel}>Latitude</Text>
          <View style={styles.coordValueBox}>
            <Text style={styles.coordValue}>
              {selectedLocation?.latitude?.toFixed(12)}
            </Text>
          </View>
        </View>
        <View style={styles.coordRow}>
          <Text style={styles.coordLabel}>Longitude</Text>
          <View style={styles.coordValueBox}>
            <Text style={styles.coordValue}>
              {selectedLocation?.longitude?.toFixed(12)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 16 }]}
          onPress={() => setView("ADD_STEP1")}
        >
          <Text style={styles.primaryBtnText}>Add a Nursery Here</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => setView("SUGGESTED_LOCATIONS")}
        >
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ── FULL-SCREEN FORM VIEWS ────────────────────────────────────────────────────

  const renderAddStep1 = () => (
    <KeyboardAvoidingView
      style={styles.fullScreen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.fullScreenContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.panelTitle}>Nursery Information</Text>

        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Name</Text>
          <TextInput
            style={styles.fullInput}
            value={nurseryName}
            onChangeText={setNurseryName}
            placeholder={`Nursery #${nurseries.length + 1}`}
            placeholderTextColor="#bbb"
          />
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Height</Text>
          <TextInput
            style={styles.fullInputShort}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#bbb"
          />
          <TouchableOpacity
            style={[styles.unitTag, heightUnit === "m" && styles.unitTagActive]}
            onPress={() => setHeightUnit((u) => (u === "cm" ? "m" : "cm"))}
          >
            <Text
              style={[
                styles.unitTagText,
                heightUnit === "m" && styles.unitTagTextActive,
              ]}
            >
              {heightUnit.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>
            {isCircleType(selectedType) ? "Radius" : "Width"}
          </Text>
          <TextInput
            style={styles.fullInputShort}
            value={widthCm}
            onChangeText={setWidthCm}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#bbb"
          />
          <TouchableOpacity
            style={[styles.unitTag, widthUnit === "m" && styles.unitTagActive]}
            onPress={() => setWidthUnit((u) => (u === "cm" ? "m" : "cm"))}
          >
            <Text
              style={[
                styles.unitTagText,
                widthUnit === "m" && styles.unitTagTextActive,
              ]}
            >
              {widthUnit.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Coral{"\n"}Species</Text>
          <TouchableOpacity
            style={[styles.fullInput, styles.dropdownInput]}
            onPress={() => setShowSpeciesPicker(true)}
          >
            <Text style={styles.dropdownInputText}>{coralSpecies}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#555" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 24 }]}
          onPress={() => setView("ADD_STEP2")}
        >
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => setView("LOCATION_DETAIL")}
        >
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderAddStep2 = () => (
    <KeyboardAvoidingView
      style={styles.fullScreen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.fullScreenContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.panelTitle}>Nursery Information</Text>

        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Date of{"\n"}Placement</Text>
          <View style={[styles.fullInput, styles.readonlyBox]}>
            <Text style={styles.readonlyText}>{datePlacement}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#555" />
          </View>
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Depth</Text>
          <TextInput
            style={styles.fullInputShort}
            value={depthM}
            onChangeText={setDepthM}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#bbb"
          />
          <View style={styles.unitTag}>
            <Text style={styles.unitTagText}>M</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="#666" />
          </View>
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Notes</Text>
          <TextInput
            style={[styles.fullInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes..."
            placeholderTextColor="#bbb"
            multiline
          />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { marginTop: 24 },
            loading && styles.primaryBtnDisabled,
          ]}
          onPress={handleCompleteNursery}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Complete</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => setView("ADD_STEP1")}
        >
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const viewRow = (label: string, value: string) => (
    <View style={styles.fullRow} key={label}>
      <Text style={styles.fullLabel}>{label}</Text>
      <View style={[styles.fullInput, styles.readonlyBox]}>
        <Text style={styles.readonlyText} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );

  const renderViewNursery = () => {
    if (!selectedNursery) return null;
    return (
      <ScrollView
        style={styles.fullScreen}
        contentContainerStyle={styles.fullScreenContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.panelTitle}>
          {getNurseryDisplayName(selectedNursery)}
        </Text>
        {viewRow(
          "Height",
          selectedNursery.height_m != null
            ? `${Math.round(selectedNursery.height_m * 100)} CM`
            : "--",
        )}
        {viewRow(
          isCircleType(selectedNursery.type) ? "Radius" : "Width",
          getWidthDisplay(selectedNursery),
        )}
        {viewRow("Coral\nSpecies", selectedNursery.coral_species ?? "--")}
        {viewRow(
          "Date of\nPlacement",
          formatDate(selectedNursery.date_placement),
        )}
        {viewRow(
          "Depth",
          selectedNursery.depth_m != null
            ? `${selectedNursery.depth_m} M`
            : "--",
        )}
        {viewRow("Notes", selectedNursery.notes ?? "--")}
        {viewRow("Latitude", selectedNursery.latitude?.toFixed(12) ?? "--")}
        {viewRow("Longitude", selectedNursery.longitude?.toFixed(12) ?? "--")}
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 24 }]}
          onPress={openNurseryEdit}
        >
          <Text style={styles.primaryBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={resetToMain}>
          <Text style={styles.backLinkText}>← Back to Map</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderEditNursery = () => {
    if (!selectedNursery) return null;
    const circle = isCircleType(selectedNursery.type);
    return (
      <KeyboardAvoidingView
        style={styles.fullScreen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.fullScreenContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.panelTitle}>
            {getNurseryDisplayName(selectedNursery)}
          </Text>
          {viewRow("Name", getNurseryDisplayName(selectedNursery))}
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Height</Text>
            <TextInput
              style={styles.fullInputShort}
              value={editHeight}
              onChangeText={setEditHeight}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#bbb"
            />
            <TouchableOpacity
              style={[
                styles.unitTag,
                editHeightUnit === "m" && styles.unitTagActive,
              ]}
              onPress={() =>
                setEditHeightUnit((u) => (u === "cm" ? "m" : "cm"))
              }
            >
              <Text
                style={[
                  styles.unitTagText,
                  editHeightUnit === "m" && styles.unitTagTextActive,
                ]}
              >
                {editHeightUnit.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>{circle ? "Radius" : "Width"}</Text>
            <TextInput
              style={styles.fullInputShort}
              value={editWidth}
              onChangeText={setEditWidth}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#bbb"
            />
            <TouchableOpacity
              style={[
                styles.unitTag,
                editWidthUnit === "m" && styles.unitTagActive,
              ]}
              onPress={() => setEditWidthUnit((u) => (u === "cm" ? "m" : "cm"))}
            >
              <Text
                style={[
                  styles.unitTagText,
                  editWidthUnit === "m" && styles.unitTagTextActive,
                ]}
              >
                {editWidthUnit.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Coral{"\n"}Species</Text>
            <TouchableOpacity
              style={[styles.fullInput, styles.dropdownInput]}
              onPress={() => setShowEditSpeciesPicker(true)}
            >
              <Text style={styles.dropdownInputText}>{editCoralSpecies}</Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color="#555"
              />
            </TouchableOpacity>
          </View>
          {viewRow(
            "Date of\nPlacement",
            formatDate(selectedNursery.date_placement),
          )}
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Depth</Text>
            <TextInput
              style={styles.fullInputShort}
              value={editDepth}
              onChangeText={setEditDepth}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#bbb"
            />
            <View style={styles.unitTag}>
              <Text style={styles.unitTagText}>M</Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={16}
                color="#666"
              />
            </View>
          </View>
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Notes</Text>
            <TextInput
              style={[styles.fullInput, styles.notesInput]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Add notes..."
              placeholderTextColor="#bbb"
              multiline
            />
          </View>
          {viewRow("Latitude", selectedNursery.latitude?.toFixed(12) ?? "--")}
          {viewRow("Longitude", selectedNursery.longitude?.toFixed(12) ?? "--")}
          <View style={styles.editBtnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setView("VIEW_NURSERY")}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                styles.saveBtn,
                loading && styles.primaryBtnDisabled,
              ]}
              onPress={handleSaveEdit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  // ── SPECIES PICKER MODAL ──────────────────────────────────────────────────────

  const renderSpeciesModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditSpeciesPicker : showSpeciesPicker}
      transparent
      animationType="slide"
      onRequestClose={() =>
        isEdit ? setShowEditSpeciesPicker(false) : setShowSpeciesPicker(false)
      }
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Select Coral Species</Text>
          {CORAL_SPECIES.map((sp) => (
            <TouchableOpacity
              key={sp}
              style={styles.modalOption}
              onPress={() => {
                if (isEdit) {
                  setEditCoralSpecies(sp);
                  setShowEditSpeciesPicker(false);
                } else {
                  setCoralSpecies(sp);
                  setShowSpeciesPicker(false);
                }
              }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  (isEdit ? editCoralSpecies : coralSpecies) === sp &&
                    styles.modalOptionSelected,
                ]}
              >
                {sp}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.modalCancel}
            onPress={() =>
              isEdit
                ? setShowEditSpeciesPicker(false)
                : setShowSpeciesPicker(false)
            }
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────────

  // LOCATION_DETAIL now uses full-screen height (same as the + button views)
  const needsMap = ![
    "SELECT_TYPE",
    "LOCATION_DETAIL",
    "ADD_STEP1",
    "ADD_STEP2",
    "VIEW_NURSERY",
    "EDIT_NURSERY",
  ].includes(view);

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#517AAD" />
        <Text style={styles.loadingTitle}>Loading Map Data</Text>
        <Text style={styles.loadingSubtitle}>
          Fetching nursery locations...
        </Text>
      </View>
    );
  }

  const renderBottomPanel = () => {
    switch (view) {
      case "MAIN":
        return renderMainPanel();
      case "ENTER_DIMENSIONS":
        return renderEnterDimensionsPanel();
      case "SUGGESTED_LOCATIONS":
        return renderSuggestedLocationsPanel();
      default:
        return null;
    }
  };

  const renderFullScreenView = () => {
    switch (view) {
      case "SELECT_TYPE":
        return renderSelectTypePanel();
      case "LOCATION_DETAIL":
        return renderLocationDetailPanel();
      case "ADD_STEP1":
        return renderAddStep1();
      case "ADD_STEP2":
        return renderAddStep2();
      case "VIEW_NURSERY":
        return renderViewNursery();
      case "EDIT_NURSERY":
        return renderEditNursery();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {needsMap && renderMap()}

      {needsMap && (
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
          <View style={styles.dragArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>
          {renderBottomPanel()}
        </Animated.View>
      )}

      {!needsMap && renderFullScreenView()}

      {renderSpeciesModal(false)}
      {renderSpeciesModal(true)}
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const PRIMARY = "#517AAD";
const CARD_BG = "#DCE6F7";
const PANEL_RADIUS = 26;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: -16,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  loadingSubtitle: { marginTop: 6, fontSize: 13, color: "#aaa" },

  // ── Map ──
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },

  // Nursery marker: label chip → icon circle → downward tip
  nurseryMarker: {
    alignItems: "center",
  },
  nurseryLabel: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxWidth: 110,
  },
  nurseryLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#222",
  },
  nurseryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  nurseryPinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: PRIMARY,
  },

  // Location pin marker: label chip → icon circle → downward tip
  locationMarker: { alignItems: "center" },
  locationLabel: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: 72,
    alignItems: "center",
  },
  locationLabelText: { fontSize: 11, fontWeight: "600", color: "#333" },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#CC3344",
    justifyContent: "center",
    alignItems: "center",
  },
  locationIconActive: { borderColor: PRIMARY },
  locationIcon: { fontSize: 18 },
  locationPinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#CC3344",
  },
  locationPinTipActive: { borderTopColor: PRIMARY },

  // ── Swipeable bottom sheet ──
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT - TOP_SAFE,
    backgroundColor: "#fff",
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 8,
  },
  dragArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
  },

  // ── Bottom panel (map views) ──
  panel: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 16,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 14,
    textAlign: "center",
  },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 8 },

  // ── MAIN summary ──
  summaryTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  summaryTitle: { fontSize: 16, fontWeight: "700", color: "#000" },
  summaryCount: { fontSize: 16, fontWeight: "700", color: "#000" },
  summarySubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  summarySubLabel: { fontSize: 14, color: "#444" },
  summarySubCount: { fontSize: 14, color: "#444" },

  // ── FAB ──
  fab: {
    position: "absolute",
    bottom: 90,
    right: 22,
    width: 56,
    height: 56,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },

  // ── Type selection grid ──
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    gap: 14,
    marginTop: 8,
  },
  typeCard: {
    width: 138,
    height: 130,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  typeCardIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  typeCardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },

  // ── Form rows (map panel forms) ──
  formRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  formLabel: {
    width: 72,
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    lineHeight: 18,
  },
  formInput: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#000",
    marginRight: 8,
    height: 42,
  },
  dropdownInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownInputText: { fontSize: 14, color: "#333", flex: 1 },
  unitTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    height: 42,
    minWidth: 56,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  unitTagActive: {
    borderColor: PRIMARY,
    backgroundColor: "#EBF1FB",
  },
  unitTagText: { fontSize: 13, fontWeight: "600", color: "#333" },
  unitTagTextActive: { color: PRIMARY },

  // ── Location list ──
  locationListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EFF8",
  },
  locationListItemText: { fontSize: 15, color: "#222", fontWeight: "500" },
  emptyText: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },

  // ── Location detail ──
  coordRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  coordLabel: { width: 90, fontSize: 14, fontWeight: "600", color: "#333" },
  coordValueBox: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  coordValue: { fontSize: 13, color: "#222" },

  // ── Buttons ──
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  backLink: { marginTop: 10, alignItems: "center" },
  backLinkText: { fontSize: 13, color: PRIMARY, fontWeight: "500" },

  // ── Full-screen form views ──
  fullScreen: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 22 },
  fullScreenContent: { paddingTop: 10, paddingBottom: 120 },
  fullRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  fullLabel: {
    width: 90,
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    lineHeight: 18,
  },
  fullInput: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
    marginRight: 8,
    minHeight: 42,
  },
  fullInputShort: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
    marginRight: 8,
    height: 42,
  },
  readonlyBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readonlyText: { fontSize: 14, color: "#333", flex: 1 },
  notesInput: { minHeight: 70, textAlignVertical: "top" },
  editBtnRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#CC3344",
    backgroundColor: "#fff",
  },
  cancelBtnText: { color: "#CC3344", fontSize: 15, fontWeight: "700" },
  saveBtn: { flex: 1 },

  // ── Species modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 14,
    textAlign: "center",
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4FB",
  },
  modalOptionText: { fontSize: 15, color: "#333" },
  modalOptionSelected: { color: PRIMARY, fontWeight: "700" },
  modalCancel: { marginTop: 14, alignItems: "center", paddingVertical: 10 },
  modalCancelText: { fontSize: 14, color: "#888", fontWeight: "500" },
});
