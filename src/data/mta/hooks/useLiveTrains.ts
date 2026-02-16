import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { subwayService } from '../services/mtaSubwayService';
import { useTrainStore } from '../stores/trainStore';

const REFRESH_MS = 15_000;

/**
 * Polls the MTA subway service for live vehicle positions every 15 s.
 *
 * @param routes  Optional route filter — only fetch feeds for these lines.
 *                Pass `undefined` or `[]` to fetch all.
 */
export function useLiveTrains(routes?: string[]) {
  const { setError, setLoading, setTrains } = useTrainStore(
    useShallow((state) => ({
      setError: state.setError,
      setLoading: state.setLoading,
      setTrains: state.setTrains,
    })),
  );

  // Keep routes in a ref so interval closure always sees latest value
  const routesRef = useRef(routes);
  routesRef.current = routes;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const vehicles = await subwayService.fetchVehicles(routesRef.current);
      setTrains(vehicles, subwayService.mode);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load live trains at the moment.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setTrains]);

  useEffect(() => {
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
    };
  }, [refresh]);
}
