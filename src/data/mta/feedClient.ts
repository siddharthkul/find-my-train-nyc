/**
 * @deprecated  Use `services/mtaSubwayService.ts` instead.
 *
 * This file is a backward-compatible shim so existing imports
 * continue to work during migration.
 */
import { subwayService } from './services/mtaSubwayService';
import type { FeedMode, Train } from './types';

export type { FeedMode } from './types';

export type FeedResult = {
  trains: Train[];
  mode: FeedMode;
};

export async function fetchLiveTrains(): Promise<FeedResult> {
  const vehicles = await subwayService.fetchVehicles();
  return {
    trains: vehicles,
    mode: subwayService.mode,
  };
}
