import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRouteColor } from '../data/mta/routeColors';
import { useArrivalStore } from '../data/mta/stores/arrivalStore';
import type { SubwayStation } from '../data/mta/subwayStations';
import type { ArrivalPrediction } from '../data/mta/types';
import { type AppColors, tokens, useColors } from '../theme/tokens';

// ── Types ──────────────────────────────────────────────────────────

const EMPTY_ARRIVALS: ArrivalPrediction[] = [];

type Props = {
  station: SubwayStation;
  animatedValue: Animated.Value;
  onDismiss: () => void;
};

type ArrivalGroup = {
  label: string;
  arrivals: ArrivalPrediction[];
};

// ── Helpers ────────────────────────────────────────────────────────

function formatCountdown(arrivalTimeSec: number, nowMs: number): string {
  const diffSec = Math.max(0, arrivalTimeSec - Math.floor(nowMs / 1000));
  if (diffSec < 30) return 'Now';
  const mins = Math.round(diffSec / 60);
  return `${mins} min`;
}

function directionLabel(dir: string): string {
  switch (dir) {
    case 'N':
      return 'Uptown';
    case 'S':
      return 'Downtown';
    case 'E':
      return 'Eastbound';
    case 'W':
      return 'Westbound';
    default:
      return 'Unknown';
  }
}

function groupByDirection(arrivals: ArrivalPrediction[]): ArrivalGroup[] {
  const nowSec = Math.floor(Date.now() / 1000);
  // Filter out arrivals that have already passed
  const upcoming = arrivals.filter((a) => a.arrivalTime > nowSec - 30);
  // Sort by arrival time
  upcoming.sort((a, b) => a.arrivalTime - b.arrivalTime);

  const groups = new Map<string, ArrivalPrediction[]>();
  for (const arrival of upcoming) {
    const key = arrival.direction;
    const list = groups.get(key) ?? [];
    list.push(arrival);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([dir, list]) => ({
      label: directionLabel(dir),
      arrivals: list.slice(0, 6), // Cap at 6 per direction
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ── Component ──────────────────────────────────────────────────────

export const StationArrivalSheet = memo(function StationArrivalSheet({
  station,
  animatedValue,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const rawArrivals = useArrivalStore(
    (state) => state.arrivals[station.id],
  );
  const isLoading = useArrivalStore((state) => state.isLoading);
  const arrivals = rawArrivals ?? EMPTY_ARRIVALS;

  // Tick counter to refresh countdowns every 10s
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  const groups = useMemo(() => groupByDirection(arrivals), [arrivals]);
  const nowMs = Date.now();

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.overlay,
        {
          paddingBottom: 0,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0],
              }),
            },
          ],
          opacity: animatedValue,
        },
      ]}
    >
      <BlurView
        intensity={80}
        tint={colors.blurTint}
        style={[styles.card, { borderColor: colors.borderSubtle }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text
              style={[styles.stationName, { color: colors.labelPrimary }]}
              numberOfLines={1}
            >
              {station.name}
            </Text>
            <View style={styles.routeBadges}>
              {station.routes.map((route) => (
                <View
                  key={route}
                  style={[
                    styles.smallBadge,
                    { backgroundColor: getRouteColor(route) },
                  ]}
                >
                  <Text style={styles.smallBadgeText}>{route}</Text>
                </View>
              ))}
              {station.ada && (
                <Ionicons
                  name="accessibility"
                  size={14}
                  color={colors.labelSecondary}
                  style={styles.adaIcon}
                />
              )}
            </View>
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => {
              onDismiss();
              void Haptics.selectionAsync();
            }}
          >
            <Text style={[styles.doneLabel, { color: colors.accent }]}>
              Done
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        {isLoading && arrivals.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.labelSecondary} />
            <Text
              style={[styles.loadingText, { color: colors.labelSecondary }]}
            >
              Loading arrivals...
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.labelSecondary }]}>
            No upcoming trains at this station
          </Text>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={{ paddingBottom: insets.bottom + tokens.spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            {groups.map((group) => (
              <DirectionGroup
                key={group.label}
                group={group}
                nowMs={nowMs}
                colors={colors}
              />
            ))}
          </ScrollView>
        )}
      </BlurView>
    </Animated.View>
  );
});

// ── Direction group ────────────────────────────────────────────────

const DirectionGroup = memo(function DirectionGroup({
  group,
  nowMs,
  colors,
}: {
  group: ArrivalGroup;
  nowMs: number;
  colors: AppColors;
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: colors.labelSecondary }]}>
        {group.label}
      </Text>
      {group.arrivals.map((arrival) => (
        <ArrivalRow
          key={arrival.id}
          arrival={arrival}
          nowMs={nowMs}
          colors={colors}
        />
      ))}
    </View>
  );
});

// ── Arrival row ────────────────────────────────────────────────────

const ArrivalRow = memo(function ArrivalRow({
  arrival,
  nowMs,
  colors,
}: {
  arrival: ArrivalPrediction;
  nowMs: number;
  colors: AppColors;
}) {
  const countdown = formatCountdown(arrival.arrivalTime, nowMs);
  const isNow = countdown === 'Now';
  const routeColor = getRouteColor(arrival.routeId);

  return (
    <View style={styles.arrivalRow}>
      <View style={[styles.arrivalBadge, { backgroundColor: routeColor }]}>
        <Text style={styles.arrivalBadgeText}>{arrival.routeId}</Text>
      </View>
      <Text
        style={[
          styles.countdown,
          {
            color: isNow ? colors.accent : colors.labelPrimary,
            fontWeight: isNow ? '700' : '600',
          },
        ]}
      >
        {countdown}
      </Text>
      {arrival.delay > 60 && (
        <View
          style={[
            styles.delayBadge,
            { backgroundColor: colors.dangerBorder },
          ]}
        >
          <Text style={[styles.delayText, { color: colors.danger }]}>
            Delayed
          </Text>
        </View>
      )}
    </View>
  );
});

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxHeight: 360,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  stationName: {
    fontSize: 17,
    fontWeight: '700',
  },
  routeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  smallBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  adaIcon: {
    marginLeft: 2,
  },
  doneLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: tokens.spacing.md,
  },
  scrollArea: {
    marginTop: tokens.spacing.sm,
  },
  group: {
    marginBottom: tokens.spacing.sm,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: tokens.spacing.sm,
  },
  arrivalBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrivalBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  countdown: {
    fontSize: 15,
    flex: 1,
  },
  delayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  delayText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
