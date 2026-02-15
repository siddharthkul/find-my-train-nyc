import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { subwayService } from '../services/mtaSubwayService';
import { useAlertStore } from '../stores/alertStore';

const REFRESH_MS = 60_000;

/**
 * Polls the MTA subway service for active service alerts every 60 s.
 *
 * @param routes  Optional route filter — only return alerts affecting
 *                these lines.  Pass `undefined` or `[]` for all alerts.
 */
export function useServiceAlerts(routes?: string[]) {
  const { setAlerts, setLoading, setError } = useAlertStore(
    useShallow((state) => ({
      setAlerts: state.setAlerts,
      setLoading: state.setLoading,
      setError: state.setError,
    })),
  );

  const routesRef = useRef(routes);
  routesRef.current = routes;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const alerts = await subwayService.fetchAlerts(routesRef.current);
      setAlerts(alerts);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not load service alerts.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setAlerts, setLoading, setError]);

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
