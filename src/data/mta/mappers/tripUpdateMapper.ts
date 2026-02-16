import { transit_realtime } from 'gtfs-realtime-bindings';
import { ArrivalPrediction, CardinalDirection } from '../types';

// ── Helpers ────────────────────────────────────────────────────────

function toSeconds(value: number | object | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  // gtfs-realtime-bindings may return Long objects for timestamps
  if (typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    return (value as { toNumber(): number }).toNumber();
  }
  return 0;
}

function extractDirection(tripId: string | null | undefined): CardinalDirection {
  const token = tripId?.split('_').pop();
  if (token === 'N') return 'N';
  if (token === 'S') return 'S';
  return 'UNK';
}

// ── Public mapper ──────────────────────────────────────────────────

/**
 * Extracts arrival predictions from TripUpdate entities in a
 * decoded GTFS-RT FeedMessage.
 *
 * Each `StopTimeUpdate` in a trip produces one `ArrivalPrediction`.
 * Only entries with a future arrival time are included.
 */
export function mapTripUpdates(feed: transit_realtime.IFeedMessage): ArrivalPrediction[] {
  const nowSec = Math.floor(Date.now() / 1000);
  const predictions: ArrivalPrediction[] = [];

  for (const entity of feed.entity ?? []) {
    const tripUpdate = entity.tripUpdate;
    if (!tripUpdate) continue;

    const routeId = tripUpdate.trip?.routeId?.toUpperCase();
    const tripId = tripUpdate.trip?.tripId ?? '';
    if (!routeId) continue;

    const direction = extractDirection(tripId);

    for (const stopTime of tripUpdate.stopTimeUpdate ?? []) {
      const stopId = stopTime.stopId;
      if (!stopId) continue;

      const arrivalTime = toSeconds(stopTime.arrival?.time);
      const departureTime = toSeconds(stopTime.departure?.time);

      // Use whichever timestamp is available
      const effectiveArrival = arrivalTime || departureTime;
      if (!effectiveArrival || effectiveArrival < nowSec) continue;

      const delay = toSeconds(stopTime.arrival?.delay);

      predictions.push({
        id: `${tripId}-${stopId}`,
        routeId,
        tripId,
        stopId,
        direction,
        arrivalTime: effectiveArrival,
        departureTime: departureTime || effectiveArrival,
        delay,
      });
    }
  }

  return predictions;
}

/**
 * Filters arrival predictions for a specific station.
 *
 * MTA stop IDs include a direction suffix (e.g. "A15N", "A15S").
 * This function matches by the base stop ID (without the trailing
 * N/S) so both directions are returned.
 */
export function filterArrivalsForStation(
  predictions: ArrivalPrediction[],
  stationStopId: string,
): ArrivalPrediction[] {
  const baseId = stationStopId.replace(/[NS]$/, '');
  return predictions
    .filter((p) => p.stopId.replace(/[NS]$/, '') === baseId)
    .sort((a, b) => a.arrivalTime - b.arrivalTime);
}
