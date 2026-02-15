import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker, type Region } from 'react-native-maps';
import { getRouteColor } from '../data/mta/routeColors';
import {
  subwayStations,
  type SubwayStation,
} from '../data/mta/subwayStations';
import { type AppColors, useColors } from '../theme/tokens';

/** Only show station dots when zoomed in past this delta. */
const SHOW_THRESHOLD = 0.12;
/** Show station names when zoomed in further. */
const LABEL_THRESHOLD = 0.04;

type Props = {
  region: Region | null;
  onStationPress?: (stationId: string) => void;
};

/**
 * Renders subway station dots on the map.
 * Visibility is tied to zoom level so the map isn't cluttered when
 * zoomed out.
 */
export const StationMarkers = memo(function StationMarkers({ region, onStationPress }: Props) {
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
          colors={colors}
          onPress={onStationPress}
        />
      ))}
    </>
  );
});

// ── individual station marker ───────────────────────────────────────

const StationDot = memo(function StationDot({
  station,
  showLabel,
  colors,
  onPress,
}: {
  station: SubwayStation;
  showLabel: boolean;
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
      zIndex={50}
      onPress={onPress ? () => onPress(station.id) : undefined}
    >
      <View style={styles.container}>
        {/* Invisible hit area — makes the tiny dot easy to tap */}
        <View style={styles.hitArea} />
        <View style={[styles.dot, { borderColor: primaryColor, backgroundColor: colors.stationDot }]} />
        {showLabel ? (
          <Text
            style={[styles.label, { color: colors.stationLabel, backgroundColor: colors.stationLabelBg }]}
            numberOfLines={1}
          >
            {station.name}
          </Text>
        ) : null}
      </View>
    </Marker>
  );
});

const HIT_SIZE = 36;

const styles = StyleSheet.create({
  container: {
    width: HIT_SIZE,
    minHeight: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitArea: {
    position: 'absolute',
    width: HIT_SIZE,
    height: HIT_SIZE,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  label: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
    maxWidth: 120,
  },
});
