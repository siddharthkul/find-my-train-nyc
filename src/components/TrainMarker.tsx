import { memo } from 'react';
import { Marker } from 'react-native-maps';
import { Train } from '../types/train';
import { getRouteBadgeImage } from '../data/mta/markerImages';

type Props = {
  train: Train;
  isSelected: boolean;
  onPress: (train: Train) => void;
};

/**
 * Renders a train position on the map using a pre-rendered PNG badge
 * passed via the `image` prop.
 *
 * This maps directly to MKAnnotationView.image on iOS — the native,
 * most reliable annotation rendering path. No React view snapshotting,
 * no bitmap caching, no zoom-level rendering bugs.
 */
export const TrainMarker = memo(function TrainMarker({
  train,
  isSelected,
  onPress,
}: Props) {
  const badgeImage = getRouteBadgeImage(train.routeId);

  return (
    <Marker
      identifier={train.id}
      coordinate={{
        latitude: train.latitude,
        longitude: train.longitude,
      }}
      image={badgeImage}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      zIndex={100}
      opacity={isSelected ? 1 : 0.92}
      onPress={() => onPress(train)}
    />
  );
});
