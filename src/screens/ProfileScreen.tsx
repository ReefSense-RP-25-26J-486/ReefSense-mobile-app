import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { useAuth } from '../context/AuthContext';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export default function ProfileScreen() {
  const { token, user, userLocations, logout, updateUser } = useAuth();

  const [name,            setName]            = useState(user?.name ?? '');
  const [currentPw,       setCurrentPw]       = useState('');
  const [newPw,           setNewPw]           = useState('');
  const [confirmPw,       setConfirmPw]       = useState('');
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);

  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!name.trim()) { setError('Name cannot be empty.'); return; }

    // If any password field is filled, all must be filled
    const changingPw = currentPw || newPw || confirmPw;
    if (changingPw) {
      if (!currentPw) { setError('Enter your current password.'); return; }
      if (!newPw)     { setError('Enter a new password.'); return; }
      if (newPw.length < 8) { setError('New password must be at least 8 characters.'); return; }
      if (newPw !== confirmPw) { setError('New passwords do not match.'); return; }
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { name: name.trim() };
      if (changingPw) {
        body.currentPassword = currentPw;
        body.password        = newPw;
        body.confirmPassword = confirmPw;
      }

      const res  = await fetch(`${BASE_URL}/api/auth/profile`, {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Save failed.'); return; }

      updateUser({ name: name.trim() });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setSuccess('Profile updated successfully.');
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#517AAD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={44} color="#517AAD" />
          </View>
          <Text style={styles.userName}>{user?.name ?? ''}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
        </View>

        {/* Feedback */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#C0392B" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {!!success && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={16} color="#1A7A4A" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {/* ── Personal Info ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color="#517AAD" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#A0B4D0"
            />
          </View>

          <Text style={styles.label}>NIC <Text style={styles.readOnly}>(not editable)</Text></Text>
          <View style={[styles.inputWrap, styles.inputReadOnly]}>
            <Ionicons name="card-outline" size={18} color="#A0B4D0" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.readOnlyText]}
              value={user?.nic ?? ''}
              editable={false}
            />
            <Ionicons name="lock-closed" size={14} color="#C8D9F0" />
          </View>

          <Text style={styles.label}>Email <Text style={styles.readOnly}>(not editable)</Text></Text>
          <View style={[styles.inputWrap, styles.inputReadOnly]}>
            <Ionicons name="mail-outline" size={18} color="#A0B4D0" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.readOnlyText]}
              value={user?.email ?? ''}
              editable={false}
            />
            <Ionicons name="lock-closed" size={14} color="#C8D9F0" />
          </View>
        </View>

        {/* ── Change Password ───────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Text style={styles.sectionHint}>Leave blank to keep your current password.</Text>

          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#517AAD" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter current password"
              placeholderTextColor="#A0B4D0"
              secureTextEntry={!showCurrent}
              value={currentPw}
              onChangeText={setCurrentPw}
            />
            <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#517AAD" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#517AAD" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Min. 8 characters"
              placeholderTextColor="#A0B4D0"
              secureTextEntry={!showNew}
              value={newPw}
              onChangeText={setNewPw}
            />
            <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#517AAD" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#517AAD" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Repeat new password"
              placeholderTextColor="#A0B4D0"
              secureTextEntry={!showConfirm}
              value={confirmPw}
              onChangeText={setConfirmPw}
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#517AAD" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── My Locations ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>My Locations</Text>
          <View style={styles.chipsWrap}>
            {userLocations.length === 0 && (
              <Text style={styles.noLocations}>No locations assigned.</Text>
            )}
            {userLocations.map(loc => (
              <View key={loc.id} style={styles.chip}>
                <Ionicons name="location-outline" size={13} color="#517AAD" />
                <Text style={styles.chipText}>{loc.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Save Button ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>
          }
        </TouchableOpacity>

        {/* ── Logout ────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#C0392B" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: '#EEF4FF' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 16,
  },
  backBtn:     { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A2B3C' },

  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#DCE6F7', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  userName:  { fontSize: 20, fontWeight: '700', color: '#1A2B3C' },
  userEmail: { fontSize: 14, color: '#7A9DC0', marginTop: 4 },

  errorBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE9E7', borderRadius: 10, padding: 12, marginBottom: 14, gap: 8 },
  errorText:  { color: '#C0392B', fontSize: 13, flex: 1 },
  successBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F9F1', borderRadius: 10, padding: 12, marginBottom: 14, gap: 8 },
  successText:{ color: '#1A7A4A', fontSize: 13, flex: 1 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A2B3C', marginBottom: 4 },
  sectionHint:  { fontSize: 12, color: '#7A9DC0', marginBottom: 8 },

  label:    { fontSize: 13, fontWeight: '600', color: '#4A6080', marginBottom: 6, marginTop: 12 },
  readOnly: { fontWeight: '400', color: '#A0B4D0' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0F5FF', borderRadius: 12,
    paddingHorizontal: 12, height: 50,
  },
  inputReadOnly: { backgroundColor: '#F8FAFF' },
  inputIcon:     { marginRight: 8 },
  input:         { flex: 1, fontSize: 15, color: '#1A2B3C' },
  readOnlyText:  { color: '#9AABC4' },
  eyeBtn:        { padding: 4 },

  chipsWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF4FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#C8D9F0',
  },
  chipText:    { fontSize: 13, color: '#517AAD', fontWeight: '500' },
  noLocations: { fontSize: 14, color: '#A0B4D0' },

  saveBtn: {
    backgroundColor: '#517AAD', borderRadius: 14, height: 52,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEE9E7', borderRadius: 14, height: 52,
  },
  logoutText: { color: '#C0392B', fontSize: 16, fontWeight: '700' },
});
