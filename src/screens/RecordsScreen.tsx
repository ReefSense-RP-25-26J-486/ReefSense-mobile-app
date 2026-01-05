import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RecordsScreenProps {
    onBack: () => void;
    onAdd: () => void;
}

const RecordsScreen: React.FC<RecordsScreenProps> = ({ onBack, onAdd }) => {
    // Expanded sample data based on your request
    const tableData = Array(25).fill(null).map((_, index) => ({
        id: (index + 1).toString().padStart(3, '0'),
        date: "2025-12-18",
        time: "11:00 AM",
        temp3m: "28.2185",
        temp7m: "27.2712",
        temp10m: "26.9921",
    }));

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={onBack} style={styles.backLink}>
                <Text style={styles.backText}>{"< Return to Overview"}</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle}>Coral Site Temperature Records</Text>
            <Text style={styles.dateSubTitle}>Record History</Text>

            {/* Main Container with Border */}
            <View style={styles.tableCard}>
                {/* Vertical Scroll for Rows */}
                <ScrollView vertical showsVerticalScrollIndicator={true}>
                    {/* Horizontal Scroll for Columns */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View>
                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <Text style={[styles.headerText, { width: 50 }]}>ID</Text>
                                <Text style={[styles.headerText, { width: 100 }]}>Date</Text>
                                <Text style={[styles.headerText, { width: 90 }]}>Time</Text>
                                <Text style={[styles.headerText, { width: 110 }]}>Water Temp 0-2m</Text>
                                <Text style={[styles.headerText, { width: 110 }]}>Water Temp 3-6m</Text>
                                <Text style={[styles.headerText, { width: 110 }]}>Water Temp 7-10m</Text>
                            </View>

                            {/* Table Rows */}
                            {tableData.map((item, index) => (
                                <View key={index} style={[
                                    styles.tableRow,
                                    index % 2 === 0 ? styles.evenRow : styles.oddRow
                                ]}>
                                    <Text style={[styles.rowText, { width: 50 }]}>{item.id}</Text>
                                    <Text style={[styles.rowText, { width: 100 }]}>{item.date}</Text>
                                    <Text style={[styles.rowText, { width: 90 }]}>{item.time}</Text>
                                    <Text style={[styles.rowText, { width: 110 }]}>{item.temp3m}</Text>
                                    <Text style={[styles.rowText, { width: 110 }]}>{item.temp7m}</Text>
                                    <Text style={[styles.rowText, { width: 110 }]}>{item.temp10m}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </ScrollView>
            </View>

            {/* Action Button */}
            <TouchableOpacity style={styles.fab} onPress={onAdd} activeOpacity={0.8}>
                <MaterialCommunityIcons name="plus" size={30} color="white" />
            </TouchableOpacity>

            <View style={{ height: 100 }} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 8 },
    backLink: { marginTop: 10, paddingVertical: 5 },
    backText: { color: "#517AAD", fontWeight: "bold", fontSize: 16 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#000', marginVertical: 15, marginBottom: 0 },
    dateSubTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    tableCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: '#517AAD',
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F0F4FF',
        borderBottomWidth: 1.5,
        borderBottomColor: '#517AAD',
    },
    headerText: {
        padding: 12,
        fontWeight: 'bold',
        fontSize: 13,
        color: '#517AAD',
        textAlign: 'center',
        borderRightWidth: 1,
        borderRightColor: '#517AAD',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#DEE7F7',
    },
    evenRow: { backgroundColor: '#FFFFFF' },
    oddRow: { backgroundColor: '#F9FBFF' },
    rowText: {
        padding: 12,
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
        borderRightWidth: 1,
        borderRightColor: '#DEE7F7',
    },
    fab: {
        position: 'absolute',
        bottom: 120,
        right: 20,
        backgroundColor: '#517AAD',
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
    }
});

export default RecordsScreen;