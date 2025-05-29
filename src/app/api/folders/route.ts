import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// フォルダー一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証状態を確認
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('フォルダー取得エラー:', error);
      return NextResponse.json({ error: 'フォルダーの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ folders: data || [] });
  } catch (error) {
    console.error('フォルダー取得エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}

// フォルダー作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'フォルダー名が必要です' }, { status: 400 });
    }

    const supabase = await createClient();

    // 認証状態を確認
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('folders')
      .insert([
        {
          name: name.trim(),
          user_id: session.user.id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('フォルダー作成エラー:', error);
      return NextResponse.json({ error: 'フォルダーの作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ folder: data });
  } catch (error) {
    console.error('フォルダー作成エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}

// フォルダー削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'フォルダーIDが必要です' }, { status: 400 });
    }

    const supabase = await createClient();

    // 認証状態を確認
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // フォルダー内の論文を「未分類」フォルダーに移動
    await supabase
      .from('favorite_papers')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    // フォルダーを削除
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      console.error('フォルダー削除エラー:', error);
      return NextResponse.json({ error: 'フォルダーの削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('フォルダー削除エラー:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
} 