import { transit_realtime } from 'gtfs-realtime-bindings';
import { Train, CardinalDirection } from '../../types/train';

function normalizeBearing(bearing?: number | null): number {
  if (bearing === undefined || bearing === null || Number.isNaN(bearing)) {
    return 0;
  }
  const normalized = bearing % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function cardinalFromBearing(bearing: number): CardinalDirection {
  if (bearing >= 315 || bearing < 45) return 'N';
  if (bearing >= 45 && bearing < 135) return 'E';
  if (bearing >= 135 && bearing < 225) return 'S';
  if (bearing >= 225 && bearing < 315) return 'W';
  return 'UNK';
}

function toNumeric(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractDirection(
  tripId: string | null | undefined,
  bearing: number,
): CardinalDirection {
  const directionToken = tripId?.split('_').pop();
  if (directionToken === 'N') return 'N';
  if (directionToken === 'S') return 'S';

  return cardinalFromBearing(bearing);
}

function createTrainId(
  entity: transit_realtime.IFeedEntity,
  routeId: string,
  latitude: number,
  longitude: number,
): string {
  const roundedLat = latitude.toFixed(4);
  const roundedLon = longitude.toFixed(4);
  return entity.id ?? `${routeId}-${roundedLat}-${roundedLon}`;
}

export function mapFeedToTrains(feed: transit_realtime.IFeedMessage): Train[] {
  const nowMs = Date.now();
  const trains: Train[] = [];

  for (const entity of feed.entity ?? []) {
    const vehicle = entity.vehicle;
    const routeId = vehicle?.trip?.routeId?.toUpperCase();
    const position = vehicle?.position;
    const latStr = position?.latitude?.toString();
    const lonStr = position?.longitude?.toString();
    const latitude = toNumeric(latStr);
    const longitude = toNumeric(lonStr);

    if (!routeId || latitude === undefined || longitude === undefined) {
      continue;
    }

    const bearing = normalizeBearing(toNumeric(position?.bearing?.toString()));
    const direction = extractDirection(vehicle?.trip?.tripId, bearing);

    trains.push({
      id: createTrainId(entity, routeId, latitude, longitude),
      routeId,
      latitude,
      longitude,
      bearing,
      direction,
      lastUpdatedMs: nowMs,
    });
  }

  return trains;
}
