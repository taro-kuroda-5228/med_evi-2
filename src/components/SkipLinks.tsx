'use client';

import { useAccessibility } from '@/hooks/useAccessibility';

export default function SkipLinks() {
  const { skipToContent } = useAccessibility();

  const handleSkipToMain = (e: React.KeyboardEvent | React.MouseEvent) => {
    e.preventDefault();
    skipToContent();
  };

  const handleSkipToNav = (e: React.KeyboardEvent | React.MouseEvent) => {
    e.preventDefault();
    const navigation = document.querySelector('nav');
    if (navigation) {
      const firstLink = navigation.querySelector('a, button');
      if (firstLink) {
        (firstLink as HTMLElement).focus();
      }
    }
  };

  return (
    <div className="skip-links sr-only-focusable">
      <a
        href="#main-content"
        onClick={handleSkipToMain}
        onKeyDown={(e) => e.key === 'Enter' && handleSkipToMain(e)}
        className="absolute top-2 left-2 z-[9999] bg-blue-600 text-white px-4 py-2 rounded-md font-medium focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform -translate-y-full focus:translate-y-0 transition-transform duration-200"
        tabIndex={0}
      >
        メインコンテンツにスキップ
      </a>
      <a
        href="#navigation"
        onClick={handleSkipToNav}
        onKeyDown={(e) => e.key === 'Enter' && handleSkipToNav(e)}
        className="absolute top-2 left-40 z-[9999] bg-blue-600 text-white px-4 py-2 rounded-md font-medium focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform -translate-y-full focus:translate-y-0 transition-transform duration-200"
        tabIndex={0}
      >
        ナビゲーションにスキップ
      </a>
    </div>
  );
} 