/**
 * Backward-compatible re-exports.
 *
 * All domain types now live in `src/data/mta/types.ts`.
 * Existing imports from `../types/train` continue to work.
 */
export type { CardinalDirection, Train, VehiclePosition } from '../data/mta/types';
