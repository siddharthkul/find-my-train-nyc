import { create } from 'zustand';
import type { ArrivalPrediction } from '../types';

type ArrivalState = {
  /** Keyed by base station stop ID (e.g. "A15") */
  arrivals: Record<string, ArrivalPrediction[]>;
  isLoading: boolean;
  errorMessage: string | null;
  lastUpdatedMs: number | null;

  setArrivals: (stationId: string, arrivals: ArrivalPrediction[]) => void;
  clearStation: (stationId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (errorMessage: string | null) => void;
};

export const useArrivalStore = create<ArrivalState>((set) => ({
  arrivals: {},
  isLoading: false,
  errorMessage: null,
  lastUpdatedMs: null,

  setArrivals: (stationId, arrivals) =>
    set((state) => ({
      arrivals: { ...state.arrivals, [stationId]: arrivals },
      lastUpdatedMs: Date.now(),
    })),

  clearStation: (stationId) =>
    set((state) => {
      const { [stationId]: _, ...rest } = state.arrivals;
      return { arrivals: rest };
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (errorMessage) => set({ errorMessage }),
}));
