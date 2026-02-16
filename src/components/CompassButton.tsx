import * as Haptics from 'expo-haptics';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens, useColors } from '../theme/tokens';
import { GlassCard } from './GlassCard';

const DIAL_SIZE = 44;
const TICK_COUNT = 12;
const TICK_ANGLES = Array.from({ length: TICK_COUNT }, (_, i) => (360 / TICK_COUNT) * i);

type Props = {
  heading: number;
  onResetNorth: () => void;
};

export const CompassButton = memo(function CompassButton({ heading, onResetNorth }: Props) {
  const colors = useColors();

  return (
    <GlassCard
      intensity={70}
      style={[
        styles.glass,
        {
          backgroundColor: colors.sheetFill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.sheetStroke,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <Pressable
        onPress={() => {
          onResetNorth();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        style={({ pressed }) => [
          styles.btn,
          pressed && { opacity: 0.7 },
        ]}
      >
        {/* Rotating dial */}
        <View style={[styles.dial, { transform: [{ rotate: `${-heading}deg` }] }]}>
          {/* Tick marks */}
          {TICK_ANGLES.map((angle) => {
            const isCardinal = angle % 90 === 0;
            return (
              <View
                key={angle}
                style={[
                  styles.tickContainer,
                  { transform: [{ rotate: `${angle}deg` }] },
                ]}
              >
                <View
                  style={[
                    isCardinal ? styles.tickCardinal : styles.tick,
                    { backgroundColor: colors.labelSecondary },
                  ]}
                />
              </View>
            );
          })}

          {/* North indicator — red triangle */}
          <View style={styles.northTriangle} />

          {/* Center letter */}
          <Text style={[styles.letter, { color: colors.labelPrimary }]}>N</Text>
        </View>
      </Pressable>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  glass: {
    borderRadius: DIAL_SIZE / 2 + 4,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  btn: {
    width: DIAL_SIZE + 8,
    height: DIAL_SIZE + 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickContainer: {
    position: 'absolute',
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
  },
  tick: {
    width: 1,
    height: 4,
    borderRadius: 0.5,
    marginTop: 1,
  },
  tickCardinal: {
    width: 1.5,
    height: 6,
    borderRadius: 0.75,
    marginTop: 0,
  },
  northTriangle: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#EE352E',
  },
  letter: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
  },
});
