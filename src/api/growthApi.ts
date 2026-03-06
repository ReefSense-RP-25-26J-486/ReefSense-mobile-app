//  Base URL
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

// Types
export interface AnalyzedCoral {
  coral_id: string;
  species: string;
  area_cm2: number;
  confidence: number;
  cnn_feed_image?: string;
}

export interface AnalyzeResult {
  corals: AnalyzedCoral[];
  annotatedImage: string | null;
  enhancedImage: string | null;
}

export interface AnalyzeResponse {
  // Actual HuggingFace space format
  status?: string;
  detections?: any[];
  enhanced_image?: string;
  annotated_image?: string;
  // predictions array format
  predictions?: AnalyzedCoral[];
  // flat object fallback
  coral_id?: string;
  species?: string;
  area_cm2?: number;
  confidence?: number;
  cnn_feed_image?: string;
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
}

export interface CoralSummary {
  coral_id: string;
  species: string;
  latest_area: number;
  last_recorded: string;
  record_count: number;
}

// POST /api/growth/analyze
export async function analyzeImage(imageUri: string): Promise<AnalyzeResult> {
  const formData = new FormData();

  const filename = imageUri.split("/").pop() ?? "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  // @ts-ignore
  formData.append("file", { uri: imageUri, name: filename, type });

  const res = await fetch(`${BASE_URL}/api/growth/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Server error ${res.status}`);
  }

  const data: AnalyzeResponse = await res.json();

  let corals: AnalyzedCoral[] = [];

  // Actual HuggingFace space format: { status, detections: [...], enhanced_image, annotated_image }
  if (data.detections && Array.isArray(data.detections)) {
    corals = data.detections.map((d: any) => ({
      coral_id: d.coral_id ?? `coral_${d.id ?? Date.now()}`,
      species: d.species,
      area_cm2: d.area_cm2,
      confidence: d.confidence,
      cnn_feed_image: d.cnn_feed_image,
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
  };
}

// POST /api/growth/records
export async function saveGrowthRecord(payload: {
  coral_id: string;
  species: string;
  area_cm2: number;
  confidence?: number;
  cnn_feed_image?: string;
}) {
  const res = await fetch(`${BASE_URL}/api/growth/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Server error ${res.status}`);
  }

  return res.json();
}

// GET /api/growth/records
export async function getAllCoralSummaries(): Promise<CoralSummary[]> {
  const res = await fetch(`${BASE_URL}/api/growth/records`);
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return data.corals ?? [];
}

// DELETE /api/growth/records/entry/:recordId  (single record)
export async function deleteCoralRecord(recordId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/growth/records/entry/${recordId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Server error ${res.status}`);
  }
}

// DELETE /api/growth/records/:coralId  (entire coral + all records)
export async function deleteCoral(coralId: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/growth/records/${encodeURIComponent(coralId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Server error ${res.status}`);
  }
}

// GET /api/growth/records/:coralId
export async function getCoralHistory(coralId: string): Promise<CoralRecord[]> {
  const res = await fetch(
    `${BASE_URL}/api/growth/records/${encodeURIComponent(coralId)}`,
  );
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return data.records ?? [];
}
