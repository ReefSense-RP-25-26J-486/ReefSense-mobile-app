import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CacheKey, CacheMaxAge, cacheGet, cacheSet } from '../utils/cache';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Location {
  id:          number;
  name:        string;
  slug:        string;
  center_lat:  number;
  center_lon:  number;
  description?: string;
}

export interface AuthUser {
  id:          number;
  name:        string;
  email:       string;
  nic:         string;
  locationIds: number[];
}

interface LoginProfile {
  user:      AuthUser;
  locations: Location[];
}

interface AuthContextValue {
  token:              string | null;
  user:               AuthUser | null;
  userLocations:      Location[];
  selectedLocation:   Location | null;
  isLoading:          boolean;
  /** Pass profile data from the login response to skip the extra /profile call. */
  login:              (token: string, profile?: LoginProfile) => Promise<void>;
  logout:             () => void;
  setSelectedLocation:(loc: Location) => void;
  updateUser:         (patch: Partial<AuthUser>) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helper: decode JWT payload (base64url) ────────────────────────────────────

function decodeToken(token: string): any {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      )
    );
  } catch {
    return null;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token,            setToken]            = useState<string | null>(null);
  const [user,             setUser]             = useState<AuthUser | null>(null);
  const [userLocations,    setUserLocations]    = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null);
  const [isLoading,        setIsLoading]        = useState(true);

  /** Apply a LoginProfile to state and persist the profile to cache. */
  const applyProfile = useCallback(async (
    locs: Location[],
    authUser: AuthUser,
  ) => {
    setUser(authUser);
    setUserLocations(locs);

    // Persist to cache so offline login works next time
    await cacheSet(CacheKey.profile(), { user: authUser, locations: locs });

    const savedId = await AsyncStorage.getItem('selectedLocationId');
    const restored = savedId
      ? locs.find(l => l.id === parseInt(savedId)) ?? locs[0]
      : locs[0];
    setSelectedLocationState(restored ?? null);
  }, []);

  // Load profile + locations from the server using a token
  const loadProfile = useCallback(async (jwt: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) throw new Error('Session expired');
    const { user: profile } = await res.json();

    const authUser: AuthUser = {
      id:          profile.id,
      name:        profile.name,
      email:       profile.email,
      nic:         profile.nic,
      locationIds: (profile.locations ?? []).map((l: Location) => l.id),
    };
    await applyProfile(profile.locations ?? [], authUser);
  }, [applyProfile]);

  // On app start: restore session from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('authToken');
        if (!stored) return;

        // Verify token is not expired locally
        const payload = decodeToken(stored);
        if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
          await AsyncStorage.removeItem('authToken');
          return;
        }

        setToken(stored);

        // Check connectivity — if offline, restore from cache instead of hitting server
        const net = await NetInfo.fetch();
        const isOnline = !!(net.isConnected && net.isInternetReachable !== false);

        if (!isOnline) {
          const cached = await cacheGet<LoginProfile>(
            CacheKey.profile(),
            CacheMaxAge.profile,
          );
          if (cached) {
            await applyProfile(cached.data.locations, cached.data.user);
            return;
          }
          // No cache — force logout so user sees the login screen
          await AsyncStorage.removeItem('authToken');
          return;
        }

        // Online — fetch fresh profile (also updates the cache via applyProfile)
        await loadProfile(stored);
      } catch {
        // If online fetch fails try cached profile as fallback
        const stored = await AsyncStorage.getItem('authToken');
        if (stored) {
          const cached = await cacheGet<LoginProfile>(
            CacheKey.profile(),
            CacheMaxAge.profile,
          );
          if (cached) {
            await applyProfile(cached.data.locations, cached.data.user);
            return;
          }
        }
        await AsyncStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadProfile, applyProfile]);

  // login: save token, then use embedded profile data when available (avoids
  // an extra /profile round trip), otherwise fall back to fetching it.
  const login = useCallback(async (jwt: string, profile?: LoginProfile) => {
    setToken(jwt);
    await AsyncStorage.setItem('authToken', jwt);

    if (profile) {
      await applyProfile(profile.locations, profile.user);
    } else {
      await loadProfile(jwt);
    }
  }, [loadProfile, applyProfile]);

  // logout: clear everything
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setUserLocations([]);
    setSelectedLocationState(null);
    AsyncStorage.multiRemove(['authToken', 'selectedLocationId']);
  }, []);

  // setSelectedLocation: update state + persist
  const setSelectedLocation = useCallback((loc: Location) => {
    setSelectedLocationState(loc);
    AsyncStorage.setItem('selectedLocationId', String(loc.id));
  }, []);

  // updateUser: for profile edits (name change etc.)
  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{
      token, user, userLocations, selectedLocation,
      isLoading, login, logout, setSelectedLocation, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
