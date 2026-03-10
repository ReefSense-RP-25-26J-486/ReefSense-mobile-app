import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { useAuth } from '../context/AuthContext';

interface AddRecordScreenProps {
    onBack: () => void;
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL

const AddRecordScreen: React.FC<AddRecordScreenProps> = ({ onBack }) => {
    const { token, selectedLocation } = useAuth();
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [longitude, setLongitude] = useState('');
    const [latitude, setLatitude] = useState('');

    // Temperature States
    const [temp02m, setTemp02m] = useState('');
    const [temp36m, setTemp36m] = useState('');
    const [temp710m, setTemp710m] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) setDate(selectedDate);
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) setDate(selectedTime);
    };

    const getLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Permission to access location was denied');
            return;
        }
        let location = await Location.getCurrentPositionAsync({});
        setLongitude(location.coords.longitude.toString());
        setLatitude(location.coords.latitude.toString());
    };

    const handleSubmit = async () => {
        if (!temp02m || !temp36m || !temp710m || !longitude || !latitude) {
            Alert.alert("Missing Info", "Please fill in all fields before submitting.");
            return;
        }

        setIsSubmitting(true);

        const payload = {
            date: date.toLocaleDateString('en-GB'),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
            longitude: longitude,
            latitude: latitude,
            temp3m: parseFloat(temp02m),
            temp7m: parseFloat(temp36m),
            temp10m: parseFloat(temp710m)
        };

        try {
            const response = await fetch(`${BASE_URL}/api/data/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'X-Location-ID': String(selectedLocation?.id ?? ''),
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Alert.alert("Success", "Record saved!");
                onBack(); // Go back to records list
            } else {
                const errorData = await response.json();
                Alert.alert("Error", errorData.detail || "Failed to save record.");
            }
        } catch (error) {
            Alert.alert("Connection Error", "Check your Connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView
                style={styles.screen}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
            >
                <Text style={styles.pageTitle}>Add Coral Site Temperature</Text>

                {/* Date Input */}
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.inputText}>{date.toLocaleDateString()}</Text>
                    <MaterialCommunityIcons name="calendar-month-outline" size={24} color="#517AAD" />
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
                )}

                {/* Time Input */}
                <Text style={styles.label}>Time</Text>
                <TouchableOpacity style={styles.inputContainer} onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.inputText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    <MaterialCommunityIcons name="clock-outline" size={24} color="#517AAD" />
                </TouchableOpacity>
                {showTimePicker && (
                    <DateTimePicker value={date} mode="time" is24Hour={false} display="default" onChange={onTimeChange} />
                )}

                {/* Location Section */}
                <Text style={styles.sectionHeader}>Get Location</Text>
                <View style={styles.locationRow}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.inlineInputGroup}>
                            <Text style={styles.inlineLabel}>longitude</Text>
                            <TextInput
                                style={styles.smallInput}
                                value={longitude}
                                onChangeText={setLongitude}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.inlineInputGroup}>
                            <Text style={styles.inlineLabel}>latitude</Text>
                            <TextInput
                                style={styles.smallInput}
                                value={latitude}
                                onChangeText={setLatitude}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
                        <MaterialCommunityIcons name="map-marker" size={28} color="#517AAD" />
                    </TouchableOpacity>
                </View>

                {/* Temperature Section */}
                <Text style={styles.sectionHeader}>Coral Site temperature (°C)</Text>

                <View style={styles.tempRow}>
                    <Text style={styles.tempLabel}>At 0-2 m Depth</Text>
                    <TextInput
                        style={styles.tempInput}
                        keyboardType="numeric"
                        placeholder="0.0"
                        value={temp02m}
                        onChangeText={setTemp02m}
                    />
                </View>

                <View style={styles.tempRow}>
                    <Text style={styles.tempLabel}>At 3-6 m Depth</Text>
                    <TextInput
                        style={styles.tempInput}
                        keyboardType="numeric"
                        placeholder="0.0"
                        value={temp36m}
                        onChangeText={setTemp36m}
                    />
                </View>

                <View style={styles.tempRow}>
                    <Text style={styles.tempLabel}>At 7-10 m Depth</Text>
                    <TextInput
                        style={styles.tempInput}
                        keyboardType="numeric"
                        placeholder="0.0"
                        value={temp710m}
                        onChangeText={setTemp710m}
                    />
                </View>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={onBack}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.btnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.btnText}>Submit</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 90 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFF',
        paddingHorizontal: 12
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 20,
        color: '#000',
        marginBottom: 25
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#000'
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 15
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#517AAD',
        borderRadius: 10,
        paddingHorizontal: 15,
        height: 45,
        marginBottom: 15,
        justifyContent: 'space-between'
    },
    inputText: {
        fontSize: 16,
        color: '#000'
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    inlineInputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    inlineLabel: {
        width: 80,
        fontSize: 16,
        color: '#818181'
    },
    smallInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#517AAD',
        borderRadius: 5,
        height: 40,
        paddingHorizontal: 8
    },
    locationButton: {
        backgroundColor: '#DEE7F7',
        padding: 15,
        borderRadius: 50,
        marginLeft: 15
    },
    tempRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15
    },
    tempLabel: {
        flex: 1,
        fontSize: 16,
        color: '#818181'
    },
    tempInput: {
        width: '60%',
        borderWidth: 1,
        borderColor: '#517AAD',
        borderRadius: 5,
        height: 40,
        paddingHorizontal: 10
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30
    },
    cancelBtn: {
        backgroundColor: '#F36464',
        paddingVertical: 15,
        borderRadius: 12,
        width: '45%',
        alignItems: 'center'
    },
    submitBtn: {
        backgroundColor: '#517AAD',
        paddingVertical: 15,
        borderRadius: 12,
        width: '45%',
        alignItems: 'center'
    },
    btnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default AddRecordScreen;