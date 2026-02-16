import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { MapType } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sheetStyles, tokens, useColors } from '../theme/tokens';
import { GlassCard } from './GlassCard';

type Props = {
  currentMapType: MapType;
  onSelect: (mapType: MapType) => void;
  onClose: () => void;
  onHeightChange?: (height: number) => void;
};

const MAP_OPTIONS: { type: MapType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'standard', label: 'Map', icon: 'map-outline' },
  { type: 'hybrid', label: 'Transit', icon: 'bus-outline' },
  { type: 'satellite', label: 'Satellite', icon: 'globe-outline' },
];

export const MapLayerPicker = memo(function MapLayerPicker({
  currentMapType,
  onSelect,
  onClose,
  onHeightChange,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Slide-in animation
  const slideAnim = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      ...tokens.motion.spring,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleSelect = useCallback(
    (type: MapType) => {
      onSelect(type);
      void Haptics.selectionAsync();
    },
    [onSelect],
  );

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync();
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideAnim]);

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      onHeightChange?.(e.nativeEvent.layout.height);
    },
    [onHeightChange],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
      onLayout={handleLayout}
    >
      <GlassCard
        intensity={70}
        style={[
          sheetStyles.card,
          {
            backgroundColor: colors.sheetFill,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.sheetStroke,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.labelPrimary }]}>
            Map Style
          </Text>
          <Pressable hitSlop={tokens.size.hitSlop} onPress={handleClose}>
            <Ionicons name="close-circle" size={28} color={colors.labelSecondary} />
          </Pressable>
        </View>

        {/* Options */}
        <View style={styles.optionsRow}>
          {MAP_OPTIONS.map((opt) => {
            const isActive = currentMapType === opt.type;
            return (
              <Pressable
                key={opt.type}
                style={[
                  styles.option,
                  {
                    backgroundColor: isActive
                      ? colors.accent
                      : colors.searchFieldBg,
                  },
                ]}
                onPress={() => handleSelect(opt.type)}
              >
                <Ionicons
                  name={opt.icon}
                  size={24}
                  color={isActive ? '#FFFFFF' : colors.labelPrimary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isActive ? '#FFFFFF' : colors.labelPrimary },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: insets.bottom }} />
      </GlassCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.font.size.xl,
    fontWeight: tokens.font.weight.bold,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.xs,
  },
  optionLabel: {
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.semibold,
  },
});
