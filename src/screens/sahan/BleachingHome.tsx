import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function BleachingDetectionScreen() {
  return (
    <View style={styles.container}>



      {/* TITLE */}
      <Text style={styles.title}>Bleaching Detection</Text>

      {/* DATA CARD */}
      <View style={styles.card}>
        <Text style={styles.period}>Last month</Text>

        <View style={styles.row}>
          <Text style={styles.bleached}>Bleached corals</Text>
          <Text style={styles.count}>26</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.healthy}>Healthy corals</Text>
          <Text style={styles.count}>12</Text>
        </View>

        {/* PERCENTAGE */}
        <View style={styles.percentRow}>
          <Text style={styles.percent}>66%</Text>

          <View style={styles.circle}>
            <Ionicons name="leaf-outline" size={28} color="#000" />
          </View>

          <Text style={styles.percent}>34%</Text>
        </View>
      </View>

      {/* BUTTONS */}
      <TouchableOpacity style={styles.actionBtn}>
        <MaterialIcons name="analytics" size={26} color="#fff" />
        <Text style={styles.btnText}>Analysis</Text>
        <MaterialIcons name="chevron-right" size={26} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn}>
        <Ionicons name="time-outline" size={26} color="#fff" />
        <Text style={styles.btnText}>History</Text>
        <MaterialIcons name="chevron-right" size={26} color="#fff" />
      </TouchableOpacity>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <Ionicons name="location-outline" size={24} color="#4A78D0" />
        <Ionicons name="thermometer-outline" size={24} color="#9AA6BF" />
        <Ionicons name="leaf-outline" size={24} color="#9AA6BF" />
        <Ionicons name="settings-outline" size={24} color="#9AA6BF" />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 15,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
  },

  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F4FA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  locationText: {
    marginHorizontal: 6,
    fontSize: 14,
    fontWeight: "500",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  title: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 15,
  },

  card: {
    backgroundColor: "#EAF0FB",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: "#4A78D0",
  },

  period: {
    fontWeight: "600",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },

  bleached: {
    color: "#C0392B",
    fontWeight: "600",
  },

  healthy: {
    color: "#2ECC71",
    fontWeight: "600",
  },

  count: {
    fontWeight: "700",
  },

  percentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },

  percent: {
    fontWeight: "700",
  },

  circle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: "#2ECC71",
    justifyContent: "center",
    alignItems: "center",
  },

  actionBtn: {
    backgroundColor: "#5A7FD6",
    borderRadius: 20,
    padding: 18,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#F1F4FA",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
});
