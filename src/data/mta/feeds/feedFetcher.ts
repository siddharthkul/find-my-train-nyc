import { Buffer } from 'buffer';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { FeedId } from '../types';

// ── Constants ──────────────────────────────────────────────────────

const FEED_BASE = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds';
const DEFAULT_CACHE_TTL_MS = 10_000;
const RETRY_DELAY_MS = 2_000;
const MAX_RETRIES = 1;

// ── Cache ──────────────────────────────────────────────────────────

type CacheEntry = {
  message: transit_realtime.FeedMessage;
  fetchedAt: number;
};

const cache = new Map<FeedId, CacheEntry>();

/**
 * Clear the feed cache — useful for testing or forced refresh.
 */
export function clearFeedCache(): void {
  cache.clear();
}

/**
 * Clear a single feed from the cache.
 */
export function invalidateFeed(feedId: FeedId): void {
  cache.delete(feedId);
}

// ── API key ────────────────────────────────────────────────────────

function getApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_MTA_API_KEY ?? undefined;
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

// ── Fetch implementation ───────────────────────────────────────────

async function fetchAndDecode(
  feedId: FeedId,
  signal?: AbortSignal,
): Promise<transit_realtime.FeedMessage> {
  const apiKey = getApiKey();
  const headers: HeadersInit = apiKey ? { 'x-api-key': apiKey } : {};

  const response = await fetch(`${FEED_BASE}/${feedId}`, {
    headers,
    signal,
  });

  if (!response.ok) {
    throw new Error(`MTA feed ${feedId} failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const byteBuffer = Buffer.from(arrayBuffer);
  return transit_realtime.FeedMessage.decode(byteBuffer) as transit_realtime.FeedMessage;
}

async function fetchWithRetry(
  feedId: FeedId,
  signal?: AbortSignal,
  retries = MAX_RETRIES,
): Promise<transit_realtime.FeedMessage> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchAndDecode(feedId, signal);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry if the request was aborted
      if (signal?.aborted) throw lastError;

      // Wait before retrying
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch feed ${feedId}`);
}

// ── Public API ─────────────────────────────────────────────────────

export type FetchFeedOptions = {
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Cache TTL in milliseconds. Set to 0 to bypass cache. Default: 10s */
  cacheTtlMs?: number;
  /** Skip retries. Default: false */
  noRetry?: boolean;
};

/**
 * Fetches and decodes a single MTA GTFS-RT feed.
 *
 * - Serves from a TTL-based in-memory cache when fresh
 * - Retries once with exponential backoff on failure
 * - Supports AbortController cancellation
 *
 * @returns The decoded FeedMessage (contains vehicle, trip_update, and alert entities)
 */
export async function fetchFeed(
  feedId: FeedId,
  options: FetchFeedOptions = {},
): Promise<transit_realtime.FeedMessage> {
  const { signal, cacheTtlMs = DEFAULT_CACHE_TTL_MS, noRetry = false } = options;

  // Check cache
  if (cacheTtlMs > 0) {
    const entry = cache.get(feedId);
    if (entry && Date.now() - entry.fetchedAt < cacheTtlMs) {
      return entry.message;
    }
  }

  const message = noRetry
    ? await fetchAndDecode(feedId, signal)
    : await fetchWithRetry(feedId, signal);

  // Update cache
  cache.set(feedId, { message, fetchedAt: Date.now() });

  return message;
}

/**
 * Fetches multiple feeds in parallel using `Promise.allSettled`.
 *
 * @returns An object with the successfully decoded messages and any errors.
 */
export async function fetchFeeds(
  feedIds: FeedId[],
  options: FetchFeedOptions = {},
): Promise<{
  results: Map<FeedId, transit_realtime.FeedMessage>;
  errors: Map<FeedId, Error>;
}> {
  const settled = await Promise.allSettled(
    feedIds.map(async (feedId) => {
      const message = await fetchFeed(feedId, options);
      return { feedId, message };
    }),
  );

  const results = new Map<FeedId, transit_realtime.FeedMessage>();
  const errors = new Map<FeedId, Error>();

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.set(result.value.feedId, result.value.message);
    } else {
      // Extract feedId from the error context — settled doesn't track it,
      // so we match by index.
      const idx = settled.indexOf(result);
      const feedId = feedIds[idx];
      const err = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
      if (feedId) errors.set(feedId, err);
    }
  }

  return { results, errors };
}
