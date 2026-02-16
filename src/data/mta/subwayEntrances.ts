// ── Subway entrance data from MTA Open Data ────────────────────────
// Source: https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja

export type SubwayEntrance = {
  lat: number;
  lng: number;
  entranceType: 'Stair' | 'Elevator' | 'Escalator' | 'Door' | 'Easement' | string;
  entry: boolean;
  exit: boolean;
};

// ── In-memory cache ────────────────────────────────────────────────

/** complex_id → entrances */
let complexEntrances: Map<string, SubwayEntrance[]> | null = null;
/** gtfs_stop_id → complex_id */
let stopToComplex: Map<string, string> | null = null;
/** Singleton fetch promise */
let fetchPromise: Promise<void> | null = null;

const SODA_URL =
  'https://data.ny.gov/resource/i9wp-a4ja.json?$limit=50000&$select=gtfs_stop_id,complex_id,entrance_type,entry_allowed,exit_allowed,entrance_latitude,entrance_longitude';

type SodaRow = {
  gtfs_stop_id?: string;
  complex_id?: string;
  entrance_type?: string;
  entry_allowed?: string;
  exit_allowed?: string;
  entrance_latitude?: string;
  entrance_longitude?: string;
};

async function loadEntrances(): Promise<void> {
  try {
    const resp = await fetch(SODA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rows: SodaRow[] = await resp.json();

    const cMap = new Map<string, SubwayEntrance[]>();
    const sMap = new Map<string, string>();

    for (const row of rows) {
      const lat = parseFloat(row.entrance_latitude ?? '');
      const lng = parseFloat(row.entrance_longitude ?? '');
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

      const complexId = row.complex_id ?? '';
      const stopId = row.gtfs_stop_id ?? '';

      if (stopId && complexId) {
        sMap.set(stopId, complexId);
      }

      const entrance: SubwayEntrance = {
        lat,
        lng,
        entranceType: row.entrance_type ?? 'Stair',
        entry: row.entry_allowed === 'YES',
        exit: row.exit_allowed === 'YES',
      };

      const list = cMap.get(complexId);
      if (list) {
        list.push(entrance);
      } else {
        cMap.set(complexId, [entrance]);
      }
    }

    complexEntrances = cMap;
    stopToComplex = sMap;
  } catch (err) {
    console.warn('[SubwayEntrances] Failed to load entrance data:', err);
    // Set empty maps so we don't retry on every call
    complexEntrances = new Map();
    stopToComplex = new Map();
  }
}

/**
 * Ensures entrance data is loaded (fetches once, caches in memory).
 * Safe to call multiple times — deduplicates the fetch.
 */
export async function ensureEntrancesLoaded(): Promise<void> {
  if (complexEntrances && stopToComplex) return;
  if (!fetchPromise) {
    fetchPromise = loadEntrances();
  }
  await fetchPromise;
}

/**
 * Returns all subway entrances for a given station ID.
 * Groups by `complex_id` so that a complex like Times Sq returns all
 * entrances even when queried by a single platform's stop ID.
 *
 * Must call `ensureEntrancesLoaded()` first.
 */
export function getEntrancesForStation(stationId: string): SubwayEntrance[] {
  if (!complexEntrances || !stopToComplex) return [];
  const complexId = stopToComplex.get(stationId);
  if (!complexId) return [];
  return complexEntrances.get(complexId) ?? [];
}

/** Returns true once entrance data has been fetched. */
export function isEntranceDataReady(): boolean {
  return complexEntrances !== null;
}
