'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeContextType, ThemeMode, Theme } from '@/types/theme';
import { lightTheme, darkTheme, generateCSSVariables } from '@/styles/themes';

// コンテキストの作成
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

// ローカルストレージのキー
const THEME_STORAGE_KEY = 'med-evi-theme-mode';

// システムテーマの検出
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// ローカルストレージからテーマモードを取得
const getStoredThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as ThemeMode;
    }
  } catch (error) {
    console.warn('Failed to get theme from localStorage:', error);
  }

  return 'system';
};

// ローカルストレージにテーマモードを保存
const setStoredThemeMode = (mode: ThemeMode): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
};

// CSS変数をドキュメントに適用
const applyCSSVariables = (theme: Theme): void => {
  if (typeof window === 'undefined') return;

  const variables = generateCSSVariables(theme);
  const root = document.documentElement;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // HTML要素にテーマクラスを設定
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(`theme-${theme.mode}`);

  // ダークモード用のクラスも設定（Tailwind CSS対応）
  if (theme.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'system',
}) => {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // 実際のテーマを計算
  const actualTheme = mode === 'system' ? systemTheme : mode;
  const theme: Theme = actualTheme === 'dark' ? darkTheme : lightTheme;

  const isDark = actualTheme === 'dark';
  const isSystem = mode === 'system';

  // システムテーマの変更を監視
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // 初期値を設定
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // リスナーを追加
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // 初期化時にローカルストレージからテーマを読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedMode = getStoredThemeMode();
    setModeState(storedMode);
    setIsInitialized(true);
  }, []);

  // テーマが変更されたときにCSS変数を適用
  useEffect(() => {
    if (!isInitialized) return;

    applyCSSVariables(theme);

    // メタテーマカラーの更新（PWA対応）
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.colors.primary);
    }
  }, [theme, isInitialized]);

  // テーマモードの設定
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    setStoredThemeMode(newMode);
  };

  // ライト/ダーク間のトグル（システム設定は除外）
  const toggleMode = () => {
    if (mode === 'system') {
      // システムモードの場合は、現在のシステムテーマの逆に設定
      setMode(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      // ライト/ダーク間でトグル
      setMode(mode === 'light' ? 'dark' : 'light');
    }
  };

  const contextValue: ThemeContextType = {
    theme,
    mode,
    setMode,
    toggleMode,
    isDark,
    isSystem,
  };

  // 初期化が完了するまでは children を表示しない（フラッシュ防止）
  if (!isInitialized) {
    return null;
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

// テーマコンテキストを使用するためのカスタムフック
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
