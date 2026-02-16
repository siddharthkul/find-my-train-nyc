import { useEffect, useState } from 'react';
import { Appearance, StyleSheet } from 'react-native';

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
  /** Color for box-shadow / elevation */
  shadow: string;
  /** Text color for route badges (white in both themes) */
  badgeText: string;
  /** Grab-handle on bottom sheets */
  handle: string;
  /** Subtle material tint layered over glass surfaces */
  sheetFill: string;
  /** Thin highlight stroke around glass surfaces */
  sheetStroke: string;
  /** Search field fill inside glass sheets */
  searchFieldBg: string;
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
  shadow: '#000000',
  badgeText: '#FFFFFF',
  handle: '#3C3C4399',
  sheetFill: 'rgba(255,255,255,0.18)',
  sheetStroke: 'rgba(255,255,255,0.24)',
  searchFieldBg: 'rgba(0,0,0,0.10)',
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
  shadow: '#000000',
  badgeText: '#FFFFFF',
  handle: '#EBEBF599',
  sheetFill: 'rgba(12,14,20,0.38)',
  sheetStroke: 'rgba(255,255,255,0.10)',
  searchFieldBg: 'rgba(0,0,0,0.42)',
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
  /** 4-px grid spacing scale */
  spacing: {
    xxxs: 1,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
    full: 999,
  },

  font: {
    size: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      title: 22,
    },
    weight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },

  /** Reusable component sizes (badges, buttons, tap targets) */
  size: {
    badgeSm: 22,
    badgeMd: 30,
    badgeLg: 36,
    hitSlop: 36,
    islandBtn: 46,
  },

  motion: {
    spring: {
      damping: 22,
      stiffness: 220,
      mass: 0.8,
    },
  },
};

// ── Shared bottom-sheet styles ──────────────────────────────────────
//
// All three bottom panels (train detail, station arrivals, nearby bar)
// share this base so they look identical.  Each screen spreads these
// and adds its own specifics (maxHeight, content area, etc.).

export const sheetStyles = StyleSheet.create({
  /** Full-width overlay container for animated bottom sheets */
  overlay: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
  },
  /** Edge-to-edge card — top corners rounded, flush to bottom like Apple Maps */
  card: {
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    paddingTop: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.xl,
    paddingBottom: tokens.spacing.sm,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  /** Small grab indicator at the top of a sheet */
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center' as const,
    marginBottom: tokens.spacing.md,
  },
  /** Standard header row: title on the left, Done on the right */
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: tokens.spacing.md,
  },
  /** "Done" button text */
  doneText: {
    fontSize: tokens.font.size.lg,
    fontWeight: tokens.font.weight.semibold,
  },
});
