'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeMode } from '@/types/theme';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    mode: 'light',
    label: 'ライト',
    icon: Sun,
    description: '明るいテーマ',
  },
  {
    mode: 'dark',
    label: 'ダーク',
    icon: Moon,
    description: '暗いテーマ',
  },
  {
    mode: 'system',
    label: 'システム',
    icon: Monitor,
    description: 'システム設定に従う',
  },
];

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'dropdown',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const { mode, setMode, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentOption = themeOptions.find(option => option.mode === mode) || themeOptions[0];

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    setIsOpen(false);
  };

  // サイズ設定
  const sizeClasses = {
    sm: {
      button: 'p-1.5 text-sm',
      icon: 'w-4 h-4',
      dropdown: 'text-sm',
    },
    md: {
      button: 'p-2',
      icon: 'w-5 h-5',
      dropdown: 'text-base',
    },
    lg: {
      button: 'p-3 text-lg',
      icon: 'w-6 h-6',
      dropdown: 'text-lg',
    },
  };

  const currentSizeClasses = sizeClasses[size];

  // シンプルなボタン切り替え（ライト/ダーク間のトグル）
  if (variant === 'button') {
    const Icon = isDark ? Sun : Moon;

    return (
      <button
        ref={buttonRef}
        onClick={() => handleThemeChange(isDark ? 'light' : 'dark')}
        className={`
          ${currentSizeClasses.button}
          inline-flex items-center justify-center
          rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800
          text-gray-700 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-all duration-200
          ${className}
        `}
        title={`${isDark ? 'ライト' : 'ダーク'}テーマに切り替え`}
        aria-label={`現在: ${isDark ? 'ダーク' : 'ライト'}テーマ。クリックで切り替え`}
      >
        <Icon className={`${currentSizeClasses.icon} transition-transform duration-300`} />
        {showLabel && <span className="ml-2 font-medium">{isDark ? 'ライト' : 'ダーク'}</span>}
      </button>
    );
  }

  // ドロップダウン形式
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${currentSizeClasses.button}
          inline-flex items-center justify-center
          rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800
          text-gray-700 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-all duration-200
          min-w-[2.5rem]
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="テーマ設定を開く"
        title="テーマを変更"
      >
        <currentOption.icon
          className={`${currentSizeClasses.icon} transition-transform duration-300`}
        />
        {showLabel && (
          <>
            <span className="ml-2 font-medium">{currentOption.label}</span>
            <ChevronDown
              className={`ml-1 w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </>
        )}
        {!showLabel && (
          <ChevronDown
            className={`ml-1 w-3 h-3 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-2" role="menu" aria-orientation="vertical">
            {themeOptions.map(option => {
              const Icon = option.icon;
              const isSelected = mode === option.mode;

              return (
                <button
                  key={option.mode}
                  onClick={() => handleThemeChange(option.mode)}
                  className={`
                    ${currentSizeClasses.dropdown}
                    w-full px-4 py-3 text-left flex items-center
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700
                    transition-colors duration-150
                    ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}
                  `}
                  role="menuitem"
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 ml-2 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// より単純なインラインテーマトグル
export const SimpleThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isDark, toggleMode } = useTheme();

  return (
    <button
      onClick={toggleMode}
      className={`
        p-2 rounded-lg
        text-gray-600 dark:text-gray-400
        hover:text-gray-900 dark:hover:text-gray-100
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transition-all duration-200
        ${className}
      `}
      title={`${isDark ? 'ライト' : 'ダーク'}テーマに切り替え`}
      aria-label={`現在: ${isDark ? 'ダーク' : 'ライト'}テーマ`}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};
