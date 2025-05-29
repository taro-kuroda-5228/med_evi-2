# メドエビデンス (MedEvidence)

医学的な質問に対して、最新の研究論文とエビデンスに基づいた信頼できる回答を提供するNext.jsアプリケーション。

## 🚀 技術スタック

- **フロントエンド**: Next.js 15, TypeScript, Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL, Authentication)
- **アニメーション**: Framer Motion
- **認証**: NextAuth.js + Supabase Auth
- **API**: OpenAI API, PubMed API
- **テスト**: Jest, Cypress, Playwright
- **リンター**: ESLint, Prettier

## 📋 機能

- ✅ 医学的質問の検索
- ✅ PubMed論文検索・分析
- ✅ ユーザー認証・登録
- ✅ 検索履歴管理
- ✅ お気に入り論文保存
- ✅ レスポンシブデザイン
- ✅ アクセシビリティ対応 (WCAG 2.1 AA準拠)

## 🛠️ 開発環境のセットアップ

### 前提条件

- Node.js 18.0.0 以上
- npm または yarn
- Supabaseアカウント
- OpenAI APIキー

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd med_evi_2
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API設定
OPENAI_API_KEY=your_openai_api_key

# NextAuth設定（本番環境では必須）
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Supabaseデータベースのセットアップ

#### 4.1 Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとAPIキーを取得

#### 4.2 データベーススキーマの設定

プロジェクトに含まれているSQLファイルを実行してください：

```bash
# Supabase SQLエディタで以下のファイルを順番に実行
1. supabase_schema_update.sql
2. create_search_queries_table.sql
3. supabase_rls_setup.sql
4. complete_user_profile_setup.sql
```

#### 4.3 認証設定

Supabaseダッシュボードで以下の設定を行ってください：

1. **Authentication** → **Settings**
2. **Email confirmations** を無効化（開発環境）
3. **Site URL** を `http://localhost:3000` に設定
4. **Redirect URLs** に `http://localhost:3000/auth/callback` を追加

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認してください。

## 🧪 テスト

### 単体テスト

```bash
# テスト実行
npm run test

# ウォッチモード
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage
```

### E2Eテスト

```bash
# Cypress（インタラクティブ）
npm run cypress:open

# Cypress（ヘッドレス）
npm run cypress:run

# 統合テスト
npm run test:e2e
```

### Playwrightテスト

```bash
npx playwright test
```

## 📝 開発ワークフロー

### コード品質

```bash
# リンターチェック
npm run lint

# リンター自動修正
npm run lint:fix

# フォーマッターチェック
npm run format:check

# フォーマッター実行
npm run format
```

### ブランチ戦略

- `main`: 本番環境用の安定版
- `develop`: 開発用ブランチ
- `feature/*`: 新機能開発用
- `bugfix/*`: バグ修正用

### コミット規約

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

## 🔐 認証フロー

### 新規登録
1. `/register` でユーザー情報を入力
2. Supabase Authでユーザー作成
3. 認証済みセッション確立を待機
4. usersテーブルにプロフィール情報を挿入
5. メインページにリダイレクト

### ログイン
1. `/login` でメール・パスワードを入力
2. Supabase Authで認証
3. セッション確立後、メインページにリダイレクト

## 🎯 アクセシビリティ機能

- **WCAG 2.1 AA準拠**: 国際標準のアクセシビリティガイドライン
- **スクリーンリーダー対応**: NVDA、JAWS、VoiceOver対応
- **キーボードナビゲーション**: 完全なキーボード操作
- **動作軽減**: `prefers-reduced-motion`対応
- **ハイコントラスト**: `prefers-contrast`対応
- **フォーカス管理**: 適切なフォーカス順序とトラップ
- **ARIA属性**: 適切なセマンティクス

### キーボードショートカット
- `Alt + H`: ホームページに移動
- `Alt + L`: 履歴ページに移動
- `Tab`: 次の要素にフォーカス
- `Shift + Tab`: 前の要素にフォーカス
- `Enter/Space`: ボタン・リンクの実行

## 🐛 トラブルシューティング

### よくある問題

#### 1. 認証エラー: "anon role" でデータベースアクセスが拒否される

**原因**: メール確認が有効になっているため、signUp直後に認証済みセッションが確立されない

**解決策**:
1. Supabaseダッシュボードで **Email confirmations** を無効化
2. RLSポリシーが正しく設定されていることを確認
3. 開発サーバーを再起動

#### 2. プロフィール挿入エラー

**原因**: RLSポリシーが正しく設定されていない

**解決策**:
1. `supabase_rls_setup.sql` を実行してRLSポリシーを設定
2. usersテーブルのスキーマを確認
3. auth.users テーブルとの外部キー制約を確認

#### 3. OpenAI API エラー

**原因**: APIキーが設定されていない、または無効

**解決策**:
1. `.env.local` でOPENAI_API_KEYが正しく設定されているか確認
2. OpenAIアカウントの残高を確認
3. APIキーの権限を確認

#### 4. ビルドエラー

**原因**: TypeScriptの型エラーまたは依存関係の問題

**解決策**:
```bash
# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install

# 型チェック
npm run lint
```

## 📁 プロジェクト構造

```
med_evi_2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── globals.css        # グローバルスタイル
│   │   ├── layout.tsx         # ルートレイアウト
│   │   ├── page.tsx           # ホームページ
│   │   ├── register/          # 登録ページ
│   │   ├── login/             # ログインページ
│   │   └── history/           # 履歴ページ
│   ├── components/            # Reactコンポーネント
│   ├── hooks/                 # カスタムフック
│   ├── utils/                 # ユーティリティ関数
│   ├── types/                 # TypeScript型定義
│   ├── contexts/              # Reactコンテキスト
│   └── __tests__/             # テストファイル
├── scripts/                   # スクリプトファイル
├── tests/                     # E2Eテスト
├── cypress/                   # Cypressテスト
├── docs/                      # ドキュメント
├── prisma/                    # Prismaスキーマ
├── *.sql                      # データベーススキーマファイル
├── package.json               # 依存関係とスクリプト
├── tsconfig.json              # TypeScript設定
├── tailwind.config.js         # Tailwind CSS設定
├── next.config.js             # Next.js設定
└── README.md                  # このファイル
```

## 🚀 デプロイ

### Vercel (推奨)

1. GitHubリポジトリをVercelに接続
2. 環境変数を設定
3. 自動デプロイ

### 環境変数 (本番環境)

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
NEXTAUTH_SECRET=your_secure_nextauth_secret
NEXTAUTH_URL=https://your-domain.com
```

### デプロイ前チェックリスト

- [ ] 全てのテストが通る
- [ ] リンターエラーがない
- [ ] 本番環境の環境変数が設定済み
- [ ] Supabaseの本番データベースが設定済み
- [ ] OpenAI APIキーが有効

## 📊 パフォーマンス

### 最適化

- Next.js Image Optimization
- 動的インポート
- コード分割
- キャッシュ戦略

### 監視

- Vercel Analytics
- Core Web Vitals
- エラー追跡

## 🔒 セキュリティ

- Row Level Security (RLS)
- CSRF保護
- XSS対策
- 環境変数の適切な管理
- API レート制限

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

### 貢献方法

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発ガイドライン

- TypeScriptを使用
- ESLint + Prettierでコード品質を保持
- テストを書く
- アクセシビリティを考慮
- パフォーマンスを意識

## 📞 サポート

問題や質問がある場合は、以下の方法でお知らせください：

- GitHubのIssuesページ
- プルリクエストでの議論
- ドキュメントの改善提案

## 📚 参考資料

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) 