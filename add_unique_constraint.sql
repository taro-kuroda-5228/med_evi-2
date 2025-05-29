ALTER TABLE search_queries ADD CONSTRAINT unique_user_query UNIQUE (user_id, query);
