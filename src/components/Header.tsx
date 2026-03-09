import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from './AppText';

export default function Header() {
    return (
        <View style={styles.headerWrapper}>
            <View style={styles.contentContainer}>

                {/* Location Selector Pill */}
                <TouchableOpacity style={styles.locationSelector}>
                    <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={18} color="black" />
                        <Text style={styles.locationText} numberOfLines={1}>Port City, Colombo</Text>
                        <Ionicons name="chevron-down" size={20} color="black" />
                    </View>
                </TouchableOpacity>

                {/* Profile Icon Box */}
                <TouchableOpacity style={styles.profileBox}>
                    <Ionicons name="person" size={24} color="white" />
                </TouchableOpacity>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerWrapper: {
        backgroundColor: "#EEF4FF",
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingTop: 18,
        marginTop: 5,
        paddingBottom:18,
    },
    contentContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        marginTop: 20,
    },
    locationSelector: {
        backgroundColor: "#FFFFFF",
        height: 50,
        borderRadius: 15,
        flex: 1,
        marginRight: 12,
        justifyContent: "center",
        paddingHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    locationText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000",
        flex: 1,
        marginLeft: 8,
    },
    profileBox: {
        width: 50,
        height: 50,
        backgroundColor: "#D0E0FC",
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
    },
});
