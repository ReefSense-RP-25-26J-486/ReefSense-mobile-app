import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';

interface Props {
  /** Optional label, e.g. "Last updated 2 hours ago" */
  cacheLabel?: string;
}

/**
 * Shown at the top of a screen when the device is offline.
 * Pass cacheLabel to display when the data was last fetched.
 */
export default function OfflineBanner({ cacheLabel }: Props) {
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
      <Text style={styles.text}>
        Offline — showing cached data
        {cacheLabel ? `  ·  ${cacheLabel}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  '#6B7280',
    paddingVertical:  6,
    paddingHorizontal: 14,
    gap: 6,
  },
  text: {
    color:    '#fff',
    fontSize: 12,
  },
});
