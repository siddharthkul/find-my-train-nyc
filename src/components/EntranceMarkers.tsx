import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker, type Region } from 'react-native-maps';
import type { SubwayEntrance } from '../data/mta/subwayEntrances';
import { type AppColors, tokens, useColors } from '../theme/tokens';

/** Only show entrance markers when zoomed in past this delta. */
const SHOW_THRESHOLD = 0.025;

type Props = {
  entrances: SubwayEntrance[];
  region: Region | null;
};

/**
 * Renders small icon markers at each subway entrance/exit for the active station.
 * Elevators get a distinct blue badge; stairs show a subtle entrance icon.
 * Escalators are not shown.
 */
export const EntranceMarkers = memo(function EntranceMarkers({
  entrances,
  region,
}: Props) {
  const colors = useColors();
  const zoomDelta = region?.latitudeDelta ?? 0.22;
  const show = zoomDelta < SHOW_THRESHOLD && entrances.length > 0;

  const visibleEntrances = useMemo(() => {
    if (!show || !region) return [];
    const latPad = region.latitudeDelta * 1.0;
    const lngPad = region.longitudeDelta * 1.0;
    const minLat = region.latitude - latPad;
    const maxLat = region.latitude + latPad;
    const minLng = region.longitude - lngPad;
    const maxLng = region.longitude + lngPad;

    return entrances
      .filter(
        (e) =>
          e.entranceType !== 'Escalator' &&
          e.lat >= minLat &&
          e.lat <= maxLat &&
          e.lng >= minLng &&
          e.lng <= maxLng,
      );
  }, [show, entrances, region]);

  if (!show) return null;

  return (
    <>
      {visibleEntrances.map((entrance, idx) => (
        <EntranceDot
          key={`ent-${idx}-${entrance.lat}-${entrance.lng}`}
          entrance={entrance}
          colors={colors}
        />
      ))}
    </>
  );
});

// ── Individual entrance marker ──────────────────────────────────────

const ICON_SIZE = 24;

const EntranceDot = memo(function EntranceDot({
  entrance,
  colors,
}: {
  entrance: SubwayEntrance;
  colors: AppColors;
}) {
  const isElevator = entrance.entranceType === 'Elevator';

  return (
    <Marker
      coordinate={{ latitude: entrance.lat, longitude: entrance.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      zIndex={40}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isElevator ? colors.accent : colors.stationLabelBg,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <Ionicons
          name={isElevator ? 'accessibility' : 'enter-outline'}
          size={13}
          color={isElevator ? '#FFFFFF' : colors.labelSecondary}
        />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
