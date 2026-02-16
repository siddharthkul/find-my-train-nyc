import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Train } from '../types/train';
import { getRouteColor, getRouteTextColor } from '../data/mta/routeColors';

type Props = {
  train: Train;
  mapHeading: number;
  hideArrow?: boolean;
};

const ROUTE_DOT = 18;
const ICON_SIZE = 14;
const PILL_PAD = 3;
const PILL_GAP = 2;
const PILL_W = PILL_PAD + ICON_SIZE + PILL_GAP + ROUTE_DOT + PILL_PAD;
const PILL_H = ROUTE_DOT + PILL_PAD * 2;

const ARROW_SIZE = 10;
const ARROW_OFFSET = PILL_W / 2 + ARROW_SIZE / 2 + 2;
const WRAPPER_SIZE = PILL_W + ARROW_SIZE * 2 + 6;
const CENTER = WRAPPER_SIZE / 2;
const HALF_ARROW = (ARROW_SIZE + 4) / 2;

const DEG_TO_RAD = Math.PI / 180;

const ARROW_COLOR = '#1C1C1E';
const ARROW_OUTLINE_COLOR = '#FFFFFF';

/**
 * Renders a train on the map with:
 *   - A white pill-shaped marker containing a train icon + route badge
 *   - A small triangular arrow positioned on the edge of the pill
 *     pointing in the direction of travel.
 */
export const TrainMarker = memo(function TrainMarker({
  train,
  mapHeading,
  hideArrow,
}: Props) {
  const routeColor = getRouteColor(train.routeId);
  const textColor = getRouteTextColor(train.routeId);
  const showArrow = train.direction !== 'UNK' && !hideArrow;

  const bearingDeg = train.bearing - mapHeading;
  const bearingRad = bearingDeg * DEG_TO_RAD;

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
        {/* Pill-shaped marker: train icon + route dot */}
        <View style={styles.pill}>
          <Ionicons name="subway" size={ICON_SIZE} color={routeColor} />
          <View style={[styles.routeDot, { backgroundColor: routeColor }]}>
            <Text style={[styles.routeText, { color: textColor }]}>
              {train.routeId}
            </Text>
          </View>
        </View>

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
            <View style={styles.arrowOutline} />
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: PILL_H / 2,
    paddingHorizontal: PILL_PAD,
    paddingVertical: PILL_PAD,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  routeDot: {
    width: ROUTE_DOT,
    height: ROUTE_DOT,
    borderRadius: ROUTE_DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: PILL_GAP,
  },
  routeText: {
    fontSize: 10,
    fontWeight: '800',
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
