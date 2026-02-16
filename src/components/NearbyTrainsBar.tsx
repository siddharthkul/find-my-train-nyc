import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRouteColor, getRouteTextColor } from '../data/mta/routeColors';
import type { SubwayStation } from '../data/mta/subwayStations';
import type { ArrivalPrediction } from '../data/mta/types';
import { type AppColors, sheetStyles, tokens, useColors } from '../theme/tokens';
import { GlassCard } from './GlassCard';

// ── Types ──────────────────────────────────────────────────────────

type Props = {
  arrivals: ArrivalPrediction[];
  /** The station whose arrivals are being shown */
  station: SubwayStation | null;
  /** True when a user tapped a specific station (not auto-nearest) */
  isPinned?: boolean;
  /** Dismiss the pinned station and revert to auto-nearest */
  onDismissStation?: () => void;
  onSearchPress: () => void;
  onHeightChange?: (height: number) => void;
};

type ArrivalRow = {
  id: string;
  routeId: string;
  directionLabel: string;
  etaMin: number;
};

// ── Helpers ────────────────────────────────────────────────────────

/** Derive direction from the arrival's stopId suffix when trip direction is UNK */
function dirFromArrival(a: ArrivalPrediction): string {
  if (a.direction !== 'UNK') return a.direction;
  // stopId often ends with N or S (e.g. "A15N")
  const last = a.stopId?.charAt(a.stopId.length - 1);
  if (last === 'N') return 'N';
  if (last === 'S') return 'S';
  return 'UNK';
}

function dirLabel(dir: string): string {
  switch (dir) {
    case 'N': return 'Uptown';
    case 'S': return 'Downtown';
    case 'E': return 'Eastbound';
    case 'W': return 'Westbound';
    default: return '';
  }
}

function formatEta(min: number): string {
  if (min <= 0) return 'Now';
  return `${min}`;
}

// ── Main component ─────────────────────────────────────────────────

export const NearbyTrainsBar = memo(function NearbyTrainsBar({
  arrivals,
  station,
  isPinned = false,
  onDismissStation,
  onSearchPress,
  onHeightChange,
}: Props) {
  const stationName = station?.name ?? '';
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      onHeightChange?.(e.nativeEvent.layout.height);
    },
    [onHeightChange],
  );

  // Tick to refresh countdowns every 15s
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(timer);
  }, []);

  // Build arrival rows — deduplicate by route+direction, keep soonest
  const rows = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const best = new Map<string, ArrivalRow>();

    for (const a of arrivals) {
      const diffSec = a.arrivalTime - nowSec;
      if (diffSec < -30) continue; // already departed
      const min = Math.max(0, Math.round(diffSec / 60));
      const dir = dirFromArrival(a);
      const key = `${a.routeId}-${dir}`;

      const existing = best.get(key);
      if (!existing || min < existing.etaMin) {
        best.set(key, {
          id: key,
          routeId: a.routeId,
          directionLabel: dirLabel(dir),
          etaMin: min,
        });
      }
    }

    // Sort by ETA ascending (soonest first)
    return Array.from(best.values()).sort((a, b) => a.etaMin - b.etaMin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivals, tick]);

  // Distinguish between "still loading" and "loaded but empty"
  const hasLoadedOnce = arrivals.length > 0 || rows.length > 0;

  return (
    <View style={[styles.container, { bottom: insets.bottom + 6 }]} onLayout={handleLayout}>
      <GlassCard
        intensity={80}
        style={[
          sheetStyles.card,
          {
            backgroundColor: colors.sheetFill,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.sheetStroke,
          },
        ]}
      >
        {/* Search bar */}
        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.searchFieldBg }]}
          onPress={() => {
            onSearchPress();
            void Haptics.selectionAsync();
          }}
        >
          <Ionicons name="search" size={18} color={colors.labelSecondary} />
          <Text style={[styles.searchPlaceholder, { color: colors.labelSecondary }]}>
            Where to?
          </Text>
        </Pressable>

        {/* Station header */}
        {stationName ? (
          isPinned ? (
            <View style={styles.pinnedHeader}>
              <Text
                style={[styles.pinnedStationName, { color: colors.labelPrimary }]}
                numberOfLines={1}
              >
                {stationName}
              </Text>
              {station?.routes ? (
                station.routes.map((route) => (
                  <View
                    key={route}
                    style={[styles.miniRouteBadge, { backgroundColor: getRouteColor(route) }]}
                  >
                    <Text style={[styles.miniRouteText, { color: getRouteTextColor(route) }]}>{route}</Text>
                  </View>
                ))
              ) : null}
            </View>
          ) : (
            <Text style={[styles.sectionHeader, { color: colors.labelSecondary }]} numberOfLines={1}>
              Arriving at {stationName}
            </Text>
          )
        ) : null}

        {/* Arrivals list */}
        {rows.length > 0 ? (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: tokens.spacing.sm }}
            renderItem={({ item }) => (
              <ArrivalItem item={item} colors={colors} />
            )}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: colors.borderSubtle }]} />
            )}
          />
        ) : (
          <View style={{ paddingBottom: tokens.spacing.lg }}>
            {hasLoadedOnce ? (
              <Text style={[styles.emptyText, { color: colors.labelSecondary }]}>
                No trains arriving soon
              </Text>
            ) : (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.labelSecondary} />
                <Text style={[styles.emptyText, { color: colors.labelSecondary }]}>
                  Loading arrivals…
                </Text>
              </View>
            )}
          </View>
        )}
      </GlassCard>
    </View>
  );
});

// ── Row component ──────────────────────────────────────────────────

const ArrivalItem = memo(function ArrivalItem({
  item,
  colors,
}: {
  item: ArrivalRow;
  colors: AppColors;
}) {
  const routeColor = getRouteColor(item.routeId);
  const eta = formatEta(item.etaMin);
  const isNow = item.etaMin <= 0;

  return (
    <View style={styles.row}>
      {/* Route badge */}
      <View style={[styles.routeBadge, { backgroundColor: routeColor }]}>
        <Text style={[styles.routeText, { color: getRouteTextColor(item.routeId) }]}>{item.routeId}</Text>
      </View>

      {/* Direction */}
      <View style={styles.rowInfo}>
        <Text style={[styles.rowDirection, { color: colors.labelPrimary }]} numberOfLines={1}>
          {item.directionLabel || item.routeId + ' Train'}
        </Text>
      </View>

      {/* ETA */}
      <View style={styles.etaContainer}>
        <Text
          style={[
            styles.etaNumber,
            { color: isNow ? colors.accent : colors.labelPrimary },
          ]}
        >
          {eta}
        </Text>
        {!isNow && (
          <Text style={[styles.etaUnit, { color: colors.labelSecondary }]}>
            min
          </Text>
        )}
      </View>
    </View>
  );
});

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  searchPlaceholder: {
    fontSize: tokens.font.size.lg,
    fontWeight: tokens.font.weight.medium,
  },
  sectionHeader: {
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  pinnedStationName: {
    fontSize: tokens.font.size.xl,
    fontWeight: tokens.font.weight.bold,
    marginRight: tokens.spacing.xs,
  },
  miniRouteBadge: {
    width: tokens.size.badgeSm,
    height: tokens.size.badgeSm,
    borderRadius: tokens.size.badgeSm / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniRouteText: {
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.bold,
  },
  list: {
    maxHeight: 260,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: tokens.size.badgeMd + tokens.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  routeBadge: {
    width: tokens.size.badgeMd,
    height: tokens.size.badgeMd,
    borderRadius: tokens.size.badgeMd / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeText: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
  },
  rowInfo: {
    flex: 1,
  },
  rowDirection: {
    fontSize: tokens.font.size.lg,
    fontWeight: tokens.font.weight.semibold,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    minWidth: 50,
    justifyContent: 'flex-end',
  },
  etaNumber: {
    fontSize: tokens.font.size.title,
    fontWeight: tokens.font.weight.bold,
  },
  etaUnit: {
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.medium,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.lg,
  },
  emptyText: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.medium,
    textAlign: 'center',
    marginTop: tokens.spacing.lg,
  },
});
