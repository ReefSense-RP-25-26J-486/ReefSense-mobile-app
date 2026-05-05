import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

interface NetworkStatus {
  isOnline:  boolean;
  isLoading: boolean;
}

/**
 * Returns live network connectivity status.
 * isOnline = true  → device has an active internet connection
 * isOnline = false → device is offline; use cached data
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline:  true,   // optimistic default while first check runs
    isLoading: true,
  });

  useEffect(() => {
    // Get current state immediately
    NetInfo.fetch().then((state: NetInfoState) => {
      setStatus({
        isOnline:  !!(state.isConnected && state.isInternetReachable !== false),
        isLoading: false,
      });
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isOnline:  !!(state.isConnected && state.isInternetReachable !== false),
        isLoading: false,
      });
    });

    return unsubscribe;
  }, []);

  return status;
}
