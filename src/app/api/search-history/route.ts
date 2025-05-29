import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('検索履歴API GET開始');
    const supabase = await createClient();
    
    // 認証状態を確認
    console.log('認証状態確認中...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    console.log('認証結果:', { 
      hasSession: !!session, 
      userId: session?.user?.id, 
      authError: authError?.message 
    });
    
    if (authError || !session) {
      console.log('認証失敗 - 401を返す');
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 検索履歴を取得
    console.log('検索履歴取得中... user_id:', session.user.id);
    
    // まずテーブルの存在確認
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('search_queries')
        .select('count', { count: 'exact', head: true });
      
      console.log('テーブル存在確認:', { 
        tableError: tableError?.message,
        tableExists: !tableError 
      });
      
      if (tableError) {
        console.error('search_queriesテーブルが存在しないか、アクセス権限がありません:', tableError);
        return NextResponse.json(
          { 
            error: 'search_queriesテーブルにアクセスできません',
            details: tableError.message 
          },
          { status: 500 }
        );
      }
    } catch (tableCheckError) {
      console.error('テーブル確認エラー:', tableCheckError);
    }
    
    const { data: searchHistory, error } = await supabase
      .from('search_queries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    console.log('Supabaseクエリ結果:', { 
      dataCount: searchHistory?.length || 0, 
      error: error?.message,
      data: searchHistory 
    });

    if (error) {
      console.error('検索履歴取得エラー:', error);
      return NextResponse.json(
        { error: '検索履歴の取得に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    console.log('検索履歴API成功 - データ件数:', searchHistory?.length || 0);
    return NextResponse.json({ searchHistory: searchHistory || [] });

  } catch (error) {
    console.error('検索履歴API エラー:', error);
    return NextResponse.json(
      { 
        error: '検索履歴の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('検索履歴保存API POST開始');
    const supabase = await createClient();
    
    // 認証状態を確認
    console.log('保存API認証状態確認中...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    console.log('保存API認証結果:', { 
      hasSession: !!session, 
      userId: session?.user?.id, 
      authError: authError?.message 
    });
    
    if (authError || !session) {
      console.log('保存API認証失敗 - 401を返す');
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // ユーザープロフィールの存在確認と自動作成
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!existingUser) {
      console.log('ユーザープロフィールが存在しないため作成中...');
      const { error: createUserError } = await supabase
        .from('users')
        .insert([{
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email || '',
          created_at: new Date().toISOString()
        }]);

      if (createUserError) {
        console.error('ユーザープロフィール作成エラー:', createUserError);
        // プロフィール作成に失敗してもエラーにしない（既に存在する可能性）
      } else {
        console.log('ユーザープロフィールを作成しました');
      }
    }

    const body = await request.json();
    const { query, results_count, is_favorite = false, answer = '', articles = [] } = body;
    
    console.log('保存するデータ:', { query, results_count, is_favorite, answer: answer.substring(0, 100) + '...', articlesCount: articles.length, userId: session.user.id });

    if (!query) {
      console.log('クエリが空のため400を返す');
      return NextResponse.json(
        { error: 'クエリが必要です' },
        { status: 400 }
      );
    }

    // 既存の同じクエリをチェック（時間制限なし）
    const { data: existingQuery } = await supabase
      .from('search_queries')
      .select('id, created_at')
      .eq('user_id', session.user.id)
      .eq('query', query)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingQuery) {
      // 既存のクエリが存在する場合は、results_countとanswerのみ更新（created_atは更新しない）
      console.log('既存のクエリを更新中...', existingQuery.id);
      const { data: updatedData, error: updateError } = await supabase
        .from('search_queries')
        .update({ 
          results_count: results_count,
          answer: answer,
          citations: JSON.stringify(articles)
          // created_atは更新しない（元の検索時刻を保持）
        })
        .eq('id', existingQuery.id)
        .select()
        .single();

      if (updateError) {
        console.error('検索履歴更新エラー:', updateError);
        return NextResponse.json(
          { 
            success: false, 
            error: updateError.message,
            data: null 
          },
          { status: 500 }
        );
      }

      console.log('検索履歴更新結果:', { success: true, data: updatedData });
      return NextResponse.json({ 
        success: true, 
        data: updatedData,
        message: '検索履歴が更新されました' 
      });
    }

    // Supabaseに検索履歴を挿入（新規の場合のみ）
    console.log('Supabaseに新規検索履歴を挿入中...');
    
    const insertData = {
      query: query,
      results_count: results_count,
      is_favorite: is_favorite,
      user_id: session.user.id,
      answer: answer,
      citations: JSON.stringify(articles)
    };
    
    console.log('挿入するデータ:', insertData);
    
    const { data, error } = await supabase
      .from('search_queries')
      .insert([insertData])
      .select();

    if (error) {
      console.error('検索履歴保存エラー:', error);
      
      // 重複エラーの場合は、既存データを更新
      if (error.code === '23505') { // PostgreSQLの重複エラーコード
        console.log('重複エラーが発生、既存データを更新します');
        const { data: updateData, error: updateError } = await supabase
          .from('search_queries')
          .update({ 
            results_count: results_count,
            answer: answer,
            citations: JSON.stringify(articles)
          })
          .eq('user_id', session.user.id)
          .eq('query', query)
          .select()
          .single();

        if (updateError) {
          console.error('重複時の更新エラー:', updateError);
          return NextResponse.json(
            { 
              success: false, 
              error: updateError.message,
              data: null 
            },
            { status: 500 }
          );
        }

        console.log('重複時の更新結果:', { success: true, data: updateData });
        return NextResponse.json({ 
          success: true, 
          data: updateData,
          message: '検索履歴が更新されました（重複回避）' 
        });
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          data: null 
        },
        { status: 500 }
      );
    }

    console.log('検索履歴挿入結果:', { success: true, data });
    
    return NextResponse.json({ 
      success: true, 
      data: data[0],
      message: '検索履歴が正常に保存されました' 
    });

  } catch (error) {
    console.error('検索履歴保存API エラー:', error);
    return NextResponse.json(
      { 
        error: '検索履歴の保存中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, is_favorite } = body;

    if (!id || typeof is_favorite !== 'boolean') {
      return NextResponse.json(
        { error: 'IDとお気に入り状態が必要です' },
        { status: 400 }
      );
    }

    // お気に入り状態を更新
    const { data, error } = await supabase
      .from('search_queries')
      .update({ is_favorite })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('お気に入り更新エラー:', error);
      return NextResponse.json(
        { error: 'お気に入り状態の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'お気に入り状態を更新しました',
      searchHistory: data 
    });

  } catch (error) {
    console.error('お気に入り更新API エラー:', error);
    return NextResponse.json(
      { 
        error: 'お気に入り状態の更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
} 