import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
import { NearbyTrainsBar } from '../components/NearbyTrainsBar';
import { StationArrivalSheet } from '../components/StationArrivalSheet';
import { StationMarkers } from '../components/StationMarkers';
import { SubwayLines } from '../components/SubwayLines';
import { TrainMarker } from '../components/TrainMarker';
import { useStationArrivals } from '../data/mta/hooks/useStationArrivals';
import { getRouteColor, getRouteLineName } from '../data/mta/routeColors';
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
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(NYC_REGION);
  const regionRef = useRef<Region>(NYC_REGION);
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trainSheet = useRef(new Animated.Value(0)).current;
  const stationSheet = useRef(new Animated.Value(0)).current;
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [mapHeading, setMapHeading] = useState(0);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [nearbyBarHeight, setNearbyBarHeight] = useState(0);

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

  // Get arrivals for the nearby bar from the store
  const nearbyArrivals = useArrivalStore(
    (state) => (nearestStationId ? state.arrivals[nearestStationId] : undefined) ?? EMPTY_ARRIVALS,
  );

  // Look up full station object
  const selectedStation = useMemo(
    () => subwayStations.find((s) => s.id === selectedStationId) ?? null,
    [selectedStationId],
  );

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

  const selectedTrain = useMemo(
    () => trains.find((train) => train.id === selectedTrainId) ?? null,
    [selectedTrainId, trains],
  );

  useEffect(() => {
    Animated.spring(trainSheet, {
      toValue: selectedTrain ? 1 : 0,
      ...tokens.motion.spring,
      useNativeDriver: true,
    }).start();
  }, [trainSheet, selectedTrain]);

  useEffect(() => {
    Animated.spring(stationSheet, {
      toValue: selectedStation ? 1 : 0,
      ...tokens.motion.spring,
      useNativeDriver: true,
    }).start();
  }, [stationSheet, selectedStation]);

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

  const handleTrainPress = useCallback(
    (pressedTrain: { id: string }) => {
      setSelectedTrainId(pressedTrain.id);
      setSelectedStationId(null);
      void Haptics.selectionAsync();
    },
    [],
  );

  const handleStationPress = useCallback(
    (stationId: string) => {
      setSelectedStationId(stationId);
      setSelectedTrainId(null);
      void Haptics.selectionAsync();
    },
    [],
  );

  const markerNodes = useMemo(
    () =>
      visibleTrains.map((train) => (
        <TrainMarker
          key={train.id}
          train={train}
          isSelected={selectedTrainId === train.id}
          mapHeading={mapHeading}
          hideArrow={isMapMoving && mapHeading !== 0}
          onPress={handleTrainPress}
        />
      )),
    [selectedTrainId, visibleTrains, handleTrainPress, mapHeading, isMapMoving],
  );

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
        <StationMarkers region={currentRegion} onStationPress={handleStationPress} />
        {markerNodes}
      </MapView>

      <View style={[styles.topOverlay, { paddingTop: insets.top + tokens.spacing.sm }]}>
        <BlurView intensity={65} tint={colors.blurTint} style={[styles.infoCard, { borderColor: colors.borderSubtle }]}>
          <Text style={[styles.title, { color: colors.labelPrimary }]}>FindMyTrainNYC</Text>
          <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>
            {visibleTrains.length} nearby • {trains.length} systemwide • {formatLastUpdated(lastUpdatedMs)}
          </Text>
          {mode === 'mock' ? <Text style={[styles.mockNotice, { color: colors.mockNotice }]}>Mock mode (no API key)</Text> : null}
        </BlurView>
      </View>

      {isLoading && trains.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={colors.labelSecondary} />
          <Text style={[styles.stateText, { color: colors.labelSecondary }]}>Loading NYC subway trains...</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + tokens.spacing.md }]}>
          <BlurView intensity={65} tint={colors.blurTint} style={[styles.errorCard, { borderColor: colors.dangerBorder }]}>
            <Text style={[styles.errorTitle, { color: colors.danger }]}>Could not refresh trains</Text>
            <Text style={[styles.errorText, { color: colors.dangerText }]} numberOfLines={3}>
              {errorMessage}
            </Text>
            <Pressable
              style={[styles.dismissButton, { backgroundColor: colors.dismissBg, borderColor: colors.borderSubtle }]}
              onPress={() => {
                void Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.dismissLabel, { color: colors.labelSecondary }]}>Will auto-retry</Text>
            </Pressable>
          </BlurView>
        </View>
      ) : null}

      {/* Nearby trains bar — shown when no detail sheet is open */}
      {!selectedTrain && !selectedStation && (
        <NearbyTrainsBar
          arrivals={nearbyArrivals}
          stationName={nearestStation?.name ?? ''}
          onSearchPress={() => {
            // TODO: open full-screen search
            void Haptics.selectionAsync();
          }}
          onHeightChange={setNearbyBarHeight}
        />
      )}

      {/* Map controls island — floats above whichever bottom panel is visible */}
      <View style={[styles.mapIsland, { bottom: (selectedTrain || selectedStation) ? 350 : (nearbyBarHeight > 0 ? nearbyBarHeight + 12 : insets.bottom + 20), backgroundColor: colors.mapBtn }]}>
        <Pressable
          onPress={cycleMapType}
          style={({ pressed }) => [
            styles.islandBtn,
            pressed && { backgroundColor: colors.mapBtnPressed },
          ]}
        >
          <Ionicons name="map-outline" size={21} color={colors.tint} />
        </Pressable>

        <View style={[styles.islandDivider, { backgroundColor: colors.borderSubtle }]} />

        <Pressable
          onPress={centerOnUser}
          style={({ pressed }) => [
            styles.islandBtn,
            pressed && { backgroundColor: colors.mapBtnPressed },
          ]}
        >
          <Ionicons name="navigate" size={19} color={colors.tint} />
        </Pressable>
      </View>

      <Animated.View
        pointerEvents={selectedTrain ? 'auto' : 'none'}
        style={[
          styles.detailOverlay,
          {
            paddingBottom: 0,
            transform: [
              {
                translateY: trainSheet.interpolate({
                  inputRange: [0, 1],
                  outputRange: [180, 0],
                }),
              },
            ],
            opacity: trainSheet,
          },
        ]}
      >
        <BlurView intensity={80} tint={colors.blurTint} style={[styles.detailCard, { borderColor: colors.borderSubtle }]}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleRow}>
              {selectedTrain ? (
                <View
                  style={[
                    styles.detailRouteBadge,
                    { backgroundColor: getRouteColor(selectedTrain.routeId), borderColor: colors.badgeBorder },
                  ]}
                >
                  <Text style={styles.detailRouteText}>
                    {selectedTrain.routeId}
                  </Text>
                </View>
              ) : null}
              <View>
                <Text style={[styles.detailTitle, { color: colors.labelPrimary }]}>
                  {selectedTrain ? `${selectedTrain.routeId} Train` : 'Train'}
                </Text>
                {selectedTrain ? (
                  <Text style={[styles.detailLineName, { color: colors.labelSecondary }]}>
                    {getRouteLineName(selectedTrain.routeId)}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => {
                setSelectedTrainId(null);
                void Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.closeLabel, { color: colors.accent }]}>Done</Text>
            </Pressable>
          </View>
          <Text style={[styles.detailMeta, { color: colors.labelSecondary }]}>
            Direction {selectedTrain?.direction ?? '-'} • Bearing {Math.round(selectedTrain?.bearing ?? 0)}°
          </Text>
          <Text style={[styles.detailMeta, { color: colors.labelSecondary }]}>
            Lat {selectedTrain?.latitude.toFixed(4) ?? '-'} • Lon {selectedTrain?.longitude.toFixed(4) ?? '-'}
          </Text>
          <View style={{ height: insets.bottom + tokens.spacing.sm }} />
        </BlurView>
      </Animated.View>

      {/* Station arrival sheet */}
      {selectedStation && (
        <StationArrivalSheet
          station={selectedStation}
          animatedValue={stationSheet}
          onDismiss={() => setSelectedStationId(null)}
        />
      )}
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
    width: '92%',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
  },
  mockNotice: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '500',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  errorCard: {
    width: '92%',
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  dismissButton: {
    marginTop: tokens.spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  dismissLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  detailCard: {
    width: '100%',
    paddingTop: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailRouteBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  detailRouteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  detailLineName: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  closeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  mapIsland: {
    position: 'absolute',
    right: 14,
    zIndex: 10,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  islandBtn: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  islandDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
  },
});
