import { FeedId } from '../types';

// ── Route → Feed mapping ───────────────────────────────────────────

const ROUTE_TO_FEED: Record<string, FeedId> = {
  // Default feed: numbered lines + 42nd St Shuttle
  '1': FeedId.Default,
  '2': FeedId.Default,
  '3': FeedId.Default,
  '4': FeedId.Default,
  '5': FeedId.Default,
  '6': FeedId.Default,
  '6X': FeedId.Default,
  '7': FeedId.Default,
  '7X': FeedId.Default,
  S: FeedId.Default,
  GS: FeedId.Default,

  // ACE + Rockaway Shuttle
  A: FeedId.ACE,
  C: FeedId.ACE,
  E: FeedId.ACE,
  H: FeedId.ACE,

  // BDFM
  B: FeedId.BDFM,
  D: FeedId.BDFM,
  F: FeedId.BDFM,
  M: FeedId.BDFM,

  // Single-line feeds
  G: FeedId.G,
  J: FeedId.JZ,
  Z: FeedId.JZ,
  L: FeedId.L,

  // NQRW
  N: FeedId.NQRW,
  Q: FeedId.NQRW,
  R: FeedId.NQRW,
  W: FeedId.NQRW,

  // Staten Island Railway
  SI: FeedId.SI,
  FS: FeedId.SI,
};

/** All available feed IDs. */
export const ALL_FEEDS: FeedId[] = Object.values(FeedId);

/**
 * Returns the feed ID that carries data for the given route.
 * Falls back to `FeedId.Default` for unknown routes.
 */
export function getFeedForRoute(route: string): FeedId {
  return ROUTE_TO_FEED[route.toUpperCase()] ?? FeedId.Default;
}

/**
 * Returns the minimal, deduplicated set of feed IDs needed to cover
 * the given routes.  If `routes` is undefined or empty, returns all feeds.
 *
 * @example
 * getFeedsForRoutes(['A', 'C', '7'])
 * // → [FeedId.ACE, FeedId.Default]   (A and C share ACE, 7 is in Default)
 */
export function getFeedsForRoutes(routes?: string[]): FeedId[] {
  if (!routes || routes.length === 0) {
    return ALL_FEEDS;
  }

  const unique = new Set<FeedId>();
  for (const route of routes) {
    unique.add(getFeedForRoute(route));
  }
  return [...unique];
}

/**
 * Returns all route IDs that are served by the given feed.
 * Useful for filtering results after fetching a feed.
 */
export function getRoutesForFeed(feedId: FeedId): string[] {
  const routes: string[] = [];
  for (const [route, feed] of Object.entries(ROUTE_TO_FEED)) {
    if (feed === feedId) routes.push(route);
  }
  return routes;
}
