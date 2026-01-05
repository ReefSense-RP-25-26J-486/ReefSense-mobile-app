import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';

interface MediaUploadScreenProps {
    onBrowse: () => void;
    onHistory: () => void;
}

export default function MediaUploadScreen({ onBrowse, onHistory }: MediaUploadScreenProps) {
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            onBrowse(); 
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Upload Image</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                <MaterialIcons name="file-upload" size={50} color={colors.primary} />
                <Text style={styles.uploadText}>Upload Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={pickImage}>
                <Text style={styles.btnText}>Browse Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={onHistory}>
                <Text style={styles.btnText}>Track History</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', paddingTop: 20 },
    title: { fontSize: 22, fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 60 },
    uploadBox: { width: 150, height: 150, backgroundColor: colors.card, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 60 },
    uploadText: { marginTop: 10, color: colors.textSecondary },
    primaryBtn: { backgroundColor: '#5D81B4', width: '100%', padding: 18, borderRadius: 12, marginBottom: 15, alignItems: 'center' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});