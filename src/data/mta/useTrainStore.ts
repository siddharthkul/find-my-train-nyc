import { create } from 'zustand';
import { Train } from '../../types/train';
import { FeedMode } from './feedClient';

type TrainState = {
  trains: Train[];
  isLoading: boolean;
  errorMessage: string | null;
  lastUpdatedMs: number | null;
  mode: FeedMode;
  setLoading: (isLoading: boolean) => void;
  setError: (errorMessage: string | null) => void;
  setTrains: (trains: Train[], mode: FeedMode) => void;
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
