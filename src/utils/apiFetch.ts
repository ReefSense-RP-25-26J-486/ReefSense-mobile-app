/**
 * apiFetch — wraps fetch() to inject JWT auth and selected location headers.
 *
 * Usage:
 *   const { token, selectedLocation } = useAuth();
 *   const res = await apiFetch('/api/gis/nurseries', token!, selectedLocation!.id);
 *
 * For FormData (multipart) bodies, do NOT set Content-Type — pass headers without it
 * and the browser/RN will set the boundary automatically.
 */
export async function apiFetch(
  path:      string,
  token:     string,
  locationId: number,
  options:   RequestInit = {},
): Promise<Response> {
  const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

  const isFormData = options.body instanceof FormData;

  // Build headers: always inject auth; skip Content-Type for multipart
  const authHeaders: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'X-Location-ID': String(locationId),
  };
  if (!isFormData) {
    authHeaders['Content-Type'] = 'application/json';
  }

  // Merge caller-provided headers AFTER auth headers (auth cannot be overridden)
  const mergedHeaders: Record<string, string> = {
    ...authHeaders,
    ...(options.headers as Record<string, string> ?? {}),
  };
  // FormData: ensure Content-Type is absent so fetch sets the multipart boundary
  if (isFormData) {
    delete mergedHeaders['Content-Type'];
  }

  return fetch(`${BASE}${path}`, { ...options, headers: mergedHeaders });
}

/** Convenience: parse JSON response and throw on HTTP error. */
export async function apiFetchJson<T>(
  path:      string,
  token:     string,
  locationId: number,
  options:   RequestInit = {},
): Promise<T> {
  const res = await apiFetch(path, token, locationId, options);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.json(); msg = b?.error ?? b?.message ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
