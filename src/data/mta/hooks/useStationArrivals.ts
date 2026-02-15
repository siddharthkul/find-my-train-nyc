import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { subwayService } from '../services/mtaSubwayService';
import { useArrivalStore } from '../stores/arrivalStore';

const REFRESH_MS = 30_000;

/**
 * Polls the MTA subway service for arrival predictions at a specific
 * station every 30 s.
 *
 * @param stationId  The GTFS stop ID (e.g. "A15") to fetch arrivals for.
 *                   Pass `null` to disable polling (e.g. when no station
 *                   is selected).
 */
export function useStationArrivals(stationId: string | null) {
  const { setArrivals, clearStation, setLoading, setError } = useArrivalStore(
    useShallow((state) => ({
      setArrivals: state.setArrivals,
      clearStation: state.clearStation,
      setLoading: state.setLoading,
      setError: state.setError,
    })),
  );

  const stationRef = useRef(stationId);
  stationRef.current = stationId;

  const refresh = useCallback(async () => {
    const id = stationRef.current;
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const arrivals = await subwayService.fetchArrivals(id);
      setArrivals(id, arrivals);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not load arrival predictions.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setArrivals, setLoading, setError]);

  useEffect(() => {
    if (!stationId) return;

    let isMounted = true;

    const runRefresh = async () => {
      if (!isMounted) return;
      await refresh();
    };

    void runRefresh();

    const interval = setInterval(() => {
      void runRefresh();
    }, REFRESH_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearStation(stationId);
    };
  }, [stationId, refresh, clearStation]);
}
