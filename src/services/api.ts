/**
 * ReefSense API Service
 * Centralises all communication with the Express backend.
 *
 * Set EXPO_PUBLIC_API_URL in your .env file, e.g.:
 *   EXPO_PUBLIC_API_URL=http://192.168.1.42:3000   ← your machine's LAN IP
 *   EXPO_PUBLIC_API_URL=http://10.0.2.2:3000        ← Android emulator → host
 *   EXPO_PUBLIC_API_URL=http://localhost:3000        ← iOS simulator → host
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LocationDetails {
  id: number;
  name: string;
  slug?: string | null;
  center_lat?: number | string | null;
  center_lon?: number | string | null;
  description?: string | null;
}

export interface AnalyzeResult {
  coral_detected: number;
  bleaching_detected: number;
  bleaching_percentage: number;
  original_image_url: string;
  annotated_image_url: string;
  coral_id?: string | number;
  remarks?: string | null;
  image_latitude?: number | string | null;
  image_longitude?: number | string | null;
  location_details?: LocationDetails | null;
}

export interface HistoryRecord {
  id: number;
  location: string;
  date: string;
  nursery: string;
  coral_id?: string | number;
  coral_detected: number;
  bleaching_detected: number;
  bleaching_percentage: number;
  original_image_url: string;
  annotated_image_url: string;
  created_at: string;
  remarks?: string | null;
  image_latitude?: number | string | null;
  image_longitude?: number | string | null;
  location_details?: LocationDetails | null;
}

// Shape of the raw GET /history response from the backend
interface HistoryResponse {
  filters: { location?: string; nursery?: string; date?: string };
  count: number;
  history: HistoryRecord[];
}

// ── Auth header helpers ───────────────────────────────────────────────────────

function authHeaders(token: string, locationId: number): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'X-Location-ID': String(locationId),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.error ?? body?.message ?? message;
    } catch {
      /* ignore parse error */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/**
 * PostgreSQL's `pg` driver returns NUMERIC/DECIMAL columns as strings.
 * This coerces the three numeric stat fields to JS numbers so callers
 * can safely use .toFixed(), comparisons, arithmetic, etc.
 */
function parseNumericFields(rec: HistoryRecord): HistoryRecord {
  return {
    ...rec,
    id: Number(rec.id),
    coral_id: rec.coral_id !== undefined ? String(rec.coral_id) : rec.coral_id,
    coral_detected: Number(rec.coral_detected),
    bleaching_detected: Number(rec.bleaching_detected),
    bleaching_percentage: Number(rec.bleaching_percentage),
    image_latitude:
      rec.image_latitude != null ? Number(rec.image_latitude) : rec.image_latitude,
    image_longitude:
      rec.image_longitude != null ? Number(rec.image_longitude) : rec.image_longitude,
  };
}

function parseAnalyzeResult(r: AnalyzeResult): AnalyzeResult {
  return {
    ...r,
    coral_detected: Number(r.coral_detected),
    bleaching_detected: Number(r.bleaching_detected),
    bleaching_percentage: Number(r.bleaching_percentage),
    coral_id: r.coral_id !== undefined ? String(r.coral_id) : r.coral_id,
    image_latitude:
      r.image_latitude != null ? Number(r.image_latitude) : r.image_latitude,
    image_longitude:
      r.image_longitude != null ? Number(r.image_longitude) : r.image_longitude,
  };
}

// ── API calls ────────────────────────────────────────────────────────────────

/**
 * POST /analyze
 * Sends the reef image + metadata to the backend for HF inference.
 */
export async function analyzeReef(
  params: {
    imageUri: string;
    location: string;
    date: string; // ISO string
    nursery: string;
    coral_id?: string;
    remarks?: string;
  },
  token: string,
  locationId: number,
): Promise<AnalyzeResult> {
  const formData = new FormData();

  // React Native requires this object shape for file uploads via FormData
  formData.append("image", {
    uri: params.imageUri,
    name: "reef.jpg",
    type: "image/jpeg",
  } as any);
  formData.append("location", params.location);
  formData.append("date", params.date);
  formData.append("nursery", params.nursery);
  if (params.coral_id !== undefined) {
    formData.append("coral_id", params.coral_id);
  }
  if (params.remarks !== undefined) {
    formData.append("remarks", params.remarks);
  }

  const res = await fetch(`${BASE_URL}/api/bleaching/analyze`, {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type manually — fetch sets the multipart boundary automatically
    headers: authHeaders(token, locationId),
  });

  const raw = await handleResponse<AnalyzeResult>(res);
  return parseAnalyzeResult(raw);
}

/**
 * GET /history
 * Returns all saved analysis records, newest first.
 * The backend wraps records in { filters, count, history: [...] }
 * so we unwrap and return just the array.
 */
export async function fetchHistory(
  token: string,
  locationId: number,
): Promise<HistoryRecord[]> {
  const res = await fetch(`${BASE_URL}/api/bleaching/history`, {
    headers: authHeaders(token, locationId),
  });
  const data = await handleResponse<HistoryResponse>(res);
  // Guard: always return an array regardless of unexpected response shapes.
  // Also coerce pg's string numerics → JS numbers.
  const rows = Array.isArray(data.history) ? data.history : [];
  return rows.map(parseNumericFields);
}
