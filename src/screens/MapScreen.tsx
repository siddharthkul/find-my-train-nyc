import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { MapType, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { NearbyTrainsBar } from '../components/NearbyTrainsBar';
import { StationMarkers } from '../components/StationMarkers';
import { SubwayLines } from '../components/SubwayLines';
import { TrainMarker } from '../components/TrainMarker';
import { useStationArrivals } from '../data/mta/hooks/useStationArrivals';
import { useArrivalStore } from '../data/mta/stores/arrivalStore';
import { subwayStations } from '../data/mta/subwayStations';
import type { ArrivalPrediction } from '../data/mta/types';
import { useShallow } from 'zustand/react/shallow';
import { useLiveTrains } from '../data/mta/useLiveTrains';
import { useTrainStore } from '../data/mta/useTrainStore';
import { tokens, useColors } from '../theme/tokens';

const EMPTY_ARRIVALS: ArrivalPrediction[] = [];

const NYC_REGION: Region = {
  latitude: 40.7411,
  longitude: -73.9897,
  latitudeDelta: 0.22,
  longitudeDelta: 0.2,
};

function formatLastUpdated(lastUpdatedMs: number | null): string {
  if (!lastUpdatedMs) {
    return 'Waiting for first update';
  }
  const elapsedSec = Math.max(0, Math.round((Date.now() - lastUpdatedMs) / 1000));
  if (elapsedSec < 60) return `Updated ${elapsedSec}s ago`;
  const elapsedMin = Math.round(elapsedSec / 60);
  return `Updated ${elapsedMin}m ago`;
}

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { errorMessage, isLoading, lastUpdatedMs, mode, trains } = useTrainStore(
    useShallow((state) => ({
      trains: state.trains,
      isLoading: state.isLoading,
      errorMessage: state.errorMessage,
      lastUpdatedMs: state.lastUpdatedMs,
      mode: state.mode,
    })),
  );
  useLiveTrains();
  const mapRef = useRef<MapView>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(NYC_REGION);
  const regionRef = useRef<Region>(NYC_REGION);
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [mapHeading, setMapHeading] = useState(0);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [nearbyBarHeight, setNearbyBarHeight] = useState(0);

  // Animated value for the map controls island position
  const islandBottom = useRef(new Animated.Value(insets.bottom + tokens.spacing.xl)).current;

  // Find the nearest station to the map center (for the nearby bar ETAs)
  const nearestStation = useMemo(() => {
    let best: typeof subwayStations[0] | null = null;
    let bestDist = Infinity;
    const cLat = currentRegion.latitude;
    const cLng = currentRegion.longitude;
    for (const s of subwayStations) {
      const d = (s.lat - cLat) ** 2 + (s.lng - cLng) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }, [currentRegion]);
  const nearestStationId = nearestStation?.id ?? null;

  // Poll arrivals for: selected station OR nearest station (for the nearby bar)
  const arrivalStationId = selectedStationId ?? nearestStationId;
  useStationArrivals(arrivalStationId);

  // Get arrivals for the bottom bar (pinned station or nearest station)
  const nearbyArrivals = useArrivalStore(
    (state) => (arrivalStationId ? state.arrivals[arrivalStationId] : undefined) ?? EMPTY_ARRIVALS,
  );

  // The station whose arrivals are displayed in the bottom bar:
  // pinned (tapped) station wins; otherwise auto-nearest.
  const activeStation = useMemo(
    () =>
      selectedStationId
        ? subwayStations.find((s) => s.id === selectedStationId) ?? nearestStation
        : nearestStation,
    [selectedStationId, nearestStation],
  );
  const activeStationId = activeStation?.id ?? null;
  const isPinnedStation = !!selectedStationId;

  const cycleMapType = useCallback(() => {
    setMapType((prev) => {
      if (prev === 'standard') return 'hybrid';
      if (prev === 'hybrid') return 'satellite';
      return 'standard';
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Request foreground location permission on mount and center on user
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);

      if (granted) {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          mapRef.current?.animateToRegion(
            {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.025,
              longitudeDelta: 0.025,
            },
            600,
          );
        } catch {
          // Fall back to default NYC view
        }
      }
    })();
  }, []);

  const centerOnUser = useCallback(async () => {
    try {
      if (!locationPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        setLocationPermission(true);
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500,
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Silently fail – user may have denied permission
    }
  }, [locationPermission]);

  // Throttle region state updates so we don't re-render on every tiny pan.
  const handleRegionChange = useCallback((region: Region) => {
    regionRef.current = region;
    if (regionTimer.current) clearTimeout(regionTimer.current);
    regionTimer.current = setTimeout(() => {
      setCurrentRegion((prev) => {
        const zoomChanged =
          Math.abs(prev.latitudeDelta - region.latitudeDelta) > 0.005;
        const panned =
          Math.abs(prev.latitude - region.latitude) >
            prev.latitudeDelta * 0.3 ||
          Math.abs(prev.longitude - region.longitude) >
            prev.longitudeDelta * 0.3;
        return zoomChanged || panned ? region : prev;
      });

      // Sync map heading so train direction arrows stay correct when rotated
      mapRef.current?.getCamera().then((cam) => {
        setMapHeading((prev) => {
          const h = Math.round(cam.heading);
          return Math.abs(prev - h) > 2 ? h : prev;
        });
        setIsMapMoving(false);
      });
    }, 150);
  }, []);

  // Animate the map controls island above the bottom bar
  useEffect(() => {
    let target: number;
    if (nearbyBarHeight > 0) {
      // Bar sits at insets.bottom + 6 from the screen edge, so total = bar height + that offset + gap
      target = nearbyBarHeight + insets.bottom + 6 + tokens.spacing.md;
    } else {
      target = insets.bottom + tokens.spacing.xl;
    }
    Animated.spring(islandBottom, {
      toValue: target,
      ...tokens.motion.spring,
      useNativeDriver: false, // `bottom` doesn't support native driver
    }).start();
  }, [nearbyBarHeight, insets.bottom, islandBottom]);

  // Filter trains to only those within the current viewport
  const visibleTrains = useMemo(() => {
    const r = currentRegion;
    const latPad = r.latitudeDelta * 0.6;
    const lngPad = r.longitudeDelta * 0.6;
    const minLat = r.latitude - latPad;
    const maxLat = r.latitude + latPad;
    const minLng = r.longitude - lngPad;
    const maxLng = r.longitude + lngPad;
    return trains.filter(
      (t) =>
        t.latitude >= minLat &&
        t.latitude <= maxLat &&
        t.longitude >= minLng &&
        t.longitude <= maxLng,
    );
  }, [trains, currentRegion]);

  const handleStationPress = useCallback(
    (stationId: string) => {
      setSelectedStationId((prev) => (prev === stationId ? null : stationId));
      void Haptics.selectionAsync();
    },
    [],
  );

  const dismissPinnedStation = useCallback(() => {
    setSelectedStationId(null);
    void Haptics.selectionAsync();
  }, []);

  const markerNodes = useMemo(
    () =>
      visibleTrains.map((train) => (
        <TrainMarker
          key={train.id}
          train={train}
          mapHeading={mapHeading}
          hideArrow={isMapMoving && mapHeading !== 0}
        />
      )),
    [visibleTrains, mapHeading, isMapMoving],
  );

  const dismissError = useCallback(() => {
    useTrainStore.getState().setError(null);
    void Haptics.selectionAsync();
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={NYC_REGION}
        mapType={mapType}
        showsUserLocation={!!locationPermission}
        showsMyLocationButton={false}
        onRegionChange={() => setIsMapMoving(true)}
        onRegionChangeComplete={handleRegionChange}
      >
        <SubwayLines region={currentRegion} />
        <StationMarkers region={currentRegion} onStationPress={handleStationPress} activeStationId={activeStationId} />
        {markerNodes}
      </MapView>

      {/* Header info pill */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + tokens.spacing.sm }]}>
        <GlassCard intensity={65} style={styles.infoCard}>
          <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>
            {visibleTrains.length} nearby · {trains.length} systemwide · {formatLastUpdated(lastUpdatedMs)}
          </Text>
          {mode === 'mock' ? <Text style={[styles.mockNotice, { color: colors.mockNotice }]}>Mock mode (no API key)</Text> : null}
        </GlassCard>
      </View>

      {/* Initial loading state */}
      {isLoading && trains.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={colors.labelSecondary} />
          <Text style={[styles.stateText, { color: colors.labelSecondary }]}>Loading NYC subway trains…</Text>
        </View>
      ) : null}

      {/* Error card */}
      {errorMessage ? (
        <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + tokens.spacing.lg }]}>
          <GlassCard intensity={65} style={styles.errorCard}>
            <Text style={[styles.errorTitle, { color: colors.danger }]}>Could not refresh trains</Text>
            <Text style={[styles.errorText, { color: colors.dangerText }]} numberOfLines={3}>
              {errorMessage}
            </Text>
            <Pressable
              style={[styles.dismissButton, { backgroundColor: colors.dismissBg, borderColor: colors.borderSubtle }]}
              onPress={dismissError}
            >
              <Text style={[styles.dismissLabel, { color: colors.labelSecondary }]}>Dismiss</Text>
            </Pressable>
          </GlassCard>
        </View>
      ) : null}

      {/* Nearby trains bar — always visible */}
      <NearbyTrainsBar
        arrivals={nearbyArrivals}
        station={activeStation}
        isPinned={isPinnedStation}
        onDismissStation={dismissPinnedStation}
        onSearchPress={() => {
          // TODO: open full-screen search
          void Haptics.selectionAsync();
        }}
        onHeightChange={setNearbyBarHeight}
      />

      {/* Map controls island — floats above whichever bottom panel is visible */}
      <Animated.View style={[styles.mapIsland, { bottom: islandBottom, shadowColor: colors.shadow }]}>
        <GlassCard intensity={60} style={styles.islandGlass}>
          <Pressable
            onPress={cycleMapType}
            style={({ pressed }) => [
              styles.islandBtn,
              pressed && { backgroundColor: colors.mapBtnPressed },
            ]}
          >
          <Ionicons name="map-outline" size={21} color={colors.labelPrimary} />
        </Pressable>

        <View style={[styles.islandDivider, { backgroundColor: colors.borderSubtle }]} />

        <Pressable
          onPress={centerOnUser}
          style={({ pressed }) => [
            styles.islandBtn,
            pressed && { backgroundColor: colors.mapBtnPressed },
          ]}
        >
          <Ionicons name="navigate" size={19} color={colors.labelPrimary} />
          </Pressable>
        </GlassCard>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  infoCard: {
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  subtitle: {
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.medium,
  },
  mockNotice: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.semibold,
  },
  centerState: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  stateText: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.medium,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  errorCard: {
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  errorTitle: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
  },
  errorText: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.medium,
  },
  dismissButton: {
    marginTop: tokens.spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  dismissLabel: {
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.semibold,
  },
  mapIsland: {
    position: 'absolute',
    right: tokens.spacing.lg,
    zIndex: 10,
    borderRadius: tokens.radius.lg + 4,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  islandGlass: {
    borderRadius: tokens.radius.lg + 4,
    overflow: 'hidden',
  },
  islandBtn: {
    width: tokens.size.islandBtn,
    height: tokens.size.islandBtn,
    justifyContent: 'center',
    alignItems: 'center',
  },
  islandDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: tokens.spacing.md,
  },
});
