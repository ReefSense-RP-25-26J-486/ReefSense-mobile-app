/**
 * cache.ts — lightweight AsyncStorage cache with TTL support.
 *
 * Keys follow the pattern:  "cache:<feature>:<qualifier>"
 * Each entry stores: { data: T, cachedAt: number (ms timestamp) }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

/** Save data under a cache key. */
export async function cacheSet<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(entry));
  } catch {
    // Non-fatal — cache writes should never crash the app
  }
}

/**
 * Read from cache.
 * @param key       Cache key (without the "cache:" prefix)
 * @param maxAgeMs  Max acceptable age in ms. Pass Infinity to always accept.
 * @returns         { data, cachedAt } if found and fresh, otherwise null.
 */
export async function cacheGet<T>(
  key: string,
  maxAgeMs: number = Infinity,
): Promise<{ data: T; cachedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > maxAgeMs) return null;
    return { data: entry.data, cachedAt: entry.cachedAt };
  } catch {
    return null;
  }
}

/** Delete a specific cache entry. */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`cache:${key}`);
  } catch {}
}

/** Format a cachedAt timestamp as a human-readable string, e.g. "2 hours ago". */
export function formatCacheAge(cachedAt: number): string {
  const diffMs  = Date.now() - cachedAt;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// ── Named cache keys (keeps key strings in one place) ────────────────────────

export const CacheKey = {
  profile:             ()                   => 'profile',
  coralSummaries:      (locationId: number) => `growth:summaries:${locationId}`,
  coralHistory:        (coralId: string)    => `growth:history:${coralId}`,
  temperature:         (locationId: number) => `temperature:${locationId}`,
  gisNurseries:        (locationId: number) => `gis:nurseries:${locationId}`,
  gisCandidatePoints:  (locationId: number) => `gis:candidate-points:${locationId}`,
  bleachingHistory:    (locationId: number) => `bleaching:history:${locationId}`,
} as const;

// Max ages
export const CacheMaxAge = {
  profile:            7  * 24 * 60 * 60_000, // 7 days
  coralSummaries:     24 *      60 * 60_000, // 24 hours
  coralHistory:       24 *      60 * 60_000, // 24 hours
  temperature:        6  *      60 * 60_000, // 6 hours
  gisNurseries:       24 *      60 * 60_000, // 24 hours
  gisCandidatePoints: 24 *      60 * 60_000, // 24 hours
  bleachingHistory:   24 *      60 * 60_000, // 24 hours
} as const;
