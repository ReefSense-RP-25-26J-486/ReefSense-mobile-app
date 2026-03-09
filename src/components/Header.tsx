import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Location } from '../context/AuthContext';
import { Text } from './AppText';

// ── Props ──────────────────────────────────────────────────────────────────────

interface HeaderProps {
  locations:          Location[];
  selectedLocation:   Location | null;
  onLocationChange:   (loc: Location) => void;
  onProfilePress:     () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Header({
  locations,
  selectedLocation,
  onLocationChange,
  onProfilePress,
}: HeaderProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const canSwitch = locations.length > 1;
  const displayName = selectedLocation?.name ?? 'Loading...';

  const handleLocationPress = () => {
    if (canSwitch) setModalVisible(true);
  };

  const handleSelect = (loc: Location) => {
    onLocationChange(loc);
    setModalVisible(false);
  };

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.contentContainer}>

        {/* Location Selector Pill */}
        <TouchableOpacity
          style={styles.locationSelector}
          onPress={handleLocationPress}
          activeOpacity={canSwitch ? 0.7 : 1}
        >
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={18} color="black" />
            <Text style={styles.locationText} numberOfLines={1}>{displayName}</Text>
            {canSwitch && (
              <Ionicons name="chevron-down" size={20} color="black" />
            )}
          </View>
        </TouchableOpacity>

        {/* Profile Icon Box */}
        <TouchableOpacity style={styles.profileBox} onPress={onProfilePress}>
          <Ionicons name="person" size={24} color="white" />
        </TouchableOpacity>

      </View>

      {/* Location Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Location</Text>
                {locations.map(loc => {
                  const isActive = loc.id === selectedLocation?.id;
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.locOption, isActive && styles.locOptionActive]}
                      onPress={() => handleSelect(loc)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name="location-sharp"
                        size={16}
                        color={isActive ? '#517AAD' : '#7A9DC0'}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.locOptionText, isActive && styles.locOptionTextActive]}>
                        {loc.name}
                      </Text>
                      {isActive && (
                        <Ionicons name="checkmark" size={18} color="#517AAD" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: '#EEF4FF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 18,
    marginTop: 5,
    paddingBottom: 18,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  locationSelector: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 15,
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginLeft: 8,
  },
  profileBox: {
    width: 50,
    height: 50,
    backgroundColor: '#517AAD',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    paddingTop: 130,
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B3C',
    marginBottom: 12,
  },
  locOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  locOptionActive: {
    backgroundColor: '#EEF4FF',
  },
  locOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#4A6080',
  },
  locOptionTextActive: {
    color: '#517AAD',
    fontWeight: '600',
  },
});
