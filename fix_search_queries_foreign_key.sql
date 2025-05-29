-- =====================================================
-- search_queriesテーブルの外部キー制約を修正
-- =====================================================

-- 現在の外部キー制約を確認
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='search_queries'
  AND kcu.column_name = 'user_id';

-- 既存の外部キー制約を削除
DO $$ 
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- 制約名を取得
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'search_queries'
      AND kcu.column_name = 'user_id';
    
    -- 制約が存在する場合は削除
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE search_queries DROP CONSTRAINT ' || constraint_name_var;
        RAISE NOTICE '外部キー制約 % を削除しました', constraint_name_var;
    END IF;
END $$;

-- 正しい外部キー制約を追加（auth.usersテーブルを参照）
ALTER TABLE search_queries 
ADD CONSTRAINT search_queries_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 制約の確認
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='search_queries'
  AND kcu.column_name = 'user_id';

-- 現在のユーザーIDを確認（デバッグ用）
-- SELECT auth.uid() as current_user_id;

-- search_queriesテーブルにRLSポリシーを追加（まだない場合）
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（再実行時のため）
DROP POLICY IF EXISTS "Users can manage their own search queries" ON search_queries;

-- 検索履歴の全操作（CRUD）を許可
CREATE POLICY "Users can manage their own search queries" ON search_queries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); 