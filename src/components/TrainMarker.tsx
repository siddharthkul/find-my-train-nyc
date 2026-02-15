import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Train } from '../types/train';
import { getRouteBadgeImage } from '../data/mta/markerImages';

type Props = {
  train: Train;
  isSelected: boolean;
  onPress: (train: Train) => void;
};

const BADGE_SIZE = 28;
const ARROW_SIZE = 10;
const ARROW_OFFSET = BADGE_SIZE / 2 + ARROW_SIZE / 2 + 1;

/** Dark arrow with a white outline — visible over any badge or map tile. */
const ARROW_COLOR = '#1C1C1E';
const ARROW_OUTLINE_COLOR = '#FFFFFF';

/**
 * Renders a train on the map with:
 *   - The route badge (colored circle with route letter/number)
 *   - A small triangular arrow rotated to the train's actual bearing,
 *     positioned on the edge of the badge pointing in the direction
 *     of travel.
 *
 * The arrow is placed using a translate + rotate transform so it
 * orbits around the badge center at the correct angle.
 *
 * Uses `tracksViewChanges={false}` — rendered once, cached as bitmap.
 */
export const TrainMarker = memo(function TrainMarker({
  train,
  isSelected,
  onPress,
}: Props) {
  const badgeImage = getRouteBadgeImage(train.routeId);
  const hasDirection = train.direction !== 'UNK';

  // Bearing is clockwise from north (0° = up).
  // We position the arrow by rotating around the badge center.
  const bearingDeg = train.bearing;

  return (
    <Marker
      identifier={train.id}
      coordinate={{
        latitude: train.latitude,
        longitude: train.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      zIndex={100}
      opacity={isSelected ? 1 : 0.92}
      onPress={() => onPress(train)}
    >
      <View style={styles.wrapper}>
        {/* Route badge */}
        <Image
          source={badgeImage}
          style={styles.badge}
          resizeMode="contain"
        />

        {/* Directional arrow — orbits around the badge */}
        {hasDirection && (
          <View
            style={[
              styles.arrowAnchor,
              {
                transform: [
                  { rotate: `${bearingDeg}deg` },
                  { translateY: -ARROW_OFFSET },
                ],
              },
            ]}
          >
            {/* White outline (slightly larger triangle behind) */}
            <View style={styles.arrowOutline} />
            {/* Dark foreground triangle */}
            <View style={styles.arrowTriangle} />
          </View>
        )}
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: BADGE_SIZE + ARROW_SIZE * 2 + 4,
    height: BADGE_SIZE + ARROW_SIZE * 2 + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },
  arrowAnchor: {
    position: 'absolute',
    width: ARROW_SIZE + 4,
    height: ARROW_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOutline: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: (ARROW_SIZE + 3) / 2,
    borderRightWidth: (ARROW_SIZE + 3) / 2,
    borderBottomWidth: ARROW_SIZE + 3,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: ARROW_OUTLINE_COLOR,
  },
  arrowTriangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE / 2,
    borderRightWidth: ARROW_SIZE / 2,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: ARROW_COLOR,
  },
});
