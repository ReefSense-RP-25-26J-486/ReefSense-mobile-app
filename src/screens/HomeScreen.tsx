import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";

export default function HomeScreen() {
    return (
        <View style={styles.container}>
            {/* Your main HomeScreen content */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
    },
    text: {
        color: colors.primary,
        fontSize: 20,
        fontWeight: "bold",
    },
});
