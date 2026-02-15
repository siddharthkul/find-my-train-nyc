import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { fetchLiveTrains } from './feedClient';
import { useTrainStore } from './useTrainStore';

const REFRESH_MS = 15000;

export function useLiveTrains() {
  const { setError, setLoading, setTrains } = useTrainStore(
    useShallow((state) => ({
      setError: state.setError,
      setLoading: state.setLoading,
      setTrains: state.setTrains,
    })),
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLiveTrains();
      setTrains(result.trains, result.mode);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not load live trains at the moment.';
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
