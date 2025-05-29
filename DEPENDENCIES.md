# 依存関係ドキュメント

このファイルは、プロジェクトで使用されている全ての依存関係とその用途を説明します。

## 📦 パッケージ管理

このプロジェクトはNode.jsとnpmを使用してパッケージを管理しています。

### インストール方法

```bash
# 全ての依存関係をインストール
npm install

# 本番環境用のみ
npm install --production

# 開発環境用のみ
npm install --only=dev
```

## 🚀 本番依存関係 (dependencies)

### フレームワーク・ライブラリ

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `next` | ^15.3.2 | Next.jsフレームワーク（React SSR/SSG） |
| `react` | ^19.1.0 | UIライブラリ |
| `react-dom` | ^19.1.0 | React DOM操作 |
| `typescript` | ^5.8.3 | TypeScript言語サポート |

### 認証・データベース

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `@supabase/supabase-js` | ^2.49.8 | Supabaseクライアント |
| `@supabase/auth-helpers-nextjs` | ^0.10.0 | Next.js用Supabase認証ヘルパー |
| `@supabase/ssr` | ^0.6.1 | SSR用Supabaseクライアント |
| `next-auth` | ^4.24.11 | Next.js認証ライブラリ |
| `@prisma/client` | ^6.8.2 | Prisma ORMクライアント |
| `jose` | ^6.0.11 | JWT処理ライブラリ |

### UI・スタイリング

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `tailwindcss` | ^3.3.0 | CSSフレームワーク |
| `@radix-ui/react-label` | ^2.1.7 | アクセシブルなラベルコンポーネント |
| `@radix-ui/react-select` | ^2.2.5 | アクセシブルなセレクトコンポーネント |
| `@radix-ui/react-slot` | ^1.2.3 | コンポーネント合成ユーティリティ |
| `framer-motion` | ^12.12.1 | アニメーションライブラリ |
| `lucide-react` | ^0.511.0 | アイコンライブラリ |
| `clsx` | ^2.1.1 | 条件付きクラス名ユーティリティ |
| `tailwind-merge` | ^3.3.0 | Tailwindクラス名マージユーティリティ |

### フォーム・バリデーション

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `react-hook-form` | ^7.56.4 | フォーム管理ライブラリ |
| `@hookform/resolvers` | ^5.0.1 | React Hook Formバリデーションリゾルバー |
| `zod` | ^3.25.20 | TypeScriptファーストなスキーマバリデーション |

### API・HTTP

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `axios` | ^1.9.0 | HTTPクライアント |
| `openai` | ^4.103.0 | OpenAI APIクライアント |
| `@tanstack/react-query` | ^5.76.1 | サーバーステート管理 |

### ユーティリティ

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `date-fns` | ^4.1.0 | 日付操作ライブラリ |
| `node-cache` | ^5.1.2 | インメモリキャッシュ |
| `xml2js` | ^0.6.2 | XML解析ライブラリ |
| `@types/xml2js` | ^0.4.14 | xml2jsの型定義 |

### ルーティング

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `react-router-dom` | ^7.6.0 | クライアントサイドルーティング |

## 🛠️ 開発依存関係 (devDependencies)

### ビルド・バンドル

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `autoprefixer` | ^10.0.1 | CSS自動プレフィックス |
| `postcss` | ^8 | CSS後処理ツール |
| `ts-node` | ^10.9.2 | TypeScript実行環境 |

### テスト

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `jest` | ^29.7.0 | JavaScriptテストフレームワーク |
| `@jest/test-sequencer` | ^29.7.0 | Jestテスト実行順序制御 |
| `jest-environment-jsdom` | ^29.7.0 | Jest DOM環境 |
| `ts-jest` | ^29.3.4 | Jest TypeScript変換 |
| `@testing-library/jest-dom` | ^6.6.3 | Jest DOM マッチャー |
| `@testing-library/react` | ^16.3.0 | React テスティングライブラリ |
| `@testing-library/user-event` | ^14.6.1 | ユーザーイベントシミュレーション |
| `cypress` | ^14.4.0 | E2Eテストフレームワーク |
| `@playwright/test` | ^1.52.0 | E2Eテストフレームワーク |
| `start-server-and-test` | ^2.0.12 | サーバー起動とテスト実行 |

### リンター・フォーマッター

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `eslint` | ^8 | JavaScriptリンター |
| `eslint-config-next` | 14.1.0 | Next.js用ESLint設定 |
| `eslint-config-prettier` | ^10.1.5 | Prettier用ESLint設定 |
| `eslint-plugin-prettier` | ^5.4.0 | PrettierをESLintルールとして実行 |
| `@typescript-eslint/eslint-plugin` | ^8.32.1 | TypeScript用ESLintプラグイン |
| `@typescript-eslint/parser` | ^8.32.1 | TypeScript用ESLintパーサー |

### 型定義

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `@types/node` | ^20.17.50 | Node.js型定義 |
| `@types/react` | ^18 | React型定義 |
| `@types/react-dom` | ^18 | React DOM型定義 |
| `@types/jest` | ^29.5.14 | Jest型定義 |

### 環境・設定

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `dotenv` | ^16.5.0 | 環境変数読み込み |

## 🔧 パッケージの用途詳細

### 認証フロー
- `@supabase/supabase-js`: メインのSupabaseクライアント
- `@supabase/auth-helpers-nextjs`: Next.js特有の認証処理
- `@supabase/ssr`: サーバーサイドレンダリング対応
- `next-auth`: 追加の認証プロバイダー対応

### UI/UXライブラリ
- `@radix-ui/*`: アクセシビリティを重視したプリミティブコンポーネント
- `framer-motion`: 滑らかなアニメーション
- `lucide-react`: 一貫性のあるアイコンセット

### データ管理
- `@tanstack/react-query`: サーバーステートの効率的な管理
- `@prisma/client`: 型安全なデータベースアクセス
- `node-cache`: パフォーマンス向上のためのキャッシュ

### 開発体験
- `typescript`: 型安全性とIDE支援
- `eslint` + `prettier`: コード品質とフォーマット統一
- `jest` + `@testing-library/*`: 信頼性の高いテスト

## 📋 バージョン管理

### セマンティックバージョニング

このプロジェクトは[セマンティックバージョニング](https://semver.org/)に従います：

- `^`: マイナーバージョンとパッチバージョンの更新を許可
- `~`: パッチバージョンのみの更新を許可
- 固定: 特定のバージョンに固定

### 依存関係の更新

```bash
# 依存関係の確認
npm outdated

# 安全な更新（package.jsonの範囲内）
npm update

# メジャーバージョン更新（注意が必要）
npm install package@latest

# セキュリティ脆弱性の修正
npm audit fix
```

## 🚨 重要な注意事項

### セキュリティ
- 定期的に `npm audit` を実行してセキュリティ脆弱性をチェック
- 本番環境では `NODE_ENV=production` を設定

### パフォーマンス
- `next/dynamic` を使用した動的インポートでバンドルサイズを最適化
- 不要な依存関係は定期的に削除

### 互換性
- Node.js 18.0.0以上が必要
- ブラウザサポート: モダンブラウザ（ES2020対応）

## 📚 参考リンク

- [npm Documentation](https://docs.npmjs.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Package.json Documentation](https://docs.npmjs.com/cli/v8/configuring-npm/package-json) 