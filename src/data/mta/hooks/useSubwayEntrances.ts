import { useEffect, useState } from 'react';
import {
  type SubwayEntrance,
  ensureEntrancesLoaded,
  getEntrancesForStation,
  isEntranceDataReady,
} from '../subwayEntrances';

/**
 * Fetches subway entrance data (once per app session) and returns
 * the entrances for the given station ID.
 */
export function useSubwayEntrances(stationId: string | null): SubwayEntrance[] {
  const [entrances, setEntrances] = useState<SubwayEntrance[]>([]);
  const [ready, setReady] = useState(isEntranceDataReady());

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    ensureEntrancesLoaded().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !stationId) {
      setEntrances([]);
      return;
    }
    setEntrances(getEntrancesForStation(stationId));
  }, [ready, stationId]);

  return entrances;
}
