import { Ionicons } from '@expo/vector-icons';
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
import { getRouteColor, getRouteTextColor } from '../data/mta/routeColors';
import { useArrivalStore } from '../data/mta/stores/arrivalStore';
import type { SubwayStation } from '../data/mta/subwayStations';
import type { ArrivalPrediction } from '../data/mta/types';
import { type AppColors, sheetStyles, tokens, useColors } from '../theme/tokens';
import { GlassCard } from './GlassCard';

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

  // Distinguish loading from genuinely empty
  const hasLoadedOnce = rawArrivals !== undefined;

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        sheetStyles.overlay,
        {
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
      <GlassCard
        intensity={80}
        style={[
          sheetStyles.card,
          {
            maxHeight: 360,
            backgroundColor: colors.sheetFill,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.sheetStroke,
          },
        ]}
      >
        {/* Handle */}
        <View style={[sheetStyles.handle, { backgroundColor: colors.handle }]} />

        {/* Header */}
        <View style={sheetStyles.headerRow}>
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
                  <Text style={[styles.smallBadgeText, { color: getRouteTextColor(route) }]}>{route}</Text>
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
            hitSlop={tokens.size.hitSlop}
            onPress={() => {
              onDismiss();
              void Haptics.selectionAsync();
            }}
          >
            <Text style={[sheetStyles.doneText, { color: colors.accent }]}>
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
              Loading arrivals…
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.labelSecondary }]}>
            {hasLoadedOnce ? 'No upcoming trains at this station' : 'Loading arrivals…'}
          </Text>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={{ paddingBottom: tokens.spacing.sm }}
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
      </GlassCard>
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
        <Text style={[styles.arrivalBadgeText, { color: getRouteTextColor(arrival.routeId) }]}>{arrival.routeId}</Text>
      </View>
      <Text
        style={[
          styles.countdown,
          {
            color: isNow ? colors.accent : colors.labelPrimary,
            fontWeight: isNow ? tokens.font.weight.bold : tokens.font.weight.semibold,
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
  headerLeft: {
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  stationName: {
    fontSize: tokens.font.size.xl,
    fontWeight: tokens.font.weight.bold,
  },
  routeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  smallBadge: {
    width: tokens.size.badgeSm,
    height: tokens.size.badgeSm,
    borderRadius: tokens.size.badgeSm / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallBadgeText: {
    fontSize: tokens.font.size.xs + 1,
    fontWeight: tokens.font.weight.bold,
  },
  adaIcon: {
    marginLeft: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  loadingText: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.medium,
  },
  emptyText: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.medium,
    textAlign: 'center',
    paddingVertical: tokens.spacing.lg,
  },
  scrollArea: {
    marginTop: tokens.spacing.sm,
  },
  group: {
    marginBottom: tokens.spacing.sm,
  },
  groupLabel: {
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.sm,
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.xs + 1,
    gap: tokens.spacing.sm,
  },
  arrivalBadge: {
    width: tokens.size.badgeSm + 4,
    height: tokens.size.badgeSm + 4,
    borderRadius: (tokens.size.badgeSm + 4) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrivalBadgeText: {
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.bold,
  },
  countdown: {
    fontSize: tokens.font.size.lg,
    flex: 1,
  },
  delayBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  delayText: {
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.bold,
  },
});
