import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRouteColor } from '../data/mta/routeColors';
import type { ArrivalPrediction } from '../data/mta/types';
import { type AppColors, tokens, useColors } from '../theme/tokens';

// ── Types ──────────────────────────────────────────────────────────

type Props = {
  arrivals: ArrivalPrediction[];
  stationName: string;
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
  stationName,
  onSearchPress,
  onHeightChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      onHeightChange?.(e.nativeEvent.layout.height);
    },
    [onHeightChange],
  );

  // Tick to refresh countdowns every 15s
  const [, setTick] = useState(0);
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
  }, [arrivals]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <BlurView
        intensity={80}
        tint={colors.blurTint}
        style={[styles.card, { borderColor: colors.borderSubtle }]}
      >
        {/* Search bar */}
        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.background + 'AA' }]}
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

        {/* Arrivals list */}
        {rows.length > 0 ? (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: insets.bottom + tokens.spacing.sm }}
            renderItem={({ item }) => (
              <ArrivalItem item={item} stationName={stationName} colors={colors} />
            )}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: colors.borderSubtle }]} />
            )}
          />
        ) : (
          <View style={{ paddingBottom: insets.bottom + tokens.spacing.md }}>
            <Text style={[styles.emptyText, { color: colors.labelSecondary }]}>
              Loading arrivals...
            </Text>
          </View>
        )}
      </BlurView>
    </View>
  );
});

// ── Row component ──────────────────────────────────────────────────

const ArrivalItem = memo(function ArrivalItem({
  item,
  stationName,
  colors,
}: {
  item: ArrivalRow;
  stationName: string;
  colors: AppColors;
}) {
  const routeColor = getRouteColor(item.routeId);
  const eta = formatEta(item.etaMin);
  const isNow = item.etaMin <= 0;

  return (
    <View style={styles.row}>
      {/* Route badge */}
      <View style={[styles.routeBadge, { backgroundColor: routeColor }]}>
        <Text style={styles.routeText}>{item.routeId}</Text>
      </View>

      {/* Direction + station */}
      <View style={styles.rowInfo}>
        <Text style={[styles.rowDirection, { color: colors.labelPrimary }]} numberOfLines={1}>
          {item.directionLabel || item.routeId + ' Train'}
        </Text>
        {stationName ? (
          <Text style={[styles.rowStation, { color: colors.labelSecondary }]} numberOfLines={1}>
            {stationName}
          </Text>
        ) : null}
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
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    paddingTop: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 16,
    fontWeight: '500',
  },
  list: {
    marginTop: tokens.spacing.sm,
    maxHeight: 260,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  routeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rowInfo: {
    flex: 1,
  },
  rowDirection: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowStation: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    minWidth: 50,
    justifyContent: 'flex-end',
  },
  etaNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  etaUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: tokens.spacing.md,
  },
});
