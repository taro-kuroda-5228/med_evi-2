#!/usr/bin/env node

/**
 * API統合テストスクリプト
 * 
 * 使用方法:
 * node scripts/test_api.js
 */

const BASE_URL = 'http://localhost:3000';

// テスト用のユーザーID（実際のテストでは認証されたユーザーIDを使用）
const TEST_USER_ID = 'test-user-id';

async function testAPI() {
  console.log('🧪 API統合テストを開始します...\n');

  try {
    // 1. フォルダー一覧取得テスト
    console.log('📁 フォルダー一覧取得テスト');
    const foldersResponse = await fetch(`${BASE_URL}/api/folders?userId=${TEST_USER_ID}`);
    const foldersData = await foldersResponse.json();
    console.log('ステータス:', foldersResponse.status);
    console.log('レスポンス:', JSON.stringify(foldersData, null, 2));
    console.log('');

    // 2. フォルダー作成テスト
    console.log('📁 フォルダー作成テスト');
    const createFolderResponse = await fetch(`${BASE_URL}/api/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'テストフォルダー',
        userId: TEST_USER_ID,
      }),
    });
    const createFolderData = await createFolderResponse.json();
    console.log('ステータス:', createFolderResponse.status);
    console.log('レスポンス:', JSON.stringify(createFolderData, null, 2));
    console.log('');

    // 3. お気に入り論文一覧取得テスト
    console.log('📄 お気に入り論文一覧取得テスト');
    const papersResponse = await fetch(`${BASE_URL}/api/favorite-papers?userId=${TEST_USER_ID}`);
    const papersData = await papersResponse.json();
    console.log('ステータス:', papersResponse.status);
    console.log('レスポンス:', JSON.stringify(papersData, null, 2));
    console.log('');

    // 4. お気に入り論文追加テスト
    console.log('📄 お気に入り論文追加テスト');
    const addPaperResponse = await fetch(`${BASE_URL}/api/favorite-papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'テスト論文タイトル',
        authors: 'テスト著者',
        journal: 'テストジャーナル',
        year: '2024',
        doi: '10.1000/test.2024.001',
        userId: TEST_USER_ID,
      }),
    });
    const addPaperData = await addPaperResponse.json();
    console.log('ステータス:', addPaperResponse.status);
    console.log('レスポンス:', JSON.stringify(addPaperData, null, 2));
    console.log('');

    console.log('✅ API統合テスト完了');

  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

// メイン実行
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI }; 