import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { isLoading, token } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (token) {
      router.replace('/home');
    } else {
      router.replace('/login');
    }
  }, [isLoading, token]);

  // Show spinner while auth state is being restored from storage
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#517AAD" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
