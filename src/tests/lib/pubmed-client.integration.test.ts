import { PubMedClient } from '../../lib/pubmed-client';
import axios from 'axios';

// axiosのデフォルト設定
axios.defaults.family = 4; // IPv4のみを使用

describe('PubMedClient Integration Tests', () => {
  let client: PubMedClient;

  beforeAll(() => {
    client = new PubMedClient();
  });

  // テストの実行前に少し待機する（APIレート制限を考慮）
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // テスト間の待機時間を設定
  const waitTime = 10000; // 10秒に延長

  // リトライロジック用のヘルパー関数
  const retryOperation = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> => {
    let lastError: unknown;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === 'object'
              ? JSON.stringify(error)
              : String(error);
        console.log(`リトライ試行 ${attempt}/${maxRetries} 失敗:`, {
          error: errorMessage,
          delay: delay,
        });

        if (attempt < maxRetries) {
          await wait(delay);
          delay *= 2; // 指数バックオフ
        }
      }
    }

    throw lastError;
  };

  // エラーハンドリング用のヘルパー関数
  const handleApiError = (error: unknown) => {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      status: (error as any)?.status,
      response: (error as any)?.response,
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
    };
    console.error('APIエラーの詳細:', errorDetails);
    throw error;
  };

  // 各テストの前に待機時間を設定
  beforeEach(async () => {
    await wait(waitTime); // 10秒待機
  });

  describe('実際のPubMed APIを使用したテスト', () => {
    // 検索テストを個別のテストケースに分割
    describe('検索機能のテスト', () => {
      it('英語クエリで論文を検索できること', async () => {
        try {
          const result = await retryOperation(() => client.search('covid-19 vaccine efficacy'));

          expect(result.articles).toBeDefined();
          expect(result.articles.length).toBeGreaterThan(0);
          expect(result.totalResults).toBeGreaterThan(0);

          const article = result.articles[0];
          expect(article.pmid).toBeDefined();
          expect(article.title).toBeDefined();
          expect(article.abstract).toBeDefined();
          expect(article.authors.length).toBeGreaterThan(0);
          expect(article.journal).toBeDefined();
          expect(article.publicationDate).toBeDefined();
          expect(article.url).toBeDefined();

          console.log('検索結果:', {
            totalResults: result.totalResults,
            firstArticle: {
              title: article.title,
              authors: article.authors,
              journal: article.journal,
              publicationDate: article.publicationDate,
            },
          });
        } catch (error) {
          handleApiError(error);
        }
      }, 30000);

      it.skip('日本語の検索クエリでも動作すること', async () => {
        try {
          const result = await retryOperation(() => client.search('COVID-19 ワクチン'));
          expect(result.articles).toBeDefined();
          expect(result.articles.length).toBeGreaterThan(0);
          const article = result.articles[0];
          console.log('日本語検索結果:', {
            title: article.title,
            authors: article.authors,
            journal: article.journal,
            publicationDate: article.publicationDate,
          });
        } catch (error) {
          handleApiError(error);
        }
      });
    });

    // 論文詳細取得のテスト
    describe('論文詳細取得のテスト', () => {
      it('特定のPMIDで論文を取得できること', async () => {
        try {
          const pmid = '33306989'; // Modernaワクチンの臨床試験論文
          const article = await retryOperation(() => client['fetchArticleDetails'](pmid));

          expect(article).toBeDefined();
          expect(article.pmid).toBe(pmid);
          expect(article.title).toContain('SARS-CoV-2');
          expect(article.abstract).toBeDefined();
          expect(article.authors.length).toBeGreaterThan(0);

          console.log('特定論文の詳細:', {
            title: article.title,
            authors: article.authors,
            journal: article.journal,
            publicationDate: article.publicationDate,
          });
        } catch (error) {
          handleApiError(error);
        }
      }, 30000);
    });

    // ページネーションのテスト
    describe('ページネーションのテスト', () => {
      it('ページネーションが機能すること', async () => {
        try {
          const pageSize = 5;
          const page1 = await retryOperation(() => client.search('covid-19', 1, pageSize));
          await wait(waitTime); // ページ間で10秒待機
          const page2 = await retryOperation(() => client.search('covid-19', 2, pageSize));

          expect(page1.articles.length).toBe(pageSize);
          expect(page2.articles.length).toBe(pageSize);
          expect(page1.articles[0].pmid).not.toBe(page2.articles[0].pmid);

          console.log('ページネーション結果:', {
            page1Total: page1.totalResults,
            page1Articles: page1.articles.length,
            page2Articles: page2.articles.length,
          });
        } catch (error) {
          handleApiError(error);
        }
      }, 30000);
    });
  });

  jest.setTimeout(60000); // タイムアウトを60秒に延長
});
