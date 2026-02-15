/**
 * Re-exports the SubwayService interface from the central types module.
 *
 * Consumers that only need the interface can import from here
 * without pulling in the full MTA implementation.
 */
export type {
  SubwayService,
  SubwaySnapshot,
  VehiclePosition,
  ArrivalPrediction,
  ServiceAlert,
  FeedMode,
} from '../types';
