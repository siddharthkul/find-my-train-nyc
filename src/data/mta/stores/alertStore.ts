import { create } from 'zustand';
import type { ServiceAlert } from '../types';

type AlertState = {
  alerts: ServiceAlert[];
  isLoading: boolean;
  errorMessage: string | null;
  lastUpdatedMs: number | null;

  setAlerts: (alerts: ServiceAlert[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (errorMessage: string | null) => void;
};

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  isLoading: false,
  errorMessage: null,
  lastUpdatedMs: null,

  setAlerts: (alerts) =>
    set({
      alerts,
      lastUpdatedMs: Date.now(),
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (errorMessage) => set({ errorMessage }),
}));

// ── Derived selectors ──────────────────────────────────────────────

/**
 * Returns the count of currently active alerts.
 * Can be used directly: `const count = activeAlertCount();`
 */
export function activeAlertCount(): number {
  const now = Math.floor(Date.now() / 1000);
  return useAlertStore.getState().alerts.filter((alert) => {
    if (alert.activePeriods.length === 0) return true;
    return alert.activePeriods.some((p) => {
      const started = !p.startTime || p.startTime <= now;
      const notEnded = !p.endTime || p.endTime >= now;
      return started && notEnded;
    });
  }).length;
}
