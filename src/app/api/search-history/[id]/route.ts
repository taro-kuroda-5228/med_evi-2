import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // 認証状態を確認
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 検索履歴を取得
    const { data: searchHistory, error } = await supabase
      .from('search_queries')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('検索履歴取得エラー:', error);
      return NextResponse.json(
        { error: '検索履歴の取得に失敗しました' },
        { status: 500 }
      );
    }

    if (!searchHistory) {
      return NextResponse.json(
        { error: '検索履歴が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(searchHistory);

  } catch (error) {
    console.error('検索履歴取得API エラー:', error);
    return NextResponse.json(
      { 
        error: '検索履歴の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
} 