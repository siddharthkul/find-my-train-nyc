import { BlurView, type BlurTint } from 'expo-blur';
import {
  GlassView,
  type GlassStyle,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import type { PropsWithChildren } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '../theme/tokens';

const LIQUID_GLASS = isLiquidGlassAvailable();

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** BlurView intensity — ignored when liquid glass is active */
  intensity?: number;
  /** BlurView tint — ignored when liquid glass is active */
  tint?: BlurTint;
  /** Tint color passed to GlassView (optional) */
  glassTint?: string;
  /**
   * Glass effect style — 'regular' (default, slightly tinted) or
   * 'clear' (lighter, more see-through). Only applies on iOS 26+.
   */
  glassStyle?: GlassStyle;
}>;

/**
 * Renders native iOS liquid glass when available (iOS 26+),
 * otherwise falls back to expo-blur's BlurView.
 *
 * Drop-in replacement for BlurView in sheets & cards.
 */
export function GlassCard({
  children,
  style,
  intensity = 80,
  tint,
  glassTint,
  glassStyle = 'regular',
}: Props) {
  const colors = useColors();
  const resolvedTint = tint ?? colors.blurTint;

  if (LIQUID_GLASS) {
    return (
      <GlassView
        style={style}
        tintColor={glassTint}
        glassEffectStyle={glassStyle}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={resolvedTint}
      style={style}
    >
      {children}
    </BlurView>
  );
}
