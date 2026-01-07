import React from "react";
import { Image, ImageSourcePropType, Platform, StyleSheet, TouchableOpacity, View } from "react-native";

interface BottomTabProps {
    activeIndex: number;
    onTabPress: (index: number) => void;
}

export default function BottomTab({ activeIndex, onTabPress }: BottomTabProps) {
    const icons: ImageSourcePropType[] = [
        require("../assets/icons/tab-location.png"),
        require("../assets/icons/tab-temp.png"),
        require("../assets/icons/tab-coral.png"),
        require("../assets/icons/tab-search.png"),
    ];

    return (
        /* This is the new white background box */
        <View style={styles.whiteBackgroundBox}>
            <View style={styles.tabContainer}>
                <View style={styles.tab}>
                    {icons.map((icon, index) => {
                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => onTabPress(index)}
                                style={[
                                    styles.iconBox,
                                    activeIndex === index && styles.activeIconBox
                                ]}
                            >
                                <Image
                                    source={icon}
                                    style={[
                                        styles.icon,
                                        activeIndex === index ? { tintColor: '#FFFFFF' } : { tintColor: '#517AAD' }
                                    ]}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    whiteBackgroundBox: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 60,
        borderTopRightRadius: 60,
        paddingTop: 6,
        paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    },
    tabContainer: {
        width: '100%',
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    },
    tab: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: 'center',
        backgroundColor: "#E8EFFF",
        paddingVertical: 8,
        borderRadius: 35,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    iconBox: {
        padding: 12,
        borderRadius: 15,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeIconBox: {
        backgroundColor: "#517AAD",
    },
    icon: {
        width: 26,
        height: 26,
        resizeMode: 'contain',
    },
});