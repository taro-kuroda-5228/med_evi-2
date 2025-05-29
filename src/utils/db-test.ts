import { supabase } from '@/lib/supabase';

export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'データベース接続に成功しました',
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: 'データベース接続に失敗しました',
      error,
    };
  }
}
