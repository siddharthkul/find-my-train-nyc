import { transit_realtime } from 'gtfs-realtime-bindings';
import { CardinalDirection, VehiclePosition } from '../types';
import { getStopCoords, StopCoords } from './stopLookup';

// ── Helpers ────────────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Compute the initial compass bearing (0–360°) from point A to point B.
 */
function computeBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = lat1 * DEG_TO_RAD;
  const φ2 = lat2 * DEG_TO_RAD;
  const Δλ = (lon2 - lon1) * DEG_TO_RAD;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

/**
 * Derive a cardinal direction from a bearing angle.
 */
function cardinalFromBearing(bearing: number): CardinalDirection {
  if (bearing >= 315 || bearing < 45) return 'N';
  if (bearing >= 45 && bearing < 135) return 'E';
  if (bearing >= 135 && bearing < 225) return 'S';
  return 'W';
}

/**
 * Extract a fallback cardinal direction from raw feed data.
 * Used only when we can't compute a real bearing.
 */
function fallbackDirection(
  stopId: string | null | undefined,
  tripId: string | null | undefined,
): CardinalDirection {
  if (stopId) {
    const last = stopId.charAt(stopId.length - 1);
    if (last === 'N') return 'N';
    if (last === 'S') return 'S';
  }
  if (tripId) {
    const match = tripId.match(/\.\.([NS])/);
    if (match) return match[1] as CardinalDirection;
  }
  return 'UNK';
}

/**
 * Create a stable vehicle ID.
 */
function createVehicleId(
  entity: transit_realtime.IFeedEntity,
  tripId: string | null,
  stopId: string | null,
): string {
  if (entity.id) return entity.id;
  return `${tripId ?? 'unknown'}-${stopId ?? 'unknown'}`;
}

// ── Public mapper ──────────────────────────────────────────────────

/**
 * Extracts vehicle positions from a decoded GTFS-RT FeedMessage.
 *
 * For each vehicle we:
 *   1. Look up its current stop's coordinates from our station data.
 *   2. Find the matching trip update to determine the *next* stop.
 *   3. Compute the real compass bearing between current → next stop.
 *   4. Derive the cardinal direction (N/S/E/W) from the bearing.
 *
 * For the ~7% of trains at terminals with no next stop, we fall back
 * to the raw N/S from the feed's stop ID suffix.
 *
 * Pure function — no side effects, no network calls.
 */
export function mapVehiclePositions(
  feed: transit_realtime.IFeedMessage,
): VehiclePosition[] {
  const nowMs = Date.now();

  // ── Index trip updates by tripId for fast lookup ──────────────
  const tripUpdates = new Map<string, transit_realtime.ITripUpdate>();
  for (const entity of feed.entity ?? []) {
    const tripId = entity.tripUpdate?.trip?.tripId;
    if (tripId) {
      tripUpdates.set(tripId, entity.tripUpdate!);
    }
  }

  // ── Map vehicles ─────────────────────────────────────────────
  const vehicles: VehiclePosition[] = [];

  for (const entity of feed.entity ?? []) {
    const vehicle = entity.vehicle;
    if (!vehicle) continue;

    const routeId = vehicle.trip?.routeId?.toUpperCase();
    if (!routeId) continue;

    const stopId = vehicle.stopId ?? null;
    if (!stopId) continue;

    const curCoords = getStopCoords(stopId);
    if (!curCoords) continue;

    const tripId = vehicle.trip?.tripId ?? null;

    // Try to compute a real bearing from current → next stop
    let bearing: number | null = null;
    let nextCoords: StopCoords | undefined;

    if (tripId) {
      const tu = tripUpdates.get(tripId);
      if (tu?.stopTimeUpdate) {
        const stops = tu.stopTimeUpdate;
        const curIdx = stops.findIndex((s) => s.stopId === stopId);
        if (curIdx !== -1 && curIdx < stops.length - 1) {
          const nextStopId = stops[curIdx + 1].stopId;
          if (nextStopId) {
            nextCoords = getStopCoords(nextStopId);
          }
        }
      }
    }

    if (nextCoords) {
      bearing = computeBearing(
        curCoords.lat,
        curCoords.lng,
        nextCoords.lat,
        nextCoords.lng,
      );
    }

    // Determine direction — from real bearing when available, else fallback
    let direction: CardinalDirection;
    if (bearing !== null) {
      direction = cardinalFromBearing(bearing);
    } else {
      direction = fallbackDirection(stopId, tripId);
      // Assign a coarse bearing for the fallback
      if (direction === 'N') bearing = 0;
      else if (direction === 'S') bearing = 180;
      else if (direction === 'E') bearing = 90;
      else if (direction === 'W') bearing = 270;
      else bearing = 0;
    }

    vehicles.push({
      id: createVehicleId(entity, tripId, stopId),
      routeId,
      latitude: curCoords.lat,
      longitude: curCoords.lng,
      bearing,
      direction,
      tripId,
      currentStopId: stopId,
      lastUpdatedMs: nowMs,
    });
  }

  return vehicles;
}
