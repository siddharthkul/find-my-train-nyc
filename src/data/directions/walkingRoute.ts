// ── Walking route via Valhalla (free, no API key) ──────────────────
// Public endpoint: https://valhalla1.openstreetmap.de
// Better pedestrian routing than OSRM — uses walkways, parks, crosswalks.

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type WalkingRoute = {
  /** Array of coordinates forming the walking polyline */
  coordinates: Coordinate[];
  /** Total distance in meters */
  distanceMeters: number;
  /** Estimated walking time in seconds */
  durationSeconds: number;
};

const VALHALLA_BASE = 'https://valhalla1.openstreetmap.de/route';

/**
 * Fetch a walking route between two points using Valhalla.
 * Returns the polyline coordinates, distance, and estimated duration.
 *
 * No API key required — uses the public OpenStreetMap Valhalla server.
 */
export async function fetchWalkingRoute(from: Coordinate, to: Coordinate): Promise<WalkingRoute> {
  const params = {
    locations: [
      { lat: from.latitude, lon: from.longitude },
      { lat: to.latitude, lon: to.longitude },
    ],
    costing: 'pedestrian',
    units: 'km',
  };

  const url = `${VALHALLA_BASE}?json=${encodeURIComponent(JSON.stringify(params))}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Valhalla request failed: HTTP ${resp.status}`);
  }

  const data = await resp.json();

  if (data.trip?.status !== 0 || !data.trip?.legs?.length) {
    throw new Error(data.trip?.status_message ?? 'No walking route found');
  }

  const leg = data.trip.legs[0];
  const coordinates = decodePolyline6(leg.shape);
  const distanceKm: number = leg.summary.length;
  const durationSec: number = leg.summary.time;

  return {
    coordinates,
    distanceMeters: distanceKm * 1000,
    durationSeconds: durationSec,
  };
}

// ── Valhalla encoded polyline decoder (precision 6) ────────────────

/**
 * Decode a Valhalla-encoded polyline string.
 * Valhalla uses the Google polyline algorithm but with 6 decimal places
 * of precision instead of Google's 5.
 */
function decodePolyline6(encoded: string): Coordinate[] {
  const factor = 1e6;
  const coords: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({
      latitude: lat / factor,
      longitude: lng / factor,
    });
  }

  return coords;
}

/** Format meters into a human-readable distance string. */
export function formatDistance(meters: number): string {
  if (meters < 160) return `${Math.round(meters)} ft`;
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters * 3.281)} ft`;
  return `${miles.toFixed(1)} mi`;
}

/** Format seconds into a human-readable walking time string. */
export function formatWalkTime(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins === 1) return '1 min walk';
  return `${mins} min walk`;
}
