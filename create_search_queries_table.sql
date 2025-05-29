-- =====================================================
-- search_queriesテーブルの作成
-- =====================================================

-- search_queriesテーブルの作成
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT search_queries_query_not_empty CHECK (length(trim(query)) > 0)
);

-- =====================================================
-- RLS (Row Level Security) の有効化
-- =====================================================

-- search_queriesテーブルのRLS有効化
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- search_queriesテーブルのRLSポリシー
-- =====================================================

-- 既存のポリシーを削除（再実行時のため）
DROP POLICY IF EXISTS "Users can manage their own search queries" ON search_queries;

-- 検索履歴の全操作（CRUD）を許可
CREATE POLICY "Users can manage their own search queries" ON search_queries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- インデックスの作成（パフォーマンス向上）
-- =====================================================

-- search_queriesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_search_queries_is_favorite ON search_queries(is_favorite);

-- =====================================================
-- トリガーの作成（updated_atの自動更新）
-- =====================================================

-- update_updated_at_column関数が存在しない場合は作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- search_queriesテーブルのupdated_at自動更新トリガー
DROP TRIGGER IF EXISTS update_search_queries_updated_at ON search_queries;
CREATE TRIGGER update_search_queries_updated_at
    BEFORE UPDATE ON search_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 権限の確認クエリ（デバッグ用）
-- =====================================================

-- 現在のユーザーとロールを確認
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- テーブルの存在確認
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'search_queries';

-- RLSポリシーの確認
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
  AND tablename = 'search_queries'
ORDER BY policyname; 