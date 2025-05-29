# レスポンシブデザイン クイックリファレンス

## ブレークポイント一覧

| デバイス         | サイズ  | Tailwind    | 主な用途                             |
| ---------------- | ------- | ----------- | ------------------------------------ |
| モバイル         | 0-639px | `(default)` | スマートフォン縦向き                 |
| タブレット小     | 640px+  | `sm:`       | スマートフォン横向き、小型タブレット |
| タブレット       | 768px+  | `md:`       | タブレット、小型ラップトップ         |
| ラップトップ     | 1024px+ | `lg:`       | ラップトップ、デスクトップ           |
| デスクトップ     | 1280px+ | `xl:`       | 大型デスクトップ                     |
| 大型デスクトップ | 1536px+ | `2xl:`      | 4K、ワイドモニター                   |

## コンポーネント別レスポンシブクラス

### Header

```jsx
// メインコンテナ
className = 'h-16 md:h-20';

// ロゴ
className = 'text-xl sm:text-2xl';

// デスクトップナビ
className = 'hidden md:flex space-x-1 lg:space-x-2';

// モバイルボタン
className = 'md:hidden p-3';

// モバイルメニュー項目
className = 'px-4 py-4 min-h-[44px]';
```

### MainContent

```jsx
// コンテナ
className = 'py-8 sm:py-12 lg:py-16';

// タイトル
className = 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl';

// フォーム入力
className = 'px-4 sm:px-6 py-4 sm:py-5';

// 機能カード
className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
```

### HistoryList

```jsx
// グリッドコンテナ
className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6';

// リストモード
className = 'space-y-4 sm:space-y-6';

// 表示切り替え（デスクトップのみ）
className = 'hidden md:flex';
```

### HistoryItem

```jsx
// カードパディング
className={viewMode === 'list' ? 'p-4 sm:p-6' : 'p-4 sm:p-5'}

// タイトル
className={viewMode === 'grid' ? 'text-sm sm:text-base line-clamp-2' : 'text-base sm:text-lg'}

// コンテンツ
className={viewMode === 'grid' ? 'text-sm line-clamp-3' : 'text-sm sm:text-base'}
```

## 実用的なレスポンシブパターン

### 1. フレキシブルタイポグラフィ

```jsx
// タイトル: モバイル→デスクトップで段階的に大きく
className = 'text-lg sm:text-xl md:text-2xl lg:text-3xl';

// 本文: モバイル14px、デスクトップ16px
className = 'text-sm sm:text-base';

// キャプション: 一定サイズ
className = 'text-xs';
```

### 2. スペーシングシステム

```jsx
// パディング: デバイスに応じて調整
className = 'p-4 sm:p-6 lg:p-8';

// マージン: 縦横で調整
className = 'mx-4 sm:mx-6 lg:mx-8 my-2 sm:my-4';

// ギャップ: グリッドアイテム間
className = 'gap-4 sm:gap-6 lg:gap-8';
```

### 3. レイアウトパターン

```jsx
// 縦スタック → 水平配置
className = 'flex flex-col sm:flex-row';

// 1カラム → 2カラム → 3カラム
className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

// 非表示 → 表示
className = 'hidden md:block';

// 表示 → 非表示
className = 'block md:hidden';
```

## タッチターゲット最適化

### 最小サイズ（44px×44px）

```jsx
// ボタン
className = 'min-h-[44px] min-w-[44px] p-3';

// リンク
className = 'py-4 px-4 touch-manipulation';

// アイコンボタン
className = 'p-3 rounded-lg'; // 合計48px+
```

### タッチ操作最適化

```jsx
// タッチ操作の最適化
className = 'touch-manipulation';

// アクティブ状態のフィードバック
className = 'active:scale-95 transition-transform';

// ホバー状態（デスクトップのみ）
className = 'hover:bg-gray-100 sm:hover:bg-gray-100';
```

## アクセシビリティクラス

### フォーカス管理

```jsx
// フォーカスリング
className = 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

// アウトライン除去（カスタムフォーカススタイル使用時）
className = 'focus:outline-none';

// フォーカス可視化
className = 'focus-visible:ring-2 focus-visible:ring-blue-500';
```

### スクリーンリーダー対応

```jsx
// スクリーンリーダーのみ表示
className="sr-only"

// スクリーンリーダーで非表示
aria-hidden="true"

// ARIA属性
aria-expanded={isOpen}
aria-controls="menu-id"
aria-label="メニューを開く"
```

## パフォーマンス最適化

### CSS最適化

```jsx
// GPU加速
className = 'transform-gpu';

// レイアウトシフト防止
className = 'aspect-square'; // または具体的なサイズ指定

// スムーズアニメーション
className = 'transition-all duration-200 ease-in-out';
```

### 条件付きレンダリング

```jsx
// 画面サイズによる条件分岐
const isMobile = useMediaQuery('(max-width: 768px)');

// 遅延読み込み
const DesktopComponent = lazy(() => import('./DesktopComponent'));
```

## デバッグ・テスト用

### ビューポートサイズ確認

```jsx
// 開発時のブレークポイント表示
<div className="fixed top-0 right-0 bg-black text-white p-2 text-xs z-50">
  <span className="sm:hidden">XS</span>
  <span className="hidden sm:inline md:hidden">SM</span>
  <span className="hidden md:inline lg:hidden">MD</span>
  <span className="hidden lg:inline xl:hidden">LG</span>
  <span className="hidden xl:inline 2xl:hidden">XL</span>
  <span className="hidden 2xl:inline">2XL</span>
</div>
```

### レスポンシブテストURL

```
// Chrome DevTools
chrome://devtools/

// ブラウザ拡張
- Responsive Viewer
- Window Resizer

// オンラインツール
- responsively.app
- browserstack.com
```

## 実装チェックリスト

### ✅ 基本要件

- [ ] 3つ以上のブレークポイント対応
- [ ] タッチターゲット44px以上
- [ ] 横スクロールなし
- [ ] テキスト読みやすさ確保

### ✅ UX要件

- [ ] ナビゲーション直感性
- [ ] コンテンツ階層明確
- [ ] ローディング状態表示
- [ ] エラーハンドリング

### ✅ アクセシビリティ

- [ ] キーボードナビゲーション
- [ ] スクリーンリーダー対応
- [ ] 適切なコントラスト比
- [ ] ARIA属性設定

### ✅ パフォーマンス

- [ ] Core Web Vitals最適化
- [ ] 画像最適化
- [ ] CSS/JS最小化
- [ ] 不要な再レンダリング防止

## トラブルシューティング

### よくある問題と解決法

**1. ハンバーガーメニューが開かない**

```jsx
// useEffectでイベントリスナーのクリーンアップ確認
useEffect(() => {
  return () => {
    document.removeEventListener('keydown', handleEscape);
  };
}, []);
```

**2. グリッドアイテムの高さが揃わない**

```jsx
// 親コンテナにheight制御追加
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
  <div className="flex flex-col h-full">
    {' '}
    {/* この行を追加 */}
    <HistoryItem />
  </div>
</div>
```

**3. テキスト切り捨てが効かない**

```jsx
// line-clampが動作しない場合
className =
  'overflow-hidden display-[-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]';
```

**4. iOSサファリでのビューポート問題**

```css
/* globals.css */
html {
  height: -webkit-fill-available;
}
body {
  min-height: -webkit-fill-available;
}
```

## 追加リソース

### 参考ドキュメント

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN Responsive Web Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### 便利ツール

- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Headless UI](https://headlessui.com/) - アクセシブルコンポーネント
- [Heroicons](https://heroicons.com/) - 最適化されたSVGアイコン
