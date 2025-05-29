import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // 将来的にユーザー認証が実装された場合
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('search_queries')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // ユーザーIDがある場合はフィルタリング
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('履歴取得エラー:', error);
      return NextResponse.json({ error: '履歴の取得に失敗しました' }, { status: 500 });
    }

    // データを適切な形式に変換
    const formattedData =
      data?.map(item => ({
        id: item.id,
        title: item.query,
        timestamp: new Date(item.created_at).toLocaleString('ja-JP'),
        content: item.answer ? item.answer.substring(0, 150) + '...' : '',
        isFavorited: item.is_favorite,
        type: 'search' as const,
        query: item.query,
        translatedQuery: item.translated_query,
        fullAnswer: item.answer,
        citations: item.citations,
        language: item.response_language,
      })) || [];

    return NextResponse.json({
      items: formattedData,
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('履歴取得エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}
