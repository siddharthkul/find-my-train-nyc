import type { Train } from './types';

const SEED_TRAINS: Array<Pick<Train, 'id' | 'routeId' | 'latitude' | 'longitude' | 'bearing'>> = [
  { id: 'mock-A-1', routeId: 'A', latitude: 40.7502, longitude: -73.9934, bearing: 190 },
  { id: 'mock-7-1', routeId: '7', latitude: 40.7528, longitude: -73.9772, bearing: 92 },
  { id: 'mock-Q-1', routeId: 'Q', latitude: 40.7348, longitude: -73.9901, bearing: 15 },
  { id: 'mock-4-1', routeId: '4', latitude: 40.7053, longitude: -74.0139, bearing: 10 },
  { id: 'mock-L-1', routeId: 'L', latitude: 40.7323, longitude: -73.9546, bearing: 265 },
  { id: 'mock-F-1', routeId: 'F', latitude: 40.7212, longitude: -73.9984, bearing: 38 },
];

function wrapBearing(nextBearing: number): number {
  const normalized = nextBearing % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function jitter(base: number, amount: number): number {
  return base + (Math.random() - 0.5) * amount;
}

export function getMockTrains(): Train[] {
  const now = Date.now();
  return SEED_TRAINS.map((seed) => {
    const nextBearing = wrapBearing(seed.bearing + (Math.random() - 0.5) * 16);
    return {
      id: seed.id,
      routeId: seed.routeId,
      latitude: jitter(seed.latitude, 0.0045),
      longitude: jitter(seed.longitude, 0.0045),
      bearing: nextBearing,
      direction:
        nextBearing < 90 || nextBearing >= 315
          ? 'N'
          : nextBearing < 180
            ? 'E'
            : nextBearing < 270
              ? 'S'
              : 'W',
      tripId: null,
      currentStopId: null,
      lastUpdatedMs: now,
    };
  });
}
