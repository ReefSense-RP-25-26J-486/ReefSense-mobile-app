import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function LaunchScreen() {
    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => router.replace("/home")}>
                <Image
                    source={require("../src/assets/images/ReefSense_Logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
    },
    logo: {
        width: 350,
        height: 350,
    },
});