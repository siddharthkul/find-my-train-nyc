import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker, type Region } from 'react-native-maps';
import { getRouteColor, getRouteTextColor } from '../data/mta/routeColors';
import { subwayStations, type SubwayStation } from '../data/mta/subwayStations';
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
export const StationMarkers = memo(function StationMarkers({
  region,
  onStationPress,
  activeStationId,
}: Props) {
  const colors = useColors();
  const zoomDelta = region?.latitudeDelta ?? 0.22;
  const showStations = zoomDelta < SHOW_THRESHOLD;
  const showLabels = zoomDelta < LABEL_THRESHOLD;

  // Filter to visible stations based on current region viewport (rough bbox).
  // Uses generous padding (1.0×) to cover any small drift between the stored
  // region and the actual map viewport.
  const visibleStations = useMemo(() => {
    if (!showStations || !region) return [];
    const latPad = region.latitudeDelta * 1.0;
    const lngPad = region.longitudeDelta * 1.0;
    const minLat = region.latitude - latPad;
    const maxLat = region.latitude + latPad;
    const minLng = region.longitude - lngPad;
    const maxLng = region.longitude + lngPad;

    const inBounds = subwayStations.filter(
      (s) => s.lat >= minLat && s.lat <= maxLat && s.lng >= minLng && s.lng <= maxLng,
    );

    // Always include the active station so it's never missing from the map
    if (activeStationId && !inBounds.some((s) => s.id === activeStationId)) {
      const active = subwayStations.find((s) => s.id === activeStationId);
      if (active) inBounds.push(active);
    }

    return inBounds;
  }, [showStations, region, activeStationId]);

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
const ACTIVE_CIRCLE = 44;
const ACTIVE_POINTER = 8;
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
  const textColor = getRouteTextColor(station.routes[0] ?? '');

  // Active station — large Apple Maps-style circle marker with route badge
  if (isActive) {
    return (
      <Marker
        identifier={`station-${station.id}`}
        coordinate={{ latitude: station.lat, longitude: station.lng }}
        anchor={{ x: 0.5, y: 1.0 }}
        tracksViewChanges={true}
        zIndex={100}
        onPress={onPress ? () => onPress(station.id) : undefined}
      >
        <View style={styles.activeWrapper}>
          {/* Circle with route letter */}
          <View
            style={[
              styles.activeCircle,
              { backgroundColor: primaryColor, shadowColor: primaryColor },
            ]}
          >
            <Text style={[styles.activeRouteText, { color: textColor }]}>
              {station.routes[0] ?? ''}
            </Text>
          </View>
          {/* Pointer tail */}
          <View style={[styles.activePointer, { borderTopColor: primaryColor }]} />
          {/* Station name label */}
          <View
            style={[
              styles.activeLabel,
              { backgroundColor: colors.stationLabelBg, shadowColor: colors.shadow },
            ]}
          >
            <Text
              style={[styles.activeLabelText, { color: colors.stationLabel }]}
              numberOfLines={1}
            >
              {station.name}
            </Text>
          </View>
        </View>
      </Marker>
    );
  }

  // Inactive stations use a small custom dot
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
        <View style={styles.hitArea} />
        <View style={[styles.dotOuter, { shadowColor: colors.shadow }]}>
          <View
            style={[styles.dot, { borderColor: primaryColor, backgroundColor: colors.stationDot }]}
          />
        </View>
        {showLabel ? (
          <View
            style={[
              styles.labelPill,
              { backgroundColor: colors.stationLabelBg, shadowColor: colors.shadow },
            ]}
          >
            <Text style={[styles.labelText, { color: colors.stationLabel }]} numberOfLines={1}>
              {station.name}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  // ── Active marker (Apple Maps style) ──────────────────────────────
  activeWrapper: {
    alignItems: 'center',
  },
  activeCircle: {
    width: ACTIVE_CIRCLE,
    height: ACTIVE_CIRCLE,
    borderRadius: ACTIVE_CIRCLE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  activeRouteText: {
    fontSize: 20,
    fontWeight: tokens.font.weight.bold,
  },
  activePointer: {
    width: 0,
    height: 0,
    borderLeftWidth: ACTIVE_POINTER,
    borderRightWidth: ACTIVE_POINTER,
    borderTopWidth: ACTIVE_POINTER + 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  activeLabel: {
    marginTop: 2,
    paddingHorizontal: tokens.spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  activeLabelText: {
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.bold,
    textAlign: 'center',
  },
  // ── Inactive marker (small dot) ───────────────────────────────────
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
