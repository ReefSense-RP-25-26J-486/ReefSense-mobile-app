import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fixed map height — avoids the MapView flex-expansion bug on iOS/Android
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.44);

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL_GIS;

const PORT_CITY_REGION = {
  latitude: 6.9297,
  longitude: 79.8476,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};


const CORAL_SPECIES = ['Acropora', 'Porites', 'Montipora', 'Pocillopora', 'Stylophora'];

// Icon + display label for each nursery type key
const TYPE_META: Record<string, { label: string; icon: string; iconFamily: 'Ionicons' | 'MaterialIcons' }> = {
  table:    { label: 'Nursery Table', icon: 'grid-outline',       iconFamily: 'Ionicons' },
  tree:     { label: 'Tree Nursery',  icon: 'leaf',               iconFamily: 'Ionicons' },
  drum:     { label: 'Drum Nursery',  icon: 'disc-outline',       iconFamily: 'Ionicons' },
  reef_ball:{ label: 'Reef Ball',     icon: 'ellipse-outline',    iconFamily: 'Ionicons' },
};

type ScreenView =
  | 'MAIN'
  | 'SELECT_TYPE'
  | 'ENTER_DIMENSIONS'
  | 'SUGGESTED_LOCATIONS'
  | 'LOCATION_DETAIL'
  | 'ADD_STEP1'
  | 'ADD_STEP2'
  | 'VIEW_NURSERY'
  | 'EDIT_NURSERY';

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
  shape: 'rectangle' | 'circle';
  required_fields: string[];
  optional_fields: string[];
  description: string;
}

export default function NurseryPlanningScreen() {
  const mapRef = useRef<MapView>(null);

  const [view, setView] = useState<ScreenView>('MAIN');
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [availablePoints, setAvailablePoints] = useState<CandidatePoint[]>([]);
  const [unavailablePoints, setUnavailablePoints] = useState<CandidatePoint[]>([]);
  const [suggestedLocations, setSuggestedLocations] = useState<SuggestedLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SuggestedLocation | null>(null);
  const [selectedNursery, setSelectedNursery] = useState<Nursery | null>(null);
  const [nurseryTypes, setNurseryTypes] = useState<Record<string, NurseryTypeInfo>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Add-nursery form
  const [selectedType, setSelectedType] = useState<string>('table');
  const [heightCm, setHeightCm] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [coralSpecies, setCoralSpecies] = useState('Acropora');
  const [nurseryName, setNurseryName] = useState('');
  const [datePlacement] = useState(new Date().toLocaleDateString('en-GB'));
  const [depthM, setDepthM] = useState('');
  const [notes, setNotes] = useState('');
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'm'>('cm');
  const [widthUnit, setWidthUnit]   = useState<'cm' | 'm'>('cm');

  // Edit-nursery form
  const [editHeight, setEditHeight] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [editCoralSpecies, setEditCoralSpecies] = useState('Acropora');
  const [editNotes, setEditNotes] = useState('');
  const [editDepth, setEditDepth] = useState('');
  const [showEditSpeciesPicker, setShowEditSpeciesPicker] = useState(false);
  const [editHeightUnit, setEditHeightUnit] = useState<'cm' | 'm'>('cm');
  const [editWidthUnit, setEditWidthUnit]   = useState<'cm' | 'm'>('cm');

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [nursRes, avRes, unavRes, typesRes] = await Promise.all([
        fetch(`${BASE_URL}/api/gis/nurseries`),
        fetch(`${BASE_URL}/api/gis/candidate-points?available=true&limit=120`),
        fetch(`${BASE_URL}/api/gis/candidate-points?available=false&limit=80`),
        fetch(`${BASE_URL}/api/gis/nursery-types`),
      ]);
      if (nursRes.ok)  { const d = await nursRes.json();  setNurseries(d.nurseries ?? []); }
      if (avRes.ok)    { const d = await avRes.json();    setAvailablePoints(d.points ?? []); }
      if (unavRes.ok)  { const d = await unavRes.json();  setUnavailablePoints(d.points ?? []); }
      if (typesRes.ok) { const d = await typesRes.json(); setNurseryTypes(d.nursery_types ?? {}); }
    } catch (e) {
      console.warn('GIS fetch error:', e);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const resetToMain = () => {
    setView('MAIN');
    setSuggestedLocations([]);
    setSelectedLocation(null);
    setSelectedNursery(null);
    mapRef.current?.animateToRegion(PORT_CITY_REGION, 400);
  };

  const resetAddForm = () => {
    setHeightCm(''); setWidthCm(''); setCoralSpecies('Acropora');
    setNurseryName(''); setDepthM(''); setNotes('');
    setHeightUnit('cm'); setWidthUnit('cm');
  };

  const isCircleType = (type: string) => nurseryTypes[type]?.shape === 'circle';

  // Converts a user-entered value to metres based on the selected unit
  const toMeters = (val: string, unit: 'cm' | 'm'): number =>
    unit === 'cm' ? parseFloat(val) / 100 : parseFloat(val);

  const getNurseryDisplayName = (n: Nursery) =>
    n.name ?? (n.type === 'reef_ball' ? `Reef Ball #${n.id}` : `Nursery #${n.id}`);

  const getWidthDisplay = (n: Nursery): string => {
    if (n.type === 'table')
      return n.width_m != null ? `${Math.round(n.width_m * 100)} CM` : '--';
    return n.radius_m != null ? `${Math.round(n.radius_m * 200)} CM` : '--';
  };

  const formatDate = (raw: string | null): string => {
    if (!raw) return '--';
    try { return new Date(raw).toLocaleDateString('en-GB'); } catch { return raw; }
  };

  const typeLabel = (key: string) => TYPE_META[key]?.label ?? key.replace('_', ' ');

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleFindLocations = async () => {
    if (!heightCm.trim() || !widthCm.trim()) {
      Alert.alert('Missing Dimensions', 'Please enter both values.'); return;
    }
    setLoading(true);
    try {
      const widthM  = toMeters(widthCm, widthUnit);
      const heightM = toMeters(heightCm, heightUnit);
      const body: Record<string, unknown> = { nursery_type: selectedType, height_m: heightM, limit: 8 };
      if (!isCircleType(selectedType)) { body.width_m = widthM; body.length_m = widthM; }
      else { body.radius_m = widthM / 2; }

      const res = await fetch(`${BASE_URL}/api/gis/top-locations-by-nursery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const pts: SuggestedLocation[] = data.points ?? [];
        setSuggestedLocations(pts);
        setView('SUGGESTED_LOCATIONS');
        if (pts.length > 0) {
          mapRef.current?.animateToRegion(
            { latitude: pts[0].latitude, longitude: pts[0].longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 },
            500,
          );
        }
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error ?? 'Failed to get locations.');
      }
    } catch { Alert.alert('Network Error', 'Could not connect to server.'); }
    finally { setLoading(false); }
  };

  const handleCompleteNursery = async () => {
    if (!selectedLocation) return;
    if (!depthM.trim()) { Alert.alert('Missing Info', 'Please enter the depth.'); return; }
    setLoading(true);
    try {
      const widthM  = toMeters(widthCm, widthUnit);
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
      if (!isCircleType(selectedType)) { body.width_m = widthM; body.length_m = widthM; }
      else { body.radius_m = widthM / 2; }

      const res = await fetch(`${BASE_URL}/api/gis/nurseries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) {
        resetAddForm(); await fetchAll(); resetToMain();
        Alert.alert('Success', 'Nursery added successfully!');
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error ?? 'Failed to add nursery.');
      }
    } catch { Alert.alert('Network Error', 'Could not connect to server.'); }
    finally { setLoading(false); }
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
        const wm = toMeters(editWidth, editWidthUnit); body.width_m = wm; body.length_m = wm;
      } else if (editWidth) {
        body.radius_m = toMeters(editWidth, editWidthUnit) / 2;
      }
      const res = await fetch(`${BASE_URL}/api/gis/nurseries/${selectedNursery.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) { await fetchAll(); resetToMain(); Alert.alert('Updated', 'Nursery updated.'); }
      else { const err = await res.json(); Alert.alert('Error', err.error ?? 'Failed to update.'); }
    } catch { Alert.alert('Network Error', 'Could not connect to server.'); }
    finally { setLoading(false); }
  };

  const openNurseryView = (n: Nursery) => { setSelectedNursery(n); setView('VIEW_NURSERY'); };

  const openNurseryEdit = () => {
    if (!selectedNursery) return;
    setEditHeight(selectedNursery.height_m ? String(Math.round(selectedNursery.height_m * 100)) : '');
    setEditWidth(
      !isCircleType(selectedNursery.type)
        ? selectedNursery.width_m ? String(Math.round(selectedNursery.width_m * 100)) : ''
        : selectedNursery.radius_m ? String(Math.round(selectedNursery.radius_m * 200)) : '',
    );
    setEditCoralSpecies(selectedNursery.coral_species ?? 'Acropora');
    setEditNotes(selectedNursery.notes ?? '');
    setEditDepth(selectedNursery.depth_m != null ? String(selectedNursery.depth_m) : '');
    setEditHeightUnit('cm'); setEditWidthUnit('cm');
    setView('EDIT_NURSERY');
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
        {/* Existing nurseries — icon + name label, type-specific icon */}
        {nurseries.map((n) => {
          const meta = TYPE_META[n.type];
          const label = getNurseryDisplayName(n);
          return (
            <Marker
              key={`nurs-${n.id}`}
              coordinate={{ latitude: n.latitude, longitude: n.longitude }}
              onPress={() => { if (view === 'MAIN') openNurseryView(n); }}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.nurseryMarker}>
                <View style={styles.nurseryMarkerBubble}>
                  {meta?.iconFamily === 'MaterialIcons'
                    ? <MaterialIcons name={meta.icon as any} size={14} color="#fff" />
                    : <Ionicons name={(meta?.icon ?? 'leaf') as any} size={14} color="#fff" />
                  }
                  <Text style={styles.nurseryMarkerText} numberOfLines={1}>{label}</Text>
                </View>
                <View style={styles.nurseryMarkerTail} />
              </View>
            </Marker>
          );
        })}

        {/* Suggested location pins */}
        {(view === 'SUGGESTED_LOCATIONS' || view === 'LOCATION_DETAIL') &&
          suggestedLocations.map((loc, idx) => {
            const isActive = selectedLocation?.id === loc.id;
            return (
              <Marker
                key={`sug-${loc.id}`}
                coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                onPress={() => { setSelectedLocation(loc); setView('LOCATION_DETAIL'); }}
                tracksViewChanges={false}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.locationMarker}>
                  <View style={[styles.locationPin, isActive && styles.locationPinActive]}>
                    <Text style={styles.locationPinText} numberOfLines={1}>Location {idx + 1}</Text>
                  </View>
                  <View style={[styles.locationMarkerTail, isActive && styles.locationMarkerTailActive]} />
                </View>
              </Marker>
            );
          })
        }
      </MapView>
    </View>
  );

  // ── PANEL VIEWS ───────────────────────────────────────────────────────────────

  const renderMainPanel = () => (
    <View style={styles.panel}>
      <View style={styles.summaryTitleRow}>
        <Text style={styles.summaryTitle}>Coral Structures</Text>
        <Text style={styles.summaryCount}>{nurseries.length}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.summarySubRow}><Text style={styles.summarySubLabel}>Coral Nurseries</Text><Text style={styles.summarySubCount}>{nurseries.filter(n => n.type !== 'reef_ball').length}</Text></View>
      <View style={styles.summarySubRow}><Text style={styles.summarySubLabel}>Cement Reef Balls</Text><Text style={styles.summarySubCount}>{nurseries.filter(n => n.type === 'reef_ball').length}</Text></View>
      <TouchableOpacity style={styles.fab} onPress={() => setView('SELECT_TYPE')}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderSelectTypePanel = () => {
    // All types from backend, fall back to defaults if not yet loaded
    const typeKeys = Object.keys(nurseryTypes).length > 0
      ? Object.keys(nurseryTypes)
      : ['table', 'tree', 'drum', 'reef_ball'];

    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Select Structure Type</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.typeGrid}>
            {typeKeys.map((key) => {
              const meta = TYPE_META[key] ?? { label: typeLabel(key), icon: 'help-circle-outline', iconFamily: 'Ionicons' };
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.typeCard}
                  onPress={() => { setSelectedType(key); setView('ENTER_DIMENSIONS'); }}
                >
                  <Ionicons name={meta.icon as any} size={34} color="#517AAD" />
                  <Text style={styles.typeCardLabel}>{meta.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.backLink} onPress={() => setView('MAIN')}>
            <Text style={styles.backLinkText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderEnterDimensionsPanel = () => {
    const circle = isCircleType(selectedType);
    const dimLabel = circle ? 'Radius' : 'Width';
    return (
      <KeyboardAvoidingView
        style={styles.panel}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.panelTitle}>Enter Structure Dimensions</Text>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Height</Text>
            <TextInput style={styles.formInput} value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" returnKeyType="next" />
            <TouchableOpacity
              style={[styles.unitTag, heightUnit === 'm' && styles.unitTagActive]}
              onPress={() => setHeightUnit(u => u === 'cm' ? 'm' : 'cm')}
            >
              <Text style={[styles.unitTagText, heightUnit === 'm' && styles.unitTagTextActive]}>{heightUnit.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>{dimLabel}</Text>
            <TextInput style={styles.formInput} value={widthCm} onChangeText={setWidthCm} keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" returnKeyType="done" />
            <TouchableOpacity
              style={[styles.unitTag, widthUnit === 'm' && styles.unitTagActive]}
              onPress={() => setWidthUnit(u => u === 'cm' ? 'm' : 'cm')}
            >
              <Text style={[styles.unitTagText, widthUnit === 'm' && styles.unitTagTextActive]}>{widthUnit.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Coral{'\n'}Species</Text>
            <TouchableOpacity style={[styles.formInput, styles.dropdownInput]} onPress={() => setShowSpeciesPicker(true)}>
              <Text style={styles.dropdownInputText}>{coralSpecies}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 8 }, loading && styles.primaryBtnDisabled]}
            onPress={handleFindLocations} disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Find Locations</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => setView('SELECT_TYPE')}>
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
          <TouchableOpacity key={loc.id} style={styles.locationListItem}
            onPress={() => { setSelectedLocation(loc); setView('LOCATION_DETAIL'); }}
          >
            <Text style={styles.locationListItemText}>Location {idx + 1}</Text>
            <MaterialIcons name="chevron-right" size={22} color="#517AAD" />
          </TouchableOpacity>
        ))}
        {suggestedLocations.length === 0 && <Text style={styles.emptyText}>No locations found. Try adjusting dimensions.</Text>}
        <View style={{ height: 80 }} />
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => setView('SELECT_TYPE')}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.backLink} onPress={() => setView('ENTER_DIMENSIONS')}>
        <Text style={styles.backLinkText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLocationDetailPanel = () => {
    const idx = suggestedLocations.findIndex(l => l.id === selectedLocation?.id);
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Location {idx + 1}</Text>
        <View style={styles.coordRow}>
          <Text style={styles.coordLabel}>Latitude</Text>
          <View style={styles.coordValueBox}><Text style={styles.coordValue}>{selectedLocation?.latitude?.toFixed(12)}</Text></View>
        </View>
        <View style={styles.coordRow}>
          <Text style={styles.coordLabel}>Longitude</Text>
          <View style={styles.coordValueBox}><Text style={styles.coordValue}>{selectedLocation?.longitude?.toFixed(12)}</Text></View>
        </View>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={() => setView('ADD_STEP1')}>
          <Text style={styles.primaryBtnText}>Add a Nursery Here</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => setView('SUGGESTED_LOCATIONS')}>
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── FULL-SCREEN FORM VIEWS ────────────────────────────────────────────────────

  const renderAddStep1 = () => (
    <KeyboardAvoidingView style={styles.fullScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.fullScreenContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.panelTitle}>Nursery Information</Text>

        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Name</Text>
          <TextInput style={styles.fullInput} value={nurseryName} onChangeText={setNurseryName}
            placeholder={`Nursery #${nurseries.length + 1}`} placeholderTextColor="#bbb" />
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Height</Text>
          <TextInput style={styles.fullInputShort} value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" />
          <TouchableOpacity
            style={[styles.unitTag, heightUnit === 'm' && styles.unitTagActive]}
            onPress={() => setHeightUnit(u => u === 'cm' ? 'm' : 'cm')}
          >
            <Text style={[styles.unitTagText, heightUnit === 'm' && styles.unitTagTextActive]}>{heightUnit.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>{isCircleType(selectedType) ? 'Radius' : 'Width'}</Text>
          <TextInput style={styles.fullInputShort} value={widthCm} onChangeText={setWidthCm} keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" />
          <TouchableOpacity
            style={[styles.unitTag, widthUnit === 'm' && styles.unitTagActive]}
            onPress={() => setWidthUnit(u => u === 'cm' ? 'm' : 'cm')}
          >
            <Text style={[styles.unitTagText, widthUnit === 'm' && styles.unitTagTextActive]}>{widthUnit.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Coral{'\n'}Species</Text>
          <TouchableOpacity style={[styles.fullInput, styles.dropdownInput]} onPress={() => setShowSpeciesPicker(true)}>
            <Text style={styles.dropdownInputText}>{coralSpecies}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#555" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={() => setView('ADD_STEP2')}>
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => setView('LOCATION_DETAIL')}>
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderAddStep2 = () => (
    <KeyboardAvoidingView style={styles.fullScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.fullScreenContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.panelTitle}>Nursery Information</Text>

        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Date of{'\n'}Placement</Text>
          <View style={[styles.fullInput, styles.readonlyBox]}>
            <Text style={styles.readonlyText}>{datePlacement}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#555" />
          </View>
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Depth</Text>
          <TextInput style={styles.fullInputShort} value={depthM} onChangeText={setDepthM} keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" />
          <View style={styles.unitTag}><Text style={styles.unitTagText}>M</Text><MaterialIcons name="keyboard-arrow-down" size={16} color="#666" /></View>
        </View>
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Notes</Text>
          <TextInput style={[styles.fullInput, styles.notesInput]} value={notes} onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor="#bbb" multiline />
        </View>

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }, loading && styles.primaryBtnDisabled]} onPress={handleCompleteNursery} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Complete</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => setView('ADD_STEP1')}>
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const viewRow = (label: string, value: string) => (
    <View style={styles.fullRow} key={label}>
      <Text style={styles.fullLabel}>{label}</Text>
      <View style={[styles.fullInput, styles.readonlyBox]}>
        <Text style={styles.readonlyText} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );

  const renderViewNursery = () => {
    if (!selectedNursery) return null;
    return (
      <ScrollView style={styles.fullScreen} contentContainerStyle={styles.fullScreenContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.panelTitle}>{getNurseryDisplayName(selectedNursery)}</Text>
        {viewRow('Height', selectedNursery.height_m != null ? `${Math.round(selectedNursery.height_m * 100)} CM` : '--')}
        {viewRow(isCircleType(selectedNursery.type) ? 'Radius' : 'Width', getWidthDisplay(selectedNursery))}
        {viewRow('Coral\nSpecies', selectedNursery.coral_species ?? '--')}
        {viewRow('Date of\nPlacement', formatDate(selectedNursery.date_placement))}
        {viewRow('Depth', selectedNursery.depth_m != null ? `${selectedNursery.depth_m} M` : '--')}
        {viewRow('Notes', selectedNursery.notes ?? '--')}
        {viewRow('Latitude', selectedNursery.latitude?.toFixed(12) ?? '--')}
        {viewRow('Longitude', selectedNursery.longitude?.toFixed(12) ?? '--')}
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={openNurseryEdit}>
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
      <KeyboardAvoidingView style={styles.fullScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.fullScreenContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.panelTitle}>{getNurseryDisplayName(selectedNursery)}</Text>
          {viewRow('Name', getNurseryDisplayName(selectedNursery))}
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Height</Text>
            <TextInput style={styles.fullInputShort} value={editHeight} onChangeText={setEditHeight} keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" />
            <TouchableOpacity
              style={[styles.unitTag, editHeightUnit === 'm' && styles.unitTagActive]}
              onPress={() => setEditHeightUnit(u => u === 'cm' ? 'm' : 'cm')}
            >
              <Text style={[styles.unitTagText, editHeightUnit === 'm' && styles.unitTagTextActive]}>{editHeightUnit.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>{circle ? 'Radius' : 'Width'}</Text>
            <TextInput style={styles.fullInputShort} value={editWidth} onChangeText={setEditWidth} keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" />
            <TouchableOpacity
              style={[styles.unitTag, editWidthUnit === 'm' && styles.unitTagActive]}
              onPress={() => setEditWidthUnit(u => u === 'cm' ? 'm' : 'cm')}
            >
              <Text style={[styles.unitTagText, editWidthUnit === 'm' && styles.unitTagTextActive]}>{editWidthUnit.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Coral{'\n'}Species</Text>
            <TouchableOpacity style={[styles.fullInput, styles.dropdownInput]} onPress={() => setShowEditSpeciesPicker(true)}>
              <Text style={styles.dropdownInputText}>{editCoralSpecies}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#555" />
            </TouchableOpacity>
          </View>
          {viewRow('Date of\nPlacement', formatDate(selectedNursery.date_placement))}
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Depth</Text>
            <TextInput style={styles.fullInputShort} value={editDepth} onChangeText={setEditDepth} keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" />
            <View style={styles.unitTag}><Text style={styles.unitTagText}>M</Text><MaterialIcons name="keyboard-arrow-down" size={16} color="#666" /></View>
          </View>
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Notes</Text>
            <TextInput style={[styles.fullInput, styles.notesInput]} value={editNotes} onChangeText={setEditNotes} placeholder="Add notes..." placeholderTextColor="#bbb" multiline />
          </View>
          {viewRow('Latitude', selectedNursery.latitude?.toFixed(12) ?? '--')}
          {viewRow('Longitude', selectedNursery.longitude?.toFixed(12) ?? '--')}
          <View style={styles.editBtnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setView('VIEW_NURSERY')}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, styles.saveBtn, loading && styles.primaryBtnDisabled]} onPress={handleSaveEdit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save</Text>}
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
      transparent animationType="slide"
      onRequestClose={() => isEdit ? setShowEditSpeciesPicker(false) : setShowSpeciesPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Select Coral Species</Text>
          {CORAL_SPECIES.map(sp => (
            <TouchableOpacity key={sp} style={styles.modalOption}
              onPress={() => { if (isEdit) { setEditCoralSpecies(sp); setShowEditSpeciesPicker(false); } else { setCoralSpecies(sp); setShowSpeciesPicker(false); } }}
            >
              <Text style={[styles.modalOptionText, (isEdit ? editCoralSpecies : coralSpecies) === sp && styles.modalOptionSelected]}>{sp}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.modalCancel} onPress={() => isEdit ? setShowEditSpeciesPicker(false) : setShowSpeciesPicker(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────────

  const needsMap = !['ADD_STEP1', 'ADD_STEP2', 'VIEW_NURSERY', 'EDIT_NURSERY'].includes(view);

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#517AAD" />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }

  const renderBottomPanel = () => {
    switch (view) {
      case 'MAIN':                return renderMainPanel();
      case 'SELECT_TYPE':         return renderSelectTypePanel();
      case 'ENTER_DIMENSIONS':    return renderEnterDimensionsPanel();
      case 'SUGGESTED_LOCATIONS': return renderSuggestedLocationsPanel();
      case 'LOCATION_DETAIL':     return renderLocationDetailPanel();
      default: return null;
    }
  };

  const renderFullScreenView = () => {
    switch (view) {
      case 'ADD_STEP1':    return renderAddStep1();
      case 'ADD_STEP2':    return renderAddStep2();
      case 'VIEW_NURSERY': return renderViewNursery();
      case 'EDIT_NURSERY': return renderEditNursery();
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      {needsMap ? (
        <>
          {renderMap()}
          {renderBottomPanel()}
        </>
      ) : (
        renderFullScreenView()
      )}
      {renderSpeciesModal(false)}
      {renderSpeciesModal(true)}
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const PRIMARY         = '#517AAD';
const CARD_BG         = '#DCE6F7';
const PANEL_RADIUS    = 26;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: -16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
  },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },

  // ── Map ──
  mapContainer: {
    height: MAP_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  // ── Markers ──

  // Nursery marker: icon bubble + downward tail
  nurseryMarker: {
    alignItems: 'center',
  },
  nurseryMarkerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#517AAD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
    minWidth: 90,
    maxWidth: 150,
  },
  nurseryMarkerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
  },
  nurseryMarkerTail: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#517AAD',
  },

  // Location pin marker: pill + downward tail
  locationMarker: {
    alignItems: 'center',
  },
  locationPin: {
    backgroundColor: '#CC3344',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 2, borderColor: '#fff',
    minWidth: 80,
    alignItems: 'center',
  },
  locationPinActive: { backgroundColor: '#E8192C' },
  locationPinText:   { fontSize: 11, fontWeight: '700', color: '#fff' },
  locationMarkerTail: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#CC3344',
  },
  locationMarkerTailActive: { borderTopColor: '#E8192C' },

  // ── Bottom panel (map views) ──
  panel: {
    flex: 1,                      // fills all space below the fixed-height map
    backgroundColor: '#fff',
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 5,
  },
  panelTitle: {
    fontSize: 18, fontWeight: '700', color: '#000',
    marginBottom: 14, textAlign: 'center',
  },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },

  // ── MAIN summary ──
  summaryTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  summaryTitle:    { fontSize: 16, fontWeight: '700', color: '#000' },
  summaryCount:    { fontSize: 16, fontWeight: '700', color: '#000' },
  summarySubRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  summarySubLabel: { fontSize: 14, color: '#444' },
  summarySubCount: { fontSize: 14, color: '#444' },

  // ── FAB ──
  fab: {
    position: 'absolute', bottom: 90, right: 22,
    width: 56, height: 56, backgroundColor: PRIMARY,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 5, elevation: 6,
  },

  // ── Type selection grid ──
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-evenly', gap: 12, marginTop: 4 },
  typeCard: {
    width: 130, height: 100, backgroundColor: CARD_BG,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  typeCardLabel: { fontSize: 13, fontWeight: '600', color: '#333', textAlign: 'center' },

  // ── Form rows (map panel forms) ──
  formRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  formLabel: { width: 72, fontSize: 13, fontWeight: '600', color: '#333', lineHeight: 18 },
  formInput: {
    flex: 1, backgroundColor: CARD_BG, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: '#000', marginRight: 8, height: 42,
  },
  dropdownInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownInputText: { fontSize: 14, color: '#333', flex: 1 },
  unitTag: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8,
    height: 42, minWidth: 56, justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  unitTagActive: {
    borderColor: PRIMARY,
    backgroundColor: '#EBF1FB',
  },
  unitTagText: { fontSize: 13, fontWeight: '600', color: '#333' },
  unitTagTextActive: { color: PRIMARY },

  // ── Location list ──
  locationListItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E8EFF8',
  },
  locationListItemText: { fontSize: 15, color: '#222', fontWeight: '500' },
  emptyText: { color: '#888', fontSize: 13, textAlign: 'center', marginTop: 20 },

  // ── Location detail ──
  coordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  coordLabel: { width: 90, fontSize: 14, fontWeight: '600', color: '#333' },
  coordValueBox: { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  coordValue: { fontSize: 13, color: '#222' },

  // ── Buttons ──
  primaryBtn: {
    backgroundColor: PRIMARY, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backLink: { marginTop: 10, alignItems: 'center' },
  backLinkText: { fontSize: 13, color: PRIMARY, fontWeight: '500' },

  // ── Full-screen form views ──
  fullScreen: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 22 },
  fullScreenContent: { paddingTop: 10, paddingBottom: 120 },
  fullRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  fullLabel: { width: 90, fontSize: 13, fontWeight: '600', color: '#333', lineHeight: 18 },
  fullInput: {
    flex: 1, backgroundColor: CARD_BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#000', marginRight: 8, minHeight: 42,
  },
  fullInputShort: {
    flex: 1, backgroundColor: CARD_BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#000', marginRight: 8, height: 42,
  },
  readonlyBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readonlyText: { fontSize: 14, color: '#333', flex: 1 },
  notesInput: { minHeight: 70, textAlignVertical: 'top' },
  editBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#CC3344', backgroundColor: '#fff',
  },
  cancelBtnText: { color: '#CC3344', fontSize: 15, fontWeight: '700' },
  saveBtn: { flex: 1 },

  // ── Species modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 14, textAlign: 'center' },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F4FB' },
  modalOptionText: { fontSize: 15, color: '#333' },
  modalOptionSelected: { color: PRIMARY, fontWeight: '700' },
  modalCancel: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 14, color: '#888', fontWeight: '500' },
});
