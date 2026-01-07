import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  onClose: () => void;
}

export default function BleachingAnalysis({ onClose }: Props) {
  const [location, setLocation] = useState('Tropical Bay');
  const [date, setDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [nurseryOptions] = useState(['NB-001', 'NB-002', 'NB-003']);
  const [nursery, setNursery] = useState(nurseryOptions[0]);
  const [showNurseryModal, setShowNurseryModal] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const pickImageFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required.');
        return;
      }
      setLoadingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      const res: any = result;
      if (res.canceled === false && res.assets && res.assets.length > 0) {
        setImage(res.assets[0].uri);
      } else if (res.cancelled === false && res.uri) {
        setImage(res.uri);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingImage(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to use camera is required.');
        return;
      }
      setLoadingImage(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      const res: any = result;
      if (res.canceled === false && res.assets && res.assets.length > 0) {
        setImage(res.assets[0].uri);
      } else if (res.cancelled === false && res.uri) {
        setImage(res.uri);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingImage(false);
    }
  };

  const openImageOptions = () => {
    const options = [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImageFromLibrary },
      { text: 'Cancel', style: 'cancel' as const },
    ];
    Alert.alert('Upload Image', 'Choose an option', options as any);
  };
  const [showResult, setShowResult] = useState(false);
  return (
    <SafeAreaView style={styles.safe}>
    

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}>
        <TouchableOpacity onPress={onClose} style={styles.backLink}>
          <Text style={styles.backText}>{"< Return to Overview"}</Text>
        </TouchableOpacity>
        <View style={styles.content}>
        <Text style={styles.subtitle}>Select the coral image</Text>

        <View style={styles.placeholderBox}>
          {image ? (
            <Image source={{ uri: image }} style={styles.placeholderImage} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="image-outline" size={48} color="#7b9bd3" />
              <Text style={styles.placeholderText}>Upload an image to analyze</Text>
            </>
          )}
        </View>

        <View style={styles.formRow}>
          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput value={location} onChangeText={setLocation} placeholder="Enter location" style={styles.input} />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity onPress={() => setShowDateModal(true)} style={styles.fieldBoxTouchable}>
            <Text style={styles.fieldValue}>{date.toDateString()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formRow}>
          <Text style={styles.fieldLabel}>Nursery ID</Text>
          <TouchableOpacity onPress={() => setShowNurseryModal(true)} style={styles.fieldBoxTouchable}>
            <Text style={styles.fieldValue}>{nursery}</Text>
          </TouchableOpacity>
        </View>

        <Pressable onPress={openImageOptions} style={styles.uploadBtn} android_ripple={{ color: '#3e64c6' }}>
          <View style={styles.uploadInner}>
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.uploadText}>{loadingImage ? 'Loading...' : (image ? 'Change Image' : 'Upload Image')}</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => setShowResult(true)} style={[styles.uploadBtn, styles.analysisBtn]} android_ripple={{ color: '#2f5fb0' }}>
          <View style={styles.uploadInner}>
            <Ionicons name="analytics-outline" size={18} color="#fff" />
            <Text style={styles.uploadText}>View Analysis</Text>
          </View>
        </Pressable>
        
        {/* Nursery selector modal */}
        <Modal visible={showNurseryModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Nursery</Text>
              {nurseryOptions.map((n) => (
                <TouchableOpacity key={n} onPress={() => { setNursery(n); setShowNurseryModal(false); }} style={styles.modalItem}>
                  <Text style={[styles.fieldValue, nursery === n && { fontWeight: '900' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setShowNurseryModal(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Analysis result modal */}
        <Modal visible={showResult} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>Bleach Detection & Severity Analysis</Text>
              <View style={styles.analysisImageWrap}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.analysisImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.analysisImage, styles.analysisImagePlaceholder]}>
                    <Ionicons name="image-outline" size={42} color="#7b9bd3" />
                  </View>
                )}
              </View>

              <View style={styles.analysisCircleRow}>
                <View style={styles.analysisCircle}>
                  <Text style={styles.analysisPercent}>37%</Text>
                  <Text style={styles.analysisLabel}>Bleached</Text>
                </View>
                <View style={styles.analysisSummary}>
                  <Text style={styles.analysisSeverity}>Medium Severity</Text>
                </View>
              </View>

              <View style={styles.analysisButtonsRow}>
                <TouchableOpacity style={styles.analysisAction}><Text style={styles.analysisActionText}>Analysis</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.analysisAction, styles.suggestionsAction]} onPress={() => { Alert.alert('Suggestions', 'Show restoration suggestions here.'); }}><Text style={[styles.analysisActionText, styles.suggestionsActionText]}>Suggestions</Text></TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setShowResult(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Simple date picker modal */}
        <Modal visible={showDateModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <View style={styles.datePickerRow}>
                <TouchableOpacity onPress={() => setDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1))} style={styles.dateNav}><Text style={styles.dateNavText}>‹</Text></TouchableOpacity>
                <Text style={styles.fieldValue}>{date.toDateString()}</Text>
                <TouchableOpacity onPress={() => setDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1))} style={styles.dateNav}><Text style={styles.dateNavText}>›</Text></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setShowDateModal(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>Done</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, paddingTop: Platform.OS === 'android' ? 18 : 22 },
  title: { fontSize: 20, fontWeight: '800' },
  closeBtn: { padding: 8 },

  content: { paddingHorizontal: 18 },
  subtitle: { textAlign: 'center', marginBottom: 18, color: '#7b9bd3', fontWeight: '700' },

  placeholderBox: { height: 160, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#e6eefc', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  placeholderText: { marginTop: 8, color: '#9aa6bf' },
  placeholderImage: { width: '100%', height: '100%', borderRadius: 14 },

  formRow: { marginVertical: 8 },
  fieldLabel: { color: '#9aa6bf', fontWeight: '700', marginBottom: 6 },
  fieldBox: { backgroundColor: '#f6f9ff', padding: 12, borderRadius: 10 },
  fieldValue: { color: '#34495e', fontWeight: '700' },

  uploadBtn: { marginTop: 20, backgroundColor: '#4A78D0', borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center' },
  uploadInner: { flexDirection: 'row', alignItems: 'center' },
  uploadText: { color: '#fff', fontWeight: '800', marginLeft: 8 },
  backLink: { marginTop: 10, paddingVertical: 5 },
  backText: { color: '#517AAD', fontWeight: '700', fontSize: 16 },
  input: { backgroundColor: '#f6f9ff', padding: 12, borderRadius: 10, fontWeight: '700', color: '#34495e' },
  fieldBoxTouchable: { backgroundColor: '#f6f9ff', padding: 12, borderRadius: 10 },
  analysisBtn: { marginTop: 12, backgroundColor: '#3b6fc1' },

  analysisCard: { width: '92%', backgroundColor: '#f7fbff', borderRadius: 16, padding: 18, alignItems: 'center' },
  analysisTitle: { fontWeight: '800', fontSize: 16, marginBottom: 12, textAlign: 'center' },
  analysisImageWrap: { width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  analysisImage: { width: '100%', height: '100%' },
  analysisImagePlaceholder: { backgroundColor: '#eef5ff', alignItems: 'center', justifyContent: 'center' },
  analysisCircleRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-around', marginBottom: 12 },
  analysisCircle: { width: 110, height: 110, borderRadius: 60, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  analysisPercent: { fontSize: 22, fontWeight: '900', color: '#2e6fb0' },
  analysisLabel: { fontSize: 12, color: '#6b7f96' },
  analysisSummary: { flex: 1, alignItems: 'center' },
  analysisSeverity: { color: '#7fc07f', fontWeight: '800', fontSize: 14 },
  analysisButtonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 8 },
  analysisAction: { flex: 1, marginHorizontal: 6, paddingVertical: 12, backgroundColor: '#3b6fc1', borderRadius: 10, alignItems: 'center' },
  analysisActionText: { color: '#fff', fontWeight: '800' },
  suggestionsAction: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d6e4ff' },
  suggestionsActionText: { color: '#3b6fc1' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '86%', backgroundColor: '#fff', borderRadius: 14, padding: 18, alignItems: 'center' },
  modalTitle: { fontWeight: '800', fontSize: 16, marginBottom: 12 },
  modalItem: { paddingVertical: 12, width: '100%', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eef4ff' },
  modalClose: { marginTop: 12, paddingVertical: 8 },
  modalCloseText: { color: '#517AAD', fontWeight: '800' },
  datePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingVertical: 12 },
  dateNav: { paddingHorizontal: 18, paddingVertical: 8 },
  dateNavText: { fontSize: 22, color: '#517AAD' },
});
