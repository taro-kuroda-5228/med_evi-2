import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// お気に入り論文一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    const supabase = await createClient();

    // 認証状態を確認
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    let query = supabase
      .from('favorite_papers')
      .select('*')
      .order('created_at', { ascending: false });

    // フォルダーでフィルタリング
    if (folderId && folderId !== 'all') {
      query = query.eq('folder_id', folderId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('お気に入り論文取得エラー:', error);
      return NextResponse.json({ error: 'お気に入り論文の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ papers: data || [] });
  } catch (error) {
    console.error('お気に入り論文取得エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}

// お気に入り論文追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, authors, journal, publication_year, doi, folderId } = body;

    if (!title) {
      return NextResponse.json({ error: 'タイトルが必要です' }, { status: 400 });
    }

    const supabase = await createClient();

    // 認証状態を確認
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('favorite_papers')
      .insert([
        {
          title: title.trim(),
          authors: authors || '',
          journal: journal || '',
          publication_year: publication_year || null,
          doi: doi || '',
          folder_id: folderId || null,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('お気に入り論文追加エラー:', error);
      return NextResponse.json({ error: 'お気に入り論文の追加に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ paper: data });
  } catch (error) {
    console.error('お気に入り論文追加エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}

// お気に入り論文のフォルダー移動
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { paperId, folderId } = body;

    if (!paperId) {
      return NextResponse.json({ error: '論文IDが必要です' }, { status: 400 });
    }

    const supabase = await createClient();

    // 認証状態を確認
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('favorite_papers')
      .update({ folder_id: folderId || null })
      .eq('id', paperId)
      .select()
      .single();

    if (error) {
      console.error('論文フォルダー移動エラー:', error);
      return NextResponse.json({ error: '論文のフォルダー移動に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ paper: data });
  } catch (error) {
    console.error('論文フォルダー移動エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}

// お気に入り論文削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('paperId');

    if (!paperId) {
      return NextResponse.json({ error: '論文IDが必要です' }, { status: 400 });
    }

    const supabase = await createClient();

    // 認証状態を確認
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { error } = await supabase
      .from('favorite_papers')
      .delete()
      .eq('id', paperId);

    if (error) {
      console.error('お気に入り論文削除エラー:', error);
      return NextResponse.json({ error: 'お気に入り論文の削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('お気に入り論文削除エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
} 