/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    card: '#ffffff',
    border: '#E5E7EB',
    primary: '#3B82F6',
    primaryText: '#ffffff',
    danger: '#EF4444',
    dangerBackground: '#FEF2F2',
    placeholder: '#9CA3AF',
    bubbleMine: '#3B82F6',
    bubbleMineText: '#ffffff',
    bubbleTheirs: '#ffffff',
    bubbleTheirsText: '#1F2937',
    chatBackground: '#F9FAFB',
    online: '#22C55E',
    typingDot: '#22C55E',
  },
  dark: {
    text: '#F3F4F6',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    card: '#111214',
    border: '#26272B',
    primary: '#3B82F6',
    primaryText: '#ffffff',
    danger: '#F87171',
    dangerBackground: '#3B0D0D',
    placeholder: '#6B7280',
    bubbleMine: '#3B82F6',
    bubbleMineText: '#ffffff',
    bubbleTheirs: '#1F2125',
    bubbleTheirsText: '#F3F4F6',
    chatBackground: '#050506',
    online: '#22C55E',
    typingDot: '#4ADE80',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
