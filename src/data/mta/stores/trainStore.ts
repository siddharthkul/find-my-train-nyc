import { create } from 'zustand';
import type { FeedMode, VehiclePosition } from '../types';

type TrainState = {
  trains: VehiclePosition[];
  isLoading: boolean;
  errorMessage: string | null;
  lastUpdatedMs: number | null;
  mode: FeedMode;
  setLoading: (isLoading: boolean) => void;
  setError: (errorMessage: string | null) => void;
  setTrains: (trains: VehiclePosition[], mode: FeedMode) => void;
};

export const useTrainStore = create<TrainState>((set) => ({
  trains: [],
  isLoading: false,
  errorMessage: null,
  lastUpdatedMs: null,
  mode: 'live',
  setLoading: (isLoading) => set({ isLoading }),
  setError: (errorMessage) => set({ errorMessage }),
  setTrains: (trains, mode) =>
    set({
      trains,
      mode,
      lastUpdatedMs: Date.now(),
    }),
}));
