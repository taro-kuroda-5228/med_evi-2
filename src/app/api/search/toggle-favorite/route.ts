import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isFavorite } = body;

    if (!id || typeof isFavorite !== 'boolean') {
      return NextResponse.json({ error: 'IDとお気に入り状態が必要です' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('search_queries')
      .update({ is_favorite: isFavorite })
      .eq('id', id)
      .select();

    if (error) {
      console.error('お気に入り更新エラー:', error);
      return NextResponse.json({ error: 'お気に入りの更新に失敗しました' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '履歴が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: data[0],
    });
  } catch (error) {
    console.error('お気に入り更新エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });
    }

    const { error } = await supabase.from('search_queries').delete().eq('id', id);

    if (error) {
      console.error('履歴削除エラー:', error);
      return NextResponse.json({ error: '履歴の削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '履歴が削除されました',
    });
  } catch (error) {
    console.error('履歴削除エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}
