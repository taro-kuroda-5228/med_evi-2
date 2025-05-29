import { Theme, ThemeColors, ThemeSpacing, ThemeTypography } from '@/types/theme';

// 共通のスペーシング設定
const spacing: ThemeSpacing = {
  xs: '0.5rem', // 8px
  sm: '0.75rem', // 12px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  xxl: '3rem', // 48px
};

// 共通のタイポグラフィ設定
const typography: ThemeTypography = {
  fontFamily: 'Inter, "Noto Sans JP", sans-serif',
  fontFamilyMono:
    'Monaco, "Cascadia Code", "Segoe UI Mono", "Roboto Mono", Consolas, "Courier New", monospace',
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

// ライトテーマの色設定
const lightColors: ThemeColors = {
  // Primary colors - 医療をイメージした信頼できるブルー
  primary: '#4A90E2',
  primaryHover: '#357ABD',
  primaryActive: '#2E6BA8',

  // Background colors
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceHover: '#F1F5F9',
  surfaceActive: '#E2E8F0',

  // Text colors
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textInverse: '#FFFFFF',

  // Border colors
  border: '#E2E8F0',
  borderHover: '#CBD5E1',
  borderActive: '#94A3B8',

  // State colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Medical theme specific
  medical: '#06B6D4', // シアン系 - 医療機器の色
  evidence: '#8B5CF6', // パープル系 - 科学・研究の色
  research: '#059669', // エメラルド系 - 成長・発見の色

  // Shadow colors
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowMedium: 'rgba(0, 0, 0, 0.15)',
  shadowLarge: 'rgba(0, 0, 0, 0.25)',
};

// ダークテーマの色設定
const darkColors: ThemeColors = {
  // Primary colors - ダークモードでも視認性の高いブルー
  primary: '#60A5FA',
  primaryHover: '#3B82F6',
  primaryActive: '#2563EB',

  // Background colors
  background: '#0F172A',
  surface: '#1E293B',
  surfaceHover: '#334155',
  surfaceActive: '#475569',

  // Text colors
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textInverse: '#1E293B',

  // Border colors
  border: '#334155',
  borderHover: '#475569',
  borderActive: '#64748B',

  // State colors
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // Medical theme specific
  medical: '#22D3EE', // より明るいシアン
  evidence: '#A78BFA', // より明るいパープル
  research: '#10B981', // より明るいエメラルド

  // Shadow colors
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.4)',
  shadowLarge: 'rgba(0, 0, 0, 0.6)',
};

// 共通の設定
const commonThemeConfig = {
  spacing,
  typography,
  borderRadius: {
    none: '0',
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    full: '9999px',
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

// ライトテーマ
export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  ...commonThemeConfig,
};

// ダークテーマ
export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  ...commonThemeConfig,
};

// テーママップ
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

// CSS変数生成ユーティリティ
export const generateCSSVariables = (theme: Theme): Record<string, string> => {
  const variables: Record<string, string> = {};

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    variables[`--color-${key}`] = value;
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    variables[`--spacing-${key}`] = value;
  });

  // Typography
  variables['--font-family'] = theme.typography.fontFamily;
  variables['--font-family-mono'] = theme.typography.fontFamilyMono;

  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    variables[`--font-size-${key}`] = value;
  });

  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    variables[`--font-weight-${key}`] = value;
  });

  Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
    variables[`--line-height-${key}`] = value;
  });

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    variables[`--border-radius-${key}`] = value;
  });

  // Animation
  Object.entries(theme.animation.duration).forEach(([key, value]) => {
    variables[`--duration-${key}`] = value;
  });

  Object.entries(theme.animation.easing).forEach(([key, value]) => {
    variables[`--easing-${key}`] = value;
  });

  return variables;
};
