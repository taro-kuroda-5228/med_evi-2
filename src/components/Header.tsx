'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useEffect, useRef } from 'react';

export default function Header() {
  const pathname = usePathname();
  const { preferences, announce } = useAccessibility();
  const headerRef = useRef<HTMLElement>(null);

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: '/', label: 'ホーム', description: 'メインページに移動' },
    { href: '/history', label: '履歴', description: '検索履歴と論文履歴を確認' },
  ];

  // ページ変更時のアナウンス
  useEffect(() => {
    const currentPage = navItems.find(item => item.href === pathname);
    if (currentPage && preferences.screenReader) {
      announce(`${currentPage.label}ページが読み込まれました`, 'polite');
    }
  }, [pathname, preferences.screenReader, announce]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + H でホームに移動
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        window.location.href = '/';
        announce('ホームページに移動しています');
      }
      
      // Alt + L で履歴に移動
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        window.location.href = '/history';
        announce('履歴ページに移動しています');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [announce]);

  const handleNavClick = (item: typeof navItems[0]) => {
    if (preferences.screenReader) {
      announce(`${item.label}ページに移動しています`, 'assertive');
    }
  };

  const animationProps = preferences.reduceMotion ? {} : {
    initial: { y: -80, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.6, ease: 'easeOut' }
  };

  return (
    <motion.header
      ref={headerRef}
      {...animationProps}
      className="bg-white border-b-2 border-blue-200 p-4 z-50 backdrop-blur-sm bg-white/90"
      role="banner"
      aria-label="サイトヘッダー"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* ロゴ */}
        <motion.div
          {...(!preferences.reduceMotion && {
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.95 },
            transition: { type: 'spring', stiffness: 400, damping: 17 }
          })}
        >
          <Link 
            href="/" 
            className="flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
            aria-label="メドエビデンス ホームページに移動"
            onClick={() => handleNavClick({ href: '/', label: 'ホーム', description: 'メインページに移動' })}
          >
            <motion.h1
              className="text-2xl font-bold text-blue-600"
              {...(!preferences.reduceMotion && {
                whileHover: {
                  background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                },
                transition: { duration: 0.3 }
              })}
            >
              メドエビデンス
            </motion.h1>
          </Link>
        </motion.div>

        {/* ナビゲーション */}
        <nav 
          className="flex space-x-6" 
          role="navigation" 
          aria-label="メインナビゲーション"
          id="navigation"
        >
          {navItems.map((item, index) => (
            <motion.div
              key={item.href}
              {...(!preferences.reduceMotion && {
                initial: { opacity: 0, y: -20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.4, delay: index * 0.1 },
                whileHover: { y: -2 },
                whileTap: { scale: 0.95 }
              })}
            >
              <Link
                href={item.href}
                className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-blue-100 hover:text-blue-600'
                }`}
                aria-current={isActive(item.href) ? 'page' : undefined}
                aria-label={item.description}
                onClick={() => handleNavClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavClick(item);
                    window.location.href = item.href;
                  }
                }}
              >
                <span className="relative z-10">{item.label}</span>
                {isActive(item.href) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-blue-600 rounded-lg"
                    {...(!preferences.reduceMotion && {
                      transition: { type: 'spring', bounce: 0.2, duration: 0.6 }
                    })}
                    aria-hidden="true"
                  />
                )}
                {isActive(item.href) && (
                  <span className="sr-only">現在のページ</span>
                )}
              </Link>
            </motion.div>
          ))}
        </nav>
      </div>

      {/* キーボードショートカットヘルプ */}
      <div className="sr-only" aria-live="polite">
        キーボードショートカット: Alt + H でホーム、Alt + L で履歴に移動できます
      </div>
    </motion.header>
  );
}
