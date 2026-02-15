import { transit_realtime } from 'gtfs-realtime-bindings';
import { fetchFeeds } from '../feeds/feedFetcher';
import type { FetchFeedOptions } from '../feeds/feedFetcher';
import { ALL_FEEDS, getFeedsForRoutes } from '../feeds/feedRegistry';
import { filterAlertsForRoutes, mapAlerts } from '../mappers/alertMapper';
import {
  filterArrivalsForStation,
  mapTripUpdates,
} from '../mappers/tripUpdateMapper';
import { mapVehiclePositions } from '../mappers/vehicleMapper';
import { getMockTrains } from '../mockTrainFeed';
import type {
  ArrivalPrediction,
  FeedMode,
  ServiceAlert,
  SubwayService,
  SubwaySnapshot,
  VehiclePosition,
} from '../types';
import { FeedId } from '../types';

// ── Helpers ────────────────────────────────────────────────────────

/** Deduplicate vehicles by ID, keeping the last occurrence. */
function deduplicateVehicles(
  vehicles: VehiclePosition[],
): VehiclePosition[] {
  const map = new Map<string, VehiclePosition>();
  for (const v of vehicles) {
    map.set(v.id, v);
  }
  return [...map.values()];
}

/** Collect all decoded messages into a flat entity list. */
function collectMessages(
  results: Map<FeedId, transit_realtime.FeedMessage>,
): transit_realtime.IFeedMessage {
  const entities: transit_realtime.IFeedEntity[] = [];
  for (const msg of results.values()) {
    entities.push(...(msg.entity ?? []));
  }
  return { entity: entities } as transit_realtime.IFeedMessage;
}

// ── Service implementation ─────────────────────────────────────────

/**
 * MTA GTFS-RT implementation of `SubwayService`.
 *
 * Fetches data directly from the MTA's open protobuf feeds (no API key
 * required), decodes, and maps them into domain types.
 *
 * Falls back to mock data only when all live feeds fail (e.g. no
 * network connectivity).
 */
export class MTASubwayService implements SubwayService {
  private fetchOptions: FetchFeedOptions;
  private _lastMode: FeedMode = 'live';

  constructor(options: FetchFeedOptions = {}) {
    this.fetchOptions = options;
  }

  /** Returns the mode from the last fetch (`'live'` or `'mock'`). */
  get mode(): FeedMode {
    return this._lastMode;
  }

  // ── SubwayService interface ────────────────────────────────────

  async fetchVehicles(routes?: string[]): Promise<VehiclePosition[]> {
    const feedIds = getFeedsForRoutes(routes);
    const { results, errors } = await fetchFeeds(feedIds, this.fetchOptions);

    // Fall back to mock data if every feed failed
    if (results.size === 0) {
      console.warn(
        'All MTA feeds failed, using mock data:',
        [...errors.values()].map((e) => e.message).join(' | '),
      );
      this._lastMode = 'mock';
      return getMockTrains();
    }

    this._lastMode = 'live';

    let vehicles: VehiclePosition[] = [];
    for (const msg of results.values()) {
      vehicles.push(...mapVehiclePositions(msg));
    }

    vehicles = deduplicateVehicles(vehicles);

    // Filter by requested routes if specified
    if (routes && routes.length > 0) {
      const routeSet = new Set(routes.map((r) => r.toUpperCase()));
      vehicles = vehicles.filter((v) => routeSet.has(v.routeId));
    }

    return vehicles;
  }

  async fetchArrivals(stationId: string): Promise<ArrivalPrediction[]> {
    const { results } = await fetchFeeds(ALL_FEEDS, this.fetchOptions);
    if (results.size === 0) return [];

    const merged = collectMessages(results);
    const allPredictions = mapTripUpdates(merged);
    return filterArrivalsForStation(allPredictions, stationId);
  }

  async fetchAlerts(routes?: string[]): Promise<ServiceAlert[]> {
    const { results } = await fetchFeeds(ALL_FEEDS, this.fetchOptions);
    if (results.size === 0) return [];

    const merged = collectMessages(results);
    const allAlerts = mapAlerts(merged);
    return filterAlertsForRoutes(allAlerts, routes);
  }

  async fetchAll(routes?: string[]): Promise<SubwaySnapshot> {
    const feedIds = getFeedsForRoutes(routes);
    const { results, errors } = await fetchFeeds(feedIds, this.fetchOptions);

    // Fall back to mock data if every feed failed
    if (results.size === 0) {
      console.warn(
        'All MTA feeds failed, using mock data:',
        [...errors.values()].map((e) => e.message).join(' | '),
      );
      this._lastMode = 'mock';
      return {
        vehicles: getMockTrains(),
        arrivals: [],
        alerts: [],
      };
    }

    this._lastMode = 'live';
    const merged = collectMessages(results);

    let vehicles = deduplicateVehicles(mapVehiclePositions(merged));
    const arrivals = mapTripUpdates(merged);
    const alerts = mapAlerts(merged);

    if (routes && routes.length > 0) {
      const routeSet = new Set(routes.map((r) => r.toUpperCase()));
      vehicles = vehicles.filter((v) => routeSet.has(v.routeId));
    }

    return {
      vehicles,
      arrivals,
      alerts: filterAlertsForRoutes(alerts, routes),
    };
  }
}

// ── Default singleton ──────────────────────────────────────────────

/**
 * Shared service instance used by hooks and stores.
 * Import this rather than constructing your own unless you need
 * custom fetch options (e.g. different cache TTL for tests).
 */
export const subwayService = new MTASubwayService();
