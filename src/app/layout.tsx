import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import SkipLinks from '@/components/SkipLinks';
import AutoLogoutProvider from '@/components/AutoLogoutProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: {
    default: 'メドエビデンス - 医学的エビデンス検索',
    template: '%s | メドエビデンス',
  },
  description: '医学的な質問に対して、最新の研究論文とエビデンスに基づいた信頼できる回答を提供するサービス',
  keywords: ['医学', 'エビデンス', '論文検索', '医療情報', 'PubMed', 'AI', '医師'],
  authors: [{ name: 'メドエビデンス開発チーム' }],
  creator: 'メドエビデンス',
  publisher: 'メドエビデンス',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://med-evi.example.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://med-evi.example.com',
    title: 'メドエビデンス - 医学的エビデンス検索',
    description: '医学的な質問に対して、最新の研究論文とエビデンスに基づいた信頼できる回答を提供',
    siteName: 'メドエビデンス',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'メドエビデンス - 医学的エビデンス検索サービス',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'メドエビデンス - 医学的エビデンス検索',
    description: '医学的な質問に対して、最新の研究論文とエビデンスに基づいた信頼できる回答を提供',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Google Search Console verification (実際のIDに置き換え)
    google: 'google-site-verification-code',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#60A5FA' },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Security Headers */}
        <meta name="referrer" content="origin-when-cross-origin" />

        {/* Performance Hints */}
        <link rel="dns-prefetch" href="https://api.example.com" />

        {/* Accessibility Meta Tags */}
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body
        className={`${inter.variable} antialiased min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultMode="system">
          <AutoLogoutProvider>
            <SkipLinks />
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
              <Header />
              <PageTransition>
                {children}
              </PageTransition>
            </div>

            {/* アクセシビリティアナウンスメント領域 */}
            <div id="a11y-announcements" aria-live="assertive" aria-atomic="true" className="sr-only" />
            
            {/* アクセシビリティヘルプ情報 */}
            <div className="sr-only">
              <h2>アクセシビリティ機能について</h2>
              <p>
                このサイトはWCAG 2.1 AA基準に準拠しています。
                キーボードナビゲーション、スクリーンリーダー、音声認識ソフトウェアをサポートしています。
              </p>
              <p>
                キーボードショートカット: Alt + H でホーム、Alt + L で履歴に移動できます。
              </p>
              <p>
                セキュリティのため、30分間操作がない場合は自動的にログアウトされます。
              </p>
              <p>
                アクセシビリティに関するご質問やご要望がございましたら、お問い合わせページからご連絡ください。
              </p>
            </div>
          </AutoLogoutProvider>
        </ThemeProvider>

        {/* スクリプトで初期テーマを設定（フラッシュ防止） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('med-evi-theme-mode') || 'system';
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' || (theme === 'system' && prefersDark);
                  
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  console.warn('Failed to set initial theme:', e);
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
