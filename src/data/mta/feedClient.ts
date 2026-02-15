import { Buffer } from 'buffer';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { Train } from '../../types/train';
import { getMockTrains } from './mockTrainFeed';
import { mapFeedToTrains } from './trainMapper';

const FEED_BASE = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds';
const FEED_PATHS = [
  'nyct%2Fgtfs',
  'nyct%2Fgtfs-ace',
  'nyct%2Fgtfs-bdfm',
  'nyct%2Fgtfs-g',
  'nyct%2Fgtfs-jz',
  'nyct%2Fgtfs-l',
  'nyct%2Fgtfs-nqrw',
  'nyct%2Fgtfs-si',
];

function buildHeaders(): HeadersInit | undefined {
  const apiKey = process.env.EXPO_PUBLIC_MTA_API_KEY;
  if (!apiKey) {
    return undefined;
  }

  return { 'x-api-key': apiKey };
}

export type FeedMode = 'live' | 'mock';

export type FeedResult = {
  trains: Train[];
  mode: FeedMode;
};

async function fetchSingleFeed(path: string): Promise<Train[]> {
  const response = await fetch(`${FEED_BASE}/${path}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`MTA feed request failed (${response.status}) for ${path}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const byteBuffer = Buffer.from(arrayBuffer);
  const decoded = transit_realtime.FeedMessage.decode(byteBuffer);
  return mapFeedToTrains(decoded);
}

export async function fetchLiveTrains(): Promise<FeedResult> {
  const apiKey = process.env.EXPO_PUBLIC_MTA_API_KEY;
  if (!apiKey) {
    return {
      trains: getMockTrains(),
      mode: 'mock',
    };
  }

  const settled = await Promise.allSettled(FEED_PATHS.map(fetchSingleFeed));

  const trains: Train[] = [];
  let successCount = 0;
  const errorMessages: string[] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      successCount += 1;
      trains.push(...result.value);
    } else {
      errorMessages.push(result.reason?.message ?? 'Unknown feed failure');
    }
  }

  if (successCount === 0) {
    throw new Error(
      `All MTA feeds failed. ${errorMessages.join(' | ') || 'Set EXPO_PUBLIC_MTA_API_KEY.'}`,
    );
  }

  const unique = new Map<string, Train>();
  for (const train of trains) {
    unique.set(train.id, train);
  }
  return {
    trains: [...unique.values()],
    mode: 'live',
  };
}
