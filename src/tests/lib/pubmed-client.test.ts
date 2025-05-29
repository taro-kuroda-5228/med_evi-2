import axios from 'axios';
import { PubMedClient } from '../../lib/pubmed-client';
import { mockSearchResponse, mockArticleXml } from '../mocks/pubmed-mock';

// axiosのモック
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PubMedClient', () => {
  let client: PubMedClient;

  beforeEach(() => {
    client = new PubMedClient();
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('正常に検索結果を取得できること', async () => {
      // 検索APIのモック
      mockedAxios.get.mockResolvedValueOnce({ data: mockSearchResponse });
      // 論文詳細APIのモック
      mockedAxios.get.mockResolvedValueOnce({ data: mockArticleXml });
      mockedAxios.get.mockResolvedValueOnce({ data: mockArticleXml });

      const result = await client.search('テスト');

      expect(result.articles).toHaveLength(2);
      expect(result.totalResults).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);

      // 論文の内容を確認
      const article = result.articles[0];
      expect(article.title).toBe('テスト論文タイトル');
      expect(article.abstract).toBe('これはテスト論文のアブストラクトです。');
      expect(article.authors).toHaveLength(2);
      expect(article.authors[0]).toBe('山田 太郎');
      expect(article.journal).toBe('テストジャーナル');
      expect(article.publicationDate).toBe('2024-03-15');
      expect(article.doi).toBe('10.1234/test.2024.001');
      expect(article.keywords).toHaveLength(2);
      expect(article.keywords).toContain('テスト');
    });

    it('APIエラー時に適切なエラーを返すこと', async () => {
      const errorMessage = 'API Error';
      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));

      await expect(client.search('テスト')).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: errorMessage,
      });
    });

    it('キャッシュが機能すること', async () => {
      // 最初の呼び出し
      mockedAxios.get.mockResolvedValueOnce({ data: mockSearchResponse });
      mockedAxios.get.mockResolvedValueOnce({ data: mockArticleXml });
      mockedAxios.get.mockResolvedValueOnce({ data: mockArticleXml });

      const result1 = await client.search('テスト');

      // 2回目の呼び出し（キャッシュから取得）
      const result2 = await client.search('テスト');

      expect(result1).toEqual(result2);
      // axios.getは1回だけ呼ばれることを確認
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('fetchArticleDetails', () => {
    it('論文の詳細情報を正しく取得できること', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockArticleXml });

      const article = await client['fetchArticleDetails']('12345678');

      expect(article).toMatchObject({
        pmid: '12345678',
        title: 'テスト論文タイトル',
        abstract: 'これはテスト論文のアブストラクトです。',
        authors: ['山田 太郎', '鈴木 花子'],
        journal: 'テストジャーナル',
        publicationDate: '2024-03-15',
        doi: '10.1234/test.2024.001',
        keywords: ['テ', '医'],
      });
    });

    it('論文が見つからない場合に適切なエラーを返すこと', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Not Found'));

      await expect(client['fetchArticleDetails']('99999999')).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: 'Not Found',
      });
    });
  });
});
