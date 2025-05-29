import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 型定義
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          birth_date: string | null;
          gender: string | null;
          university: string | null;
          graduation_year: string | null;
          specialization: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          university?: string | null;
          graduation_year?: string | null;
          specialization?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          university?: string | null;
          graduation_year?: string | null;
          specialization?: string | null;
          email?: string | null;
          created_at?: string;
        };
      };
      search_queries: {
        Row: {
          id: string;
          query: string;
          translated_query: string | null;
          answer: string;
          citations: string;
          is_favorite: boolean;
          web_results: string;
          user_evidence: string;
          use_only_user_evidence: boolean;
          use_pubmed_only: boolean;
          max_results: number;
          response_language: string;
          previous_query_id: string | null;
          feedback: string | null;
          feedback_comment: string | null;
          feedback_submitted_at: string | null;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          query: string;
          translated_query?: string | null;
          answer?: string;
          citations?: string;
          is_favorite?: boolean;
          web_results?: string;
          user_evidence?: string;
          use_only_user_evidence?: boolean;
          use_pubmed_only?: boolean;
          max_results?: number;
          response_language?: string;
          previous_query_id?: string | null;
          feedback?: string | null;
          feedback_comment?: string | null;
          feedback_submitted_at?: string | null;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          query?: string;
          translated_query?: string | null;
          answer?: string;
          citations?: string;
          is_favorite?: boolean;
          web_results?: string;
          user_evidence?: string;
          use_only_user_evidence?: boolean;
          use_pubmed_only?: boolean;
          max_results?: number;
          response_language?: string;
          previous_query_id?: string | null;
          feedback?: string | null;
          feedback_comment?: string | null;
          feedback_submitted_at?: string | null;
          created_at?: string;
          user_id?: string | null;
        };
      };
    };
  };
};
