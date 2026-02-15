import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker, type Region } from 'react-native-maps';
import { getRouteColor } from '../data/mta/routeColors';
import {
  subwayStations,
  type SubwayStation,
} from '../data/mta/subwayStations';
import { type AppColors, tokens, useColors } from '../theme/tokens';

/** Only show station dots when zoomed in past this delta. */
const SHOW_THRESHOLD = 0.12;
/** Show station names when zoomed in further. */
const LABEL_THRESHOLD = 0.04;

type Props = {
  region: Region | null;
  onStationPress?: (stationId: string) => void;
  /** Station whose arrivals are currently shown — gets a highlight ring */
  activeStationId?: string | null;
};

/**
 * Renders subway station dots on the map.
 * Visibility is tied to zoom level so the map isn't cluttered when
 * zoomed out.
 */
export const StationMarkers = memo(function StationMarkers({ region, onStationPress, activeStationId }: Props) {
  const colors = useColors();
  const zoomDelta = region?.latitudeDelta ?? 0.22;
  const showStations = zoomDelta < SHOW_THRESHOLD;
  const showLabels = zoomDelta < LABEL_THRESHOLD;

  // Filter to visible stations based on current region viewport (rough bbox)
  const visibleStations = useMemo(() => {
    if (!showStations || !region) return [];
    const latPad = region.latitudeDelta * 0.6;
    const lngPad = region.longitudeDelta * 0.6;
    const minLat = region.latitude - latPad;
    const maxLat = region.latitude + latPad;
    const minLng = region.longitude - lngPad;
    const maxLng = region.longitude + lngPad;

    return subwayStations.filter(
      (s) =>
        s.lat >= minLat && s.lat <= maxLat && s.lng >= minLng && s.lng <= maxLng,
    );
  }, [showStations, region]);

  if (!showStations) return null;

  return (
    <>
      {visibleStations.map((station) => (
        <StationDot
          key={station.id}
          station={station}
          showLabel={showLabels}
          isActive={station.id === activeStationId}
          colors={colors}
          onPress={onStationPress}
        />
      ))}
    </>
  );
});

// ── individual station marker ───────────────────────────────────────

const DOT_SIZE = 14;
const ACTIVE_DOT_SIZE = 20;
const ACTIVE_RING_SIZE = 30;
const HIT_SIZE = 40;

const StationDot = memo(function StationDot({
  station,
  showLabel,
  isActive,
  colors,
  onPress,
}: {
  station: SubwayStation;
  showLabel: boolean;
  isActive: boolean;
  colors: AppColors;
  onPress?: (stationId: string) => void;
}) {
  const primaryColor = getRouteColor(station.routes[0] ?? '');

  return (
    <Marker
      identifier={`station-${station.id}`}
      coordinate={{ latitude: station.lat, longitude: station.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      zIndex={isActive ? 100 : 50}
      onPress={onPress ? () => onPress(station.id) : undefined}
    >
      <View style={styles.container}>
        {/* Invisible hit area — makes the tiny dot easy to tap */}
        <View style={styles.hitArea} />

        {isActive ? (
          /* Active station — larger dot with a pulsing accent ring */
          <View style={[styles.activeRing, { borderColor: primaryColor, shadowColor: primaryColor }]}>
            <View
              style={[
                styles.activeDot,
                { borderColor: primaryColor, backgroundColor: colors.stationDot },
              ]}
            />
          </View>
        ) : (
          /* Normal station dot */
          <View style={[styles.dotOuter, { shadowColor: colors.shadow }]}>
            <View
              style={[
                styles.dot,
                { borderColor: primaryColor, backgroundColor: colors.stationDot },
              ]}
            />
          </View>
        )}

        {(showLabel || isActive) ? (
          <View style={[
            styles.labelPill,
            isActive && styles.activeLabelPill,
            { backgroundColor: colors.stationLabelBg, shadowColor: colors.shadow },
          ]}>
            <Text
              style={[
                styles.labelText,
                isActive && styles.activeLabelText,
                { color: colors.stationLabel },
              ]}
              numberOfLines={1}
            >
              {station.name}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  container: {
    minWidth: HIT_SIZE,
    minHeight: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitArea: {
    position: 'absolute',
    width: HIT_SIZE,
    height: HIT_SIZE,
  },
  dotOuter: {
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 3,
  },
  activeRing: {
    width: ACTIVE_RING_SIZE,
    height: ACTIVE_RING_SIZE,
    borderRadius: ACTIVE_RING_SIZE / 2,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  activeDot: {
    width: ACTIVE_DOT_SIZE,
    height: ACTIVE_DOT_SIZE,
    borderRadius: ACTIVE_DOT_SIZE / 2,
    borderWidth: 3.5,
  },
  activeLabelPill: {
    shadowOpacity: 0.35,
  },
  activeLabelText: {
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.bold,
  },
  labelPill: {
    marginTop: 3,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
    maxWidth: 140,
  },
  labelText: {
    fontSize: tokens.font.size.xs + 1,
    fontWeight: tokens.font.weight.bold,
    textAlign: 'center',
  },
});
