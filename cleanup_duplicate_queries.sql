-- 重複する検索履歴をクリーンアップ
-- 各ユーザーの各クエリについて、最新のもの以外を削除

WITH ranked_queries AS (
  SELECT 
    id,
    user_id,
    query,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, query 
      ORDER BY created_at DESC
    ) as rn
  FROM search_queries
)
DELETE FROM search_queries 
WHERE id IN (
  SELECT id 
  FROM ranked_queries 
  WHERE rn > 1
);

-- 削除後にユニーク制約を追加
ALTER TABLE search_queries 
ADD CONSTRAINT unique_user_query 
UNIQUE (user_id, query); 