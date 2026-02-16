// ── Cardinal direction ──────────────────────────────────────────────

export type CardinalDirection = 'N' | 'S' | 'E' | 'W' | 'UNK';

// ── Feed identifiers ───────────────────────────────────────────────

/**
 * Each value maps to a distinct MTA GTFS-RT endpoint.
 * Multiple subway routes share a single feed.
 */
export enum FeedId {
  /** 1, 2, 3, 4, 5, 6, 6X, 7, 7X, S (42nd St Shuttle) */
  Default = 'nyct%2Fgtfs',
  /** A, C, E, H (Rockaway Shuttle) */
  ACE = 'nyct%2Fgtfs-ace',
  /** B, D, F, M */
  BDFM = 'nyct%2Fgtfs-bdfm',
  /** G */
  G = 'nyct%2Fgtfs-g',
  /** J, Z */
  JZ = 'nyct%2Fgtfs-jz',
  /** L */
  L = 'nyct%2Fgtfs-l',
  /** N, Q, R, W */
  NQRW = 'nyct%2Fgtfs-nqrw',
  /** Staten Island Railway */
  SI = 'nyct%2Fgtfs-si',
}

// ── Subway route IDs ───────────────────────────────────────────────

export type SubwayLine =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '6X'
  | '7'
  | '7X'
  | 'A'
  | 'C'
  | 'E'
  | 'B'
  | 'D'
  | 'F'
  | 'M'
  | 'G'
  | 'J'
  | 'Z'
  | 'L'
  | 'N'
  | 'Q'
  | 'R'
  | 'W'
  | 'S'
  | 'H'
  | 'FS'
  | 'GS'
  | 'SI';

// ── Vehicle position (renamed from Train) ──────────────────────────

export type VehiclePosition = {
  id: string;
  routeId: string;
  latitude: number;
  longitude: number;
  bearing: number;
  direction: CardinalDirection;
  tripId: string | null;
  /** GTFS stop ID the train is currently at (e.g. "142S") */
  currentStopId: string | null;
  lastUpdatedMs: number;
};

/**
 * Backward-compatible alias.  Existing components import `Train`
 * — this keeps them working without changes.
 */
export type Train = VehiclePosition;

// ── Arrival predictions ────────────────────────────────────────────

export type ArrivalPrediction = {
  /** Unique ID derived from trip + stop */
  id: string;
  routeId: string;
  tripId: string;
  /** GTFS stop ID (e.g. "A15N") */
  stopId: string;
  /** Direction of the trip */
  direction: CardinalDirection;
  /** Predicted arrival as Unix timestamp (seconds) */
  arrivalTime: number;
  /** Predicted departure as Unix timestamp (seconds) */
  departureTime: number;
  /** Delay in seconds (positive = late, 0 = on time) */
  delay: number;
};

// ── Service alerts ─────────────────────────────────────────────────

export type AlertActivePeriod = {
  startTime: number | null;
  endTime: number | null;
};

export type ServiceAlert = {
  id: string;
  /** Route IDs affected by this alert */
  routeIds: string[];
  /** Short header / title */
  header: string;
  /** Longer description (may be empty) */
  description: string;
  /** When this alert is active */
  activePeriods: AlertActivePeriod[];
};

// ── Aggregated snapshot ────────────────────────────────────────────

export type SubwaySnapshot = {
  vehicles: VehiclePosition[];
  arrivals: ArrivalPrediction[];
  alerts: ServiceAlert[];
};

// ── Feed mode ──────────────────────────────────────────────────────

export type FeedMode = 'live' | 'mock';

// ── Service interface ──────────────────────────────────────────────

/**
 * Provider-agnostic interface for subway data.
 * The MTA GTFS-RT implementation lives in `services/mtaSubwayService.ts`.
 * A future MTAPI-based or test implementation can follow the same contract.
 */
export interface SubwayService {
  /** Fetch current vehicle positions, optionally filtered by route. */
  fetchVehicles(routes?: string[]): Promise<VehiclePosition[]>;

  /** Fetch arrival predictions for a specific station. */
  fetchArrivals(stationId: string): Promise<ArrivalPrediction[]>;

  /** Fetch active service alerts, optionally filtered by route. */
  fetchAlerts(routes?: string[]): Promise<ServiceAlert[]>;

  /** Fetch everything in one pass (more efficient — single feed decode). */
  fetchAll(routes?: string[]): Promise<SubwaySnapshot>;
}
