import * as ImageManipulator from "expo-image-manipulator";

// Base URL
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

/** Resize an image so neither dimension exceeds maxPx, keeping aspect ratio.
 *  Returns the URI of the resized image (JPEG, quality 0.82). */
async function resizeForUpload(
  uri: string,
  maxPx = 1500,
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxPx } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

function authHeaders(
  token: string,
  locationId: number,
): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "X-Location-ID": String(locationId),
  };
}

// Types

export interface AnalyzedCoral {
  coral_id: string;
  species: string;
  area_cm2: number;
  confidence: number;
  cnn_feed_image?: string;
  /** [x, y] centroid in original image pixels — returned by updated HF app */
  centroid?: [number, number];
}

export interface AnalyzeResult {
  corals: AnalyzedCoral[];
  annotatedImage: string | null;
  enhancedImage: string | null;
  /** [width, height] of original image — returned by updated HF app */
  imageSize?: [number, number];
  /** GPS extracted server-side from JPEG EXIF — reliable on all platforms */
  imageLatitude: number | null;
  imageLongitude: number | null;
}

export interface AnalyzeResponse {
  status?: string;
  detections?: any[];
  enhanced_image?: string;
  annotated_image?: string;
  image_size?: [number, number];
  predictions?: AnalyzedCoral[];
  coral_id?: string;
  species?: string;
  area_cm2?: number;
  confidence?: number;
  cnn_feed_image?: string;
  /** GPS extracted server-side from JPEG EXIF */
  image_latitude?: number | null;
  image_longitude?: number | null;
}

export interface CoralRecord {
  id: number;
  coral_id: string;
  species: string;
  area_cm2: number;
  confidence: number;
  cnn_feed_image?: string;
  recorded_at: string;
  growth_cm2?: number;
  latitude?: number | null;
  longitude?: number | null;
  remarks?: string | null;
  image_url?: string | null;
}

export interface CoralSummary {
  coral_id: string;
  species: string;
  latest_area: number;
  last_recorded: string;
  record_count: number;
}

// POST /api/growth/extract-gps
// Uploads the ORIGINAL (un-resized) image to extract GPS from raw JPEG EXIF.
// Must be called BEFORE resizing, because expo-image-manipulator strips EXIF.

async function extractGpsFromOriginal(
  originalUri: string,
  token: string,
  locationId: number,
): Promise<{ latitude: number | null; longitude: number | null }> {
  try {
    const gpsForm = new FormData();
    // @ts-ignore — React Native FormData file object
    gpsForm.append("file", { uri: originalUri, name: "original.jpg", type: "image/jpeg" });
    const gpsRes = await fetch(`${BASE_URL}/api/growth/extract-gps`, {
      method: "POST",
      body: gpsForm,
      headers: authHeaders(token, locationId),
    });
    if (!gpsRes.ok) return { latitude: null, longitude: null };
    const gpsData = await gpsRes.json();
    const lat = gpsData.latitude != null ? Number(gpsData.latitude) : null;
    const lon = gpsData.longitude != null ? Number(gpsData.longitude) : null;
    console.log("[Growth/GPS] server-extracted from original EXIF:", lat, lon);
    return { latitude: lat, longitude: lon };
  } catch (e) {
    console.warn("[Growth/GPS] extract-gps failed:", e);
    return { latitude: null, longitude: null };
  }
}

// POST /api/growth/analyze

export async function analyzeImage(
  imageUri: string,
  token: string,
  locationId: number,
): Promise<AnalyzeResult> {
  console.log("[Growth] original URI:", imageUri);

  // Step 1: Extract GPS from the ORIGINAL image bytes BEFORE any resize.
  // expo-image-manipulator re-encodes the JPEG and strips all EXIF (including GPS),
  // so we must send the untouched original to the backend for EXIF extraction.
  // This is the same approach used by the bleaching component.
  const { latitude: imageLatitude, longitude: imageLongitude } =
    await extractGpsFromOriginal(imageUri, token, locationId);

  // Step 2: Resize to max 1500px wide before uploading to HF — keeps the
  // response manageable and avoids OOM errors on large iPhone photos.
  const uploadUri = await resizeForUpload(imageUri, 1500);
  console.log("[Growth] resized URI:", uploadUri);

  const formData = new FormData();
  const filename = "coral.jpg";
  // @ts-ignore
  formData.append("file", { uri: uploadUri, name: filename, type: "image/jpeg" });

  console.log("[Growth] sending to:", `${BASE_URL}/api/growth/analyze`);
  const res = await fetch(`${BASE_URL}/api/growth/analyze`, {
    method: "POST",
    body: formData,
    headers: authHeaders(token, locationId),
  });

  console.log("[Growth] response status:", res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[Growth] error body:", JSON.stringify(err));
    throw new Error(err.error ?? `Server error ${res.status}`);
  }

  const data: AnalyzeResponse = await res.json();

  let corals: AnalyzedCoral[] = [];

  if (data.detections && Array.isArray(data.detections)) {
    corals = data.detections.map((d: any, i: number) => ({
      coral_id: d.coral_id ?? `coral_${d.id ?? i + 1}`,
      species: d.species,
      area_cm2: d.area_cm2,
      confidence: d.confidence,
      cnn_feed_image: d.cnn_feed_image,
      centroid: Array.isArray(d.centroid)
        ? (d.centroid as [number, number])
        : undefined,
    }));
  } else if (data.predictions && Array.isArray(data.predictions)) {
    corals = data.predictions;
  } else if (data.species && data.area_cm2 != null) {
    corals = [
      {
        coral_id: data.coral_id ?? `coral_${Date.now()}`,
        species: data.species,
        area_cm2: data.area_cm2,
        confidence: data.confidence ?? 0,
        cnn_feed_image: data.cnn_feed_image,
      },
    ];
  }

  return {
    corals,
    annotatedImage: data.annotated_image ?? null,
    enhancedImage: data.enhanced_image ?? null,
    imageSize: Array.isArray(data.image_size) ? data.image_size : undefined,
    // Use GPS extracted from the original JPEG (before resize stripped it)
    imageLatitude,
    imageLongitude,
  };
}

//  POST /api/growth/records

export async function saveGrowthRecord(
  payload: {
    coral_id: string;
    species: string;
    area_cm2: number;
    confidence?: number;
    cnn_feed_image?: string;
    nursery_id?: number;
    latitude?: number | null;
    longitude?: number | null;
    remarks?: string | null;
  },
  token: string,
  locationId: number,
) {
  const res = await fetch(`${BASE_URL}/api/growth/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token, locationId),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Server error ${res.status}`);
  }

  return res.json();
}

// GET /api/growth/records

export async function getAllCoralSummaries(
  token: string,
  locationId: number,
): Promise<CoralSummary[]> {
  const res = await fetch(`${BASE_URL}/api/growth/records`, {
    headers: authHeaders(token, locationId),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return data.corals ?? [];
}

// DELETE /api/growth/records/entry/:recordId

export async function deleteCoralRecord(
  recordId: number,
  token: string,
  locationId: number,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/growth/records/entry/${recordId}`, {
    method: "DELETE",
    headers: authHeaders(token, locationId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Server error ${res.status}`);
  }
}

// DELETE /api/growth/records/:coralId

export async function deleteCoral(
  coralId: string,
  token: string,
  locationId: number,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/growth/records/${encodeURIComponent(coralId)}`,
    { method: "DELETE", headers: authHeaders(token, locationId) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Server error ${res.status}`);
  }
}

// GET /api/growth/records/:coralId

export async function getCoralHistory(
  coralId: string,
  token: string,
  locationId: number,
): Promise<CoralRecord[]> {
  const res = await fetch(
    `${BASE_URL}/api/growth/records/${encodeURIComponent(coralId)}`,
    { headers: authHeaders(token, locationId) },
  );
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return data.records ?? [];
}
