# Supabase RLS設定手順

## 1. Supabaseダッシュボードにアクセス

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にログイン
2. プロジェクトを選択

## 2. SQLエディタでスクリプト実行

### 手順A: SQLエディタを使用（推奨）

1. 左サイドバーから **SQL Editor** をクリック
2. **New query** をクリック
3. `supabase_rls_setup.sql`の内容をコピー&ペースト
4. **Run** ボタンをクリックして実行

### 手順B: Database画面から個別設定

#### 2.1 テーブル作成

1. **Database** → **Tables** に移動
2. **Create a new table** をクリック
3. 各テーブルを以下の設定で作成：

**usersテーブル**:
```
Name: users
Columns:
- id (uuid, primary key, references auth.users)
- name (text, not null)
- gender (text)
- birth_date (date)
- university (text)
- graduation_year (int4)
- specialization (text)
- email (text, unique, not null)
- created_at (timestamptz, default: now())
- updated_at (timestamptz, default: now())
```

#### 2.2 RLS有効化

1. 作成したテーブルをクリック
2. **Settings** タブに移動
3. **Enable Row Level Security (RLS)** をONに設定

#### 2.3 ポリシー追加

1. **Policies** タブに移動
2. **Add Policy** をクリック
3. **Create a policy from scratch** を選択
4. 以下のポリシーを順次追加：

**usersテーブル用ポリシー**:

```sql
-- INSERT ポリシー
Policy name: Users can insert their own profile
Allowed operation: INSERT
Target roles: authenticated
USING expression: (空白)
WITH CHECK expression: auth.uid() = id

-- SELECT ポリシー  
Policy name: Users can view their own profile
Allowed operation: SELECT
Target roles: authenticated
USING expression: auth.uid() = id
WITH CHECK expression: (空白)

-- UPDATE ポリシー
Policy name: Users can update their own profile
Allowed operation: UPDATE
Target roles: authenticated
USING expression: auth.uid() = id
WITH CHECK expression: auth.uid() = id

-- DELETE ポリシー
Policy name: Users can delete their own profile
Allowed operation: DELETE
Target roles: authenticated
USING expression: auth.uid() = id
WITH CHECK expression: (空白)
```

## 3. 認証設定の調整

### 3.1 メール確認を無効化（開発環境）

1. **Authentication** → **Settings** に移動
2. **Email confirmations** を **無効** に設定
3. **Save** をクリック

### 3.2 JWT設定確認

1. **Settings** → **API** に移動
2. **JWT Settings** で以下を確認：
   - JWT expiry: 3600 (1時間)
   - JWT secret: 自動生成されたもの

## 4. 設定の確認

### 4.1 RLSポリシー確認

SQL Editorで以下を実行：

```sql
-- RLSポリシーの一覧確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

### 4.2 認証テスト

```sql
-- 現在のユーザー情報確認
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role,
  auth.jwt() ->> 'aud' as audience;
```

## 5. トラブルシューティング

### 問題1: "anon role" でアクセス拒否

**原因**: メール確認が有効、またはセッション確立前のアクセス

**解決策**:
1. メール確認を無効化
2. 認証後のセッション確立を待機
3. RLSポリシーが正しく設定されているか確認

### 問題2: INSERT時の権限エラー

**原因**: `auth.uid()`がnullまたはIDが一致しない

**解決策**:
1. 認証状態を確認
2. UUIDの形式を確認
3. ポリシーの条件式を確認

### 問題3: 既存データが見えない

**原因**: SELECTポリシーの条件が厳しすぎる

**解決策**:
1. ポリシー条件を確認
2. データのuser_idが正しく設定されているか確認
3. 必要に応じてポリシーを調整

## 6. 本番環境での追加設定

### 6.1 メール確認を有効化

1. **Authentication** → **Settings**
2. **Email confirmations** を **有効** に設定
3. メールテンプレートをカスタマイズ

### 6.2 セキュリティ強化

```sql
-- より厳密なポリシー例
CREATE POLICY "Strict user access" ON users
  FOR ALL
  USING (
    auth.uid() = id AND 
    auth.role() = 'authenticated' AND
    auth.jwt() ->> 'aud' = 'authenticated'
  );
```

### 6.3 監査ログ設定

```sql
-- 監査テーブル作成
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
``` 