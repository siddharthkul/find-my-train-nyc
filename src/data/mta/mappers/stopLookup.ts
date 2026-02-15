/**
 * Maps GTFS stop IDs (e.g. "142S", "A15N") to their coordinates
 * by stripping the directional suffix (N/S) to match our station data.
 *
 * Built lazily on first access — no startup cost if never used.
 */

import { subwayStations } from '../subwayStations';

export type StopCoords = { lat: number; lng: number };

let _lookup: Map<string, StopCoords> | null = null;

/**
 * Get the stop lookup map.  Lazily constructed on first call.
 * Keys are the parent station IDs (e.g. "142", "A15").
 */
function getLookup(): Map<string, StopCoords> {
  if (_lookup) return _lookup;

  _lookup = new Map<string, StopCoords>();
  for (const station of subwayStations) {
    _lookup.set(station.id, { lat: station.lat, lng: station.lng });
  }
  return _lookup;
}

/**
 * Strip the directional suffix (N/S) from a GTFS stop ID to get
 * the parent station ID.
 *
 * Examples:
 *   "142S"  → "142"
 *   "A15N"  → "A15"
 *   "R20S"  → "R20"
 *   "S01N"  → "S01"   (SIR stations start with S)
 */
export function parentStationId(stopId: string): string {
  return stopId.replace(/[NS]$/, '');
}

/**
 * Look up coordinates for a GTFS stop ID.
 * Handles both raw parent IDs ("142") and directional IDs ("142S").
 * Returns `undefined` if the stop is not in our station data.
 */
export function getStopCoords(stopId: string): StopCoords | undefined {
  const lookup = getLookup();
  // Try exact match first (handles parent IDs), then strip suffix
  return lookup.get(stopId) ?? lookup.get(parentStationId(stopId));
}
