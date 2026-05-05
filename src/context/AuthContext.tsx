import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const PROFILE_TIMEOUT_MS = 10000;

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

interface AuthContextValue {
  token:              string | null;
  user:               AuthUser | null;
  userLocations:      Location[];
  selectedLocation:   Location | null;
  isLoading:          boolean;
  login:              (token: string) => Promise<void>;
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

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token,            setToken]            = useState<string | null>(null);
  const [user,             setUser]             = useState<AuthUser | null>(null);
  const [userLocations,    setUserLocations]    = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null);
  const [isLoading,        setIsLoading]        = useState(true);

  // Load profile + locations from the server using a token
  const loadProfile = useCallback(async (jwt: string): Promise<void> => {
    if (!BASE_URL) {
      throw new Error('Missing EXPO_PUBLIC_API_URL');
    }

    const res = await fetchWithTimeout(`${BASE_URL}/api/auth/profile`, {
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
    setUser(authUser);
    setUserLocations(profile.locations ?? []);

    // Restore previously selected location (or default to first)
    const savedId = await AsyncStorage.getItem('selectedLocationId');
    const locs: Location[] = profile.locations ?? [];
    const restored = savedId
      ? locs.find(l => l.id === parseInt(savedId)) ?? locs[0]
      : locs[0];
    setSelectedLocationState(restored ?? null);
  }, []);

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
        await loadProfile(stored);
      } catch {
        setToken(null);
        setUser(null);
        setUserLocations([]);
        setSelectedLocationState(null);
        await AsyncStorage.multiRemove(['authToken', 'selectedLocationId']);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadProfile]);

  // login: save token → load profile
  const login = useCallback(async (jwt: string) => {
    setToken(jwt);
    await AsyncStorage.setItem('authToken', jwt);
    await loadProfile(jwt);
  }, [loadProfile]);

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
