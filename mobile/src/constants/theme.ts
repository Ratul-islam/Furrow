/**
 * Design tokens for Furrow. Every screen reads colours from here (via useTheme),
 * so light and dark stay in step.
 *
 * Chart colours follow the validated categorical order (blue, orange, aqua,
 * yellow, magenta) with separate dark-mode steps. Status colours are reserved
 * for good / warning / serious / critical and always ship with a label.
 */

import '@/global.css';

import { Platform } from 'react-native';

const shared = {
  status: {
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
  },
};

export const Colors = {
  light: {
    ...shared,
    background: '#f4f5f1',
    card: '#ffffff',
    cardMuted: '#f7f7f4',
    text: '#0b0b0b',
    textSecondary: '#46453f',
    textMuted: '#66655f',
    border: '#e6e5df',
    grid: '#ecebe6',
    axis: '#8f8e87',
    brand: '#17734a',
    brandSoft: '#e3f1e8',
    brandInk: '#0f5535',
    demo: '#8a5a00',
    demoSoft: '#fdf1d6',
    series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
    // one-hue green ramp for canopy cover (light = bare, dark = full cover)
    canopy: ['#eef6ec', '#d2eacd', '#acd9a6', '#7fc27c', '#53a65a', '#2f8743', '#17673a'],
    // diverging: drier (red) <- neutral grey -> wetter (blue)
    diverging: ['#c6403f', '#e98f8e', '#f5cdcc', '#f0efec', '#c7dcf6', '#7fb0ec', '#2a78d6'],
    family: {
      cereal: '#e8b64a',
      legume: '#4fae76',
      oilseed: '#f2d43d',
      tuber: '#c08a5b',
      fibre: '#b9a37a',
      vegetable: '#8fcf6a',
      fallow: '#e3e1da',
    },
  },
  dark: {
    ...shared,
    background: '#0f100e',
    card: '#1a1a19',
    cardMuted: '#222220',
    text: '#f0efec',
    textSecondary: '#d0cfc6',
    textMuted: '#a9a8a0',
    border: '#2d2d2a',
    grid: '#2a2a27',
    axis: '#6f6e68',
    brand: '#46b37c',
    brandSoft: '#16291f',
    brandInk: '#8fdab2',
    demo: '#f2c25c',
    demoSoft: '#30260f',
    series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
    canopy: ['#1f2a1f', '#23402a', '#2a5a33', '#33753e', '#3f914b', '#58ad5f', '#7fcb7d'],
    diverging: ['#d85a59', '#a54948', '#5c3534', '#383835', '#2e4a6e', '#3f6fae', '#5598e7'],
    family: {
      cereal: '#c99632',
      legume: '#3c9662',
      oilseed: '#cdb22a',
      tuber: '#9d6f47',
      fibre: '#8f7c58',
      vegetable: '#6aa64c',
      fallow: '#34342f',
    },
  },
} as const;

export type Theme = (typeof Colors)['light'] | (typeof Colors)['dark'];

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace', rounded: 'ui-rounded' },
  web: { sans: 'var(--font-display)', mono: 'var(--font-mono)', rounded: 'var(--font-display)' },
  default: { sans: 'normal', mono: 'monospace', rounded: 'normal' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const MaxContentWidth = 560;
