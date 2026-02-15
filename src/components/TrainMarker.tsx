import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Train } from '../types/train';
import { getRouteBadgeImage } from '../data/mta/markerImages';

type Props = {
  train: Train;
  mapHeading: number;
  hideArrow?: boolean;
};

const BADGE_SIZE = 28;
const ARROW_SIZE = 10;
const ARROW_OFFSET = BADGE_SIZE / 2 + ARROW_SIZE / 2 + 2;
const WRAPPER_SIZE = BADGE_SIZE + ARROW_SIZE * 2 + 6;
const CENTER = WRAPPER_SIZE / 2;
const HALF_ARROW = (ARROW_SIZE + 4) / 2;

const DEG_TO_RAD = Math.PI / 180;

/** Dark arrow with a white outline — visible over any badge or map tile. */
const ARROW_COLOR = '#1C1C1E';
const ARROW_OUTLINE_COLOR = '#FFFFFF';

/**
 * Renders a train on the map with:
 *   - The route badge (colored circle with route letter/number)
 *   - A small triangular arrow positioned on the edge of the badge
 *     pointing in the direction of travel.
 *
 * Arrow placement uses explicit trig (sin/cos) to orbit around
 * the badge center — independent of CSS transform quirks.
 */
export const TrainMarker = memo(function TrainMarker({
  train,
  mapHeading,
  hideArrow,
}: Props) {
  const badgeImage = getRouteBadgeImage(train.routeId);
  const showArrow = train.direction !== 'UNK' && !hideArrow;

  // Adjust bearing for map rotation
  const bearingDeg = train.bearing - mapHeading;
  const bearingRad = bearingDeg * DEG_TO_RAD;

  // Position the arrow on a circle around the badge using trig
  // sin(bearing) gives X offset (east positive), -cos(bearing) gives Y offset (north = up = negative Y)
  const arrowLeft = CENTER + ARROW_OFFSET * Math.sin(bearingRad) - HALF_ARROW;
  const arrowTop = CENTER - ARROW_OFFSET * Math.cos(bearingRad) - HALF_ARROW;

  return (
    <Marker
      identifier={train.id}
      coordinate={{
        latitude: train.latitude,
        longitude: train.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={mapHeading !== 0}
      zIndex={100}
      tappable={false}
    >
      <View style={styles.wrapper} pointerEvents="none">
        {/* Route badge */}
        <Image
          source={badgeImage}
          style={styles.badge}
          resizeMode="contain"
        />

        {/* Directional arrow — positioned with trig, rotated to face outward */}
        {showArrow && (
          <View
            style={[
              styles.arrowAnchor,
              {
                left: arrowLeft,
                top: arrowTop,
                transform: [{ rotate: `${bearingDeg}deg` }],
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
    width: WRAPPER_SIZE,
    height: WRAPPER_SIZE,
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
    justifyContent: 'flex-start',
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
