# セットアップガイド

このファイルは、プロジェクトを初めてセットアップする開発者向けの詳細なガイドです。

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容をコピーして値を設定してください：

```env
# Supabase設定
# Supabaseプロジェクトダッシュボードから取得してください
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API設定
# https://platform.openai.com/api-keys から取得してください
OPENAI_API_KEY=your_openai_api_key

# NextAuth設定（本番環境では必須）
# 開発環境では任意の文字列、本番環境では安全なランダム文字列を使用
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Supabaseプロジェクトのセットアップ

#### 3.1 Supabaseアカウント作成
1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとAPIキーを取得

#### 3.2 データベーススキーマの設定
以下のSQLファイルをSupabase SQLエディタで順番に実行してください：

```bash
1. supabase_schema_update.sql
2. create_search_queries_table.sql
3. supabase_rls_setup.sql
4. complete_user_profile_setup.sql
```

#### 3.3 認証設定
Supabaseダッシュボードで以下の設定を行ってください：

1. **Authentication** → **Settings**
2. **Email confirmations** を無効化（開発環境）
3. **Site URL** を `http://localhost:3000` に設定
4. **Redirect URLs** に `http://localhost:3000/auth/callback` を追加

### 4. OpenAI APIキーの取得

1. [OpenAI Platform](https://platform.openai.com/api-keys)にアクセス
2. アカウントを作成またはログイン
3. 新しいAPIキーを作成
4. `.env.local`ファイルに設定

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認してください。

## 🔧 開発ツール

### コード品質チェック

```bash
# リンターチェック
npm run lint

# フォーマッターチェック
npm run format:check

# 自動修正
npm run lint:fix
npm run format
```

### テスト実行

```bash
# 単体テスト
npm run test

# E2Eテスト
npm run test:e2e

# Cypressテスト（インタラクティブ）
npm run cypress:open
```

## 🐛 よくある問題と解決策

### 認証エラー
- Supabaseの**Email confirmations**が無効になっているか確認
- RLSポリシーが正しく設定されているか確認

### ビルドエラー
```bash
# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install
```

### 環境変数エラー
- `.env.local`ファイルが正しく作成されているか確認
- 環境変数の値に余分なスペースがないか確認

## 📞 サポート

問題が解決しない場合は、GitHubのIssuesページで報告してください。 