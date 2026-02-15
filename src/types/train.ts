export type CardinalDirection = 'N' | 'S' | 'E' | 'W' | 'UNK';

export type Train = {
  id: string;
  routeId: string;
  latitude: number;
  longitude: number;
  bearing: number;
  direction: CardinalDirection;
  lastUpdatedMs: number;
};
