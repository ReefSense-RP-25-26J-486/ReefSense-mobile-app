import { FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
        <ScrollView style={styles.mainContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.container}>

                {/* New Overview Stats Section */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <FontAwesome5 name="microscope" size={20} color="#5D81B4" />
                        <Text style={styles.statValue}>24</Text>
                        <Text style={styles.statLabel}>Total Observations</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="spa" size={26} color="#5D81B4" />
                        <Text style={styles.statValue}>Euphyllide</Text>
                        <Text style={styles.statLabel}>Last Identified</Text>
                    </View>
                </View>

                {/* Existing Upload Logic */}
                <Text style={styles.sectionSubtitle}>New Analysis</Text>
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
                
                {/* Extra padding for bottom navigation */}
                <View style={{ height: 100 }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    container: { 
        flex: 1, 
        alignItems: 'center', 
        paddingTop: 20 
    },
    title: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        alignSelf: 'flex-start', 
        marginBottom: 20,
        color: '#000'
    },
    sectionSubtitle: {
        fontSize: 18,
        fontWeight: '600',
        alignSelf: 'flex-start',
        marginBottom: 20,
        marginTop: 10,
        color: colors.textSecondary
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 30,
    },
    statCard: {
        backgroundColor: colors.card,
        width: '48%',
        padding: 15,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    uploadBox: { 
        width: '100%', 
        height: 160, 
        backgroundColor: colors.card, 
        borderRadius: 25, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 30,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.primary
    },
    uploadText: { 
        marginTop: 10, 
        color: colors.textSecondary,
        fontWeight: '500' 
    },
    primaryBtn: { 
        backgroundColor: '#5D81B4', 
        width: '100%', 
        padding: 18, 
        borderRadius: 15, 
        marginBottom: 15, 
        alignItems: 'center',
        elevation: 3
    },
    btnText: { 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: 16 
    }
});