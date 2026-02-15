import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';

// ── Color palettes ──────────────────────────────────────────────────

type ColorPalette = {
  background: string;
  card: string;
  labelPrimary: string;
  labelSecondary: string;
  borderSubtle: string;
  danger: string;
  dangerBorder: string;
  dangerText: string;
  tint: string;
  accent: string;
  mockNotice: string;
  mapBtn: string;
  mapBtnPressed: string;
  dismissBg: string;
  badgeBorder: string;
  blurTint: 'light' | 'dark';
  stationDot: string;
  stationLabel: string;
  stationLabelBg: string;
};

const lightColors: ColorPalette = {
  background: '#F2F2F7',
  card: '#FFFFFFCC',
  labelPrimary: '#0A0A0A',
  labelSecondary: '#5A5A5F',
  borderSubtle: '#D6D6DC',
  danger: '#C62828',
  dangerBorder: '#F2CACA',
  dangerText: '#892323',
  tint: '#007AFF',
  accent: '#1273EA',
  mockNotice: '#2B5EA8',
  mapBtn: '#FFFFFFFA',
  mapBtnPressed: '#E8E8ED',
  dismissBg: '#FFFFFFCC',
  badgeBorder: '#FFFFFFE6',
  blurTint: 'light',
  stationDot: '#FFFFFF',
  stationLabel: '#1C1C1E',
  stationLabelBg: 'rgba(255,255,255,0.85)',
};

const darkColors: ColorPalette = {
  background: '#000000',
  card: '#1C1C1ECC',
  labelPrimary: '#F5F5F7',
  labelSecondary: '#98989F',
  borderSubtle: '#38383A',
  danger: '#FF453A',
  dangerBorder: '#5C2626',
  dangerText: '#FF6B6B',
  tint: '#0A84FF',
  accent: '#0A84FF',
  mockNotice: '#5AC8FA',
  mapBtn: '#2C2C2EFA',
  mapBtnPressed: '#3A3A3C',
  dismissBg: '#2C2C2ECC',
  badgeBorder: '#FFFFFF33',
  blurTint: 'dark' as const,
  stationDot: '#1C1C1E',
  stationLabel: '#F5F5F7',
  stationLabelBg: 'rgba(28,28,30,0.85)',
};

export type AppColors = ColorPalette;

// ── Hook ────────────────────────────────────────────────────────────

/**
 * Reads the system color scheme and subscribes to live changes via
 * `Appearance.addChangeListener`.  More reliable than the built-in
 * `useColorScheme()` hook across Expo Go / dev-client configurations.
 */
function useSystemScheme() {
  const [scheme, setScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  return scheme;
}

/** Returns the color palette matching the current system appearance. */
export function useColors(): AppColors {
  const scheme = useSystemScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

/** Returns `true` when the system is in dark mode. */
export function useIsDark(): boolean {
  return useSystemScheme() === 'dark';
}

// ── Non-color tokens (shared across themes) ─────────────────────────

export const tokens = {
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
  },
  radius: {
    md: 14,
    lg: 22,
    full: 999,
  },
  motion: {
    spring: {
      damping: 18,
      stiffness: 180,
      mass: 0.9,
    },
  },
};
