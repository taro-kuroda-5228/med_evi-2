import { test, expect } from '@playwright/test';

test.describe('検索フォームのE2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('正常系: 検索が成功し、結果が表示される', async ({ page }) => {
    // 検索クエリ入力
    await page.getByLabel('検索クエリ').fill('テストクエリ');

    // 応答言語を選択
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: '日本語' }).click();

    // 検索ボタンをクリック
    const searchButton = page.getByRole('button', { name: '検索' });
    await searchButton.click();

    // 検索結果が表示されることを確認
    await expect(page.getByText('検索結果')).toBeVisible();
    await expect(page.getByText('サンプル論文タイトル')).toBeVisible();
  });

  test('エラーケース: 空の検索クエリで送信', async ({ page }) => {
    // 検索ボタンをクリック
    await page.getByRole('button', { name: '検索' }).click();

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('検索クエリを入力してください')).toBeVisible();
  });

  test('エラーケース: 長すぎる検索クエリで送信', async ({ page }) => {
    // 長すぎる検索クエリを入力
    const longQuery = 'a'.repeat(201);
    await page.getByLabel('検索クエリ').fill(longQuery);

    // 検索ボタンをクリック
    await page.getByRole('button', { name: '検索' }).click();

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('検索クエリは200文字以内で入力してください')).toBeVisible();
  });

  test('検索結果の内容確認', async ({ page }) => {
    // 検索クエリ入力
    await page.getByLabel('検索クエリ').fill('テストクエリ');

    // 応答言語を選択
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: '日本語' }).click();

    // 検索ボタンをクリック
    await page.getByRole('button', { name: '検索' }).click();

    // 検索結果の内容を確認
    await expect(page.getByText('サンプル論文タイトル')).toBeVisible();
    await expect(page.getByText('これはサンプル論文のアブストラクトです。')).toBeVisible();
    await expect(page.getByText('著者1, 著者2')).toBeVisible();
    await expect(page.getByText('サンプルジャーナル')).toBeVisible();
  });

  test('キーボード操作での検索', async ({ page }) => {
    // 検索クエリ入力
    await page.getByLabel('検索クエリ').fill('テストクエリ');

    // 応答言語を選択（キーボード操作）
    await page.getByRole('combobox').press('Enter');
    await page.getByRole('option', { name: '日本語' }).press('Enter');

    // 検索ボタンをクリック（キーボード操作）
    await page.getByRole('button', { name: '検索' }).press('Enter');

    // 検索結果が表示されることを確認
    await expect(page.getByText('検索結果')).toBeVisible();
  });
});
