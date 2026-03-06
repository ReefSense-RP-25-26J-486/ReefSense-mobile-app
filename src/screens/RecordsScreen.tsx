import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface RecordsScreenProps {
    onBack: () => void;
    onAdd: () => void;
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL

const RecordsScreen: React.FC<RecordsScreenProps> = ({ onBack, onAdd }) => {
    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/data/records`);
            if (response.ok) {
                const data = await response.json();
                setTableData(data.sort((a: any, b: any) => a.id - b.id));
            }
        } catch (error) {
            Alert.alert("Error", "Could not connect to database.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (dbId: number) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to permanently delete this record?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await fetch(`${BASE_URL}/api/data/records/${dbId}`, {
                                method: 'DELETE'
                            });
                            if (res.ok) fetchRecords();
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete.");
                        }
                    }
                }
            ]
        );
    };

    const handleUpdate = async () => {
        if (!selectedRecord) return;
        try {
            const res = await fetch(`${BASE_URL}/api/data/records/${selectedRecord.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    temp3m: parseFloat(selectedRecord.temp3m),
                    temp7m: parseFloat(selectedRecord.temp7m),
                    temp10m: parseFloat(selectedRecord.temp10m),
                    date: selectedRecord.date,
                    time: selectedRecord.time,
                    longitude: selectedRecord.longitude,
                    latitude: selectedRecord.latitude
                })
            });

            if (res.ok) {
                setEditModalVisible(false);
                fetchRecords();
                Alert.alert("Success", "Record updated successfully!");
            }
        } catch (e) {
            Alert.alert("Error", "Could not reach the server.");
        }
    };

    useEffect(() => { fetchRecords(); }, []);

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={onBack} style={styles.backLink}>
                <Text style={styles.backText}>{"< Return to Overview"}</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle}>Coral Temperature Records</Text>
            <Text style={styles.dateSubTitle}>Record History</Text>

            <View style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" color="#517AAD" style={{ flex: 1 }} />
                ) : tableData.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="database-off" size={60} color="#CCC" />
                        <Text style={styles.emptyText}>No data available yet.</Text>
                        <Text style={styles.emptySubText}>Tap + to start recording.</Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={true}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                            <View>
                                {/* TABLE HEADER */}
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.headerText, { width: 45 }]}>ID</Text>
                                    <Text style={[styles.headerText, { width: 85 }]}>Code</Text>
                                    <Text style={[styles.headerText, { width: 95 }]}>Date</Text>
                                    <Text style={[styles.headerText, { width: 80 }]}>Time</Text>
                                    <Text style={[styles.headerText, { width: 100 }]}>Water Temp 0-2m</Text>
                                    <Text style={[styles.headerText, { width: 100 }]}>Water Temp 3-6m</Text>
                                    <Text style={[styles.headerText, { width: 100 }]}>Water Temp 7-10m</Text>
                                    <Text style={[styles.headerText, { width: 90, borderRightWidth: 0 }]}>Actions</Text>
                                </View>

                                {/* TABLE ROWS */}
                                {tableData.map((item, index) => (
                                    <View key={item.id} style={[
                                        styles.tableRow,
                                        index % 2 === 0 ? styles.evenRow : styles.oddRow
                                    ]}>
                                        <Text style={[styles.rowText, { width: 45 }]}>{index + 1}</Text>
                                        <Text style={[styles.rowText, { width: 85, fontWeight: 'bold', color: '#517AAD' }]}>
                                            {item.record_code || 'N/A'}
                                        </Text>

                                        <Text style={[styles.rowText, { width: 95 }]}>{item.date}</Text>
                                        <Text style={[styles.rowText, { width: 80 }]}>{item.time}</Text>
                                        <Text style={[styles.rowText, { width: 100 }]}>{item.temp3m}°C</Text>
                                        <Text style={[styles.rowText, { width: 100 }]}>{item.temp7m}°C</Text>
                                        <Text style={[styles.rowText, { width: 100 }]}>{item.temp10m}°C</Text>

                                        <View style={[styles.actionRow, { width: 90 }]}>
                                            <TouchableOpacity onPress={() => { setSelectedRecord(item); setEditModalVisible(true); }} style={styles.actionBtn}>
                                                <MaterialCommunityIcons name="pencil" size={18} color="#517AAD" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                                                <MaterialCommunityIcons name="trash-can" size={18} color="#F36464" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </ScrollView>
                )}
            </View>

            {/* EDIT MODAL */}
            <Modal visible={editModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Record {selectedRecord?.record_code}</Text>

                        <Text style={styles.modalLabel}>0-2m Depth (°C)</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={selectedRecord?.temp3m?.toString()}
                            onChangeText={(val) => setSelectedRecord({...selectedRecord, temp3m: val})}
                        />
                        <Text style={styles.modalLabel}>3-6m Depth (°C)</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={selectedRecord?.temp7m?.toString()}
                            onChangeText={(val) => setSelectedRecord({...selectedRecord, temp7m: val})}
                        />
                        <Text style={styles.modalLabel}>7-10m Depth (°C)</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={selectedRecord?.temp10m?.toString()}
                            onChangeText={(val) => setSelectedRecord({...selectedRecord, temp10m: val})}
                        />

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCancel}>
                                <Text style={{color: '#666'}}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUpdate} style={styles.modalSave}>
                                <Text style={{color: '#FFF', fontWeight: 'bold'}}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <TouchableOpacity style={styles.fab} onPress={onAdd} activeOpacity={0.8}>
                <MaterialCommunityIcons name="plus" size={30} color="white" />
            </TouchableOpacity>
            <View style={{ height: 100 }} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8
    },
    backLink: {
        marginTop: 10,
        paddingVertical: 5
    },
    backText: {
        color: "#517AAD",
        fontWeight: "bold",
        fontSize: 16
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 15
    },
    dateSubTitle: {
        fontSize: 13,
        color: '#666',
        marginBottom: 15
    },
    tableCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#517AAD',
        overflow: 'hidden'
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F0F4FF',
        borderBottomWidth: 1,
        borderBottomColor: '#517AAD'
    },
    headerText: {
        padding: 10,
        fontWeight: 'bold',
        fontSize: 12,
        color: '#517AAD',
        textAlign: 'center',
        borderRightWidth: 0.5,
        borderRightColor: '#517AAD'
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#DEE7F7',
        alignItems: 'center'
    },
    evenRow: { backgroundColor: '#FFFFFF' },
    oddRow: { backgroundColor: '#F9FBFF' },
    rowText: {
        padding: 10,
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
        borderRightWidth: 0.5,
        borderRightColor: '#DEE7F7'
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center'
    },
    actionBtn: { padding: 8 },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#517AAD',
        marginTop: 10
    },
    emptySubText: {
        fontSize: 12,
        color: '#999',
        marginTop: 5
    },
    fab: {
        position: 'absolute',
        bottom: 120,
        right: 20,
        backgroundColor: '#517AAD',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#517AAD',
        textAlign: 'center'
    },
    modalLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        color: '#000'
    },
    modalButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10
    },
    modalCancel: {
        padding: 12,
        width: '45%',
        alignItems: 'center'
    },
    modalSave: {
        backgroundColor: '#517AAD',
        padding: 12,
        width: '45%',
        borderRadius: 8,
        alignItems: 'center'
    }
});

export default RecordsScreen;