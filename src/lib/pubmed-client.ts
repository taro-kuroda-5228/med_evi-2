import axios from 'axios';
import NodeCache from 'node-cache';
import { parseStringPromise } from 'xml2js';
import { translateQuery } from './query-translator.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ESM環境で__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルのパスを明示的に指定
config({ path: resolve(__dirname, '../../.env') });

// 環境変数の確認
console.log('PUBMED_API_KEY:', process.env.PUBMED_API_KEY);

// axiosのデフォルト設定
axios.defaults.family = 4; // IPv4のみを使用

// 環境変数から設定を読み込む
const API_KEY = process.env.PUBMED_API_KEY;
const BASE_URL = process.env.PUBMED_API_BASE_URL || 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const RATE_LIMIT = parseInt(process.env.PUBMED_API_RATE_LIMIT || '3', 10);
const CACHE_TTL = parseInt(process.env.PUBMED_API_CACHE_TTL || '3600', 10);

if (!API_KEY) {
  throw new Error(
    'PUBMED_API_KEY is not set in environment variables. Please check your .env file.'
  );
}

// レート制限用のキュー
class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequestTime = 0;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minInterval = 1000 / RATE_LIMIT;

      if (timeSinceLastRequest < minInterval) {
        await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
      }

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        await task();
      }
    }

    this.processing = false;
  }
}

export interface Article {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  doi?: string;
  keywords: string[];
  url: string;
}

export interface SearchResult {
  articles: Article[];
  totalResults: number;
}

export class PubMedClient {
  private cache: NodeCache;
  private rateLimiter: RateLimiter;
  private static readonly PAGE_SIZE = 3; // 最大3件に固定

  constructor() {
    this.cache = new NodeCache({
      stdTTL: CACHE_TTL,
      checkperiod: CACHE_TTL * 0.2,
      useClones: false,
    });
    this.rateLimiter = new RateLimiter();
  }

  async search(query: string, page: number = 1): Promise<SearchResult> {
    const pageSize = PubMedClient.PAGE_SIZE;
    const cacheKey = `search:${query}:${page}:${pageSize}`;
    const cachedResult = this.cache.get<SearchResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      console.log('PubMed検索実行:', query);
      const searchResponse = await this.rateLimiter.add(async () => {
        const response = await axios.get(`${BASE_URL}/esearch.fcgi`, {
          params: {
            db: 'pubmed',
            term: query,
            retmode: 'json',
            retstart: (page - 1) * pageSize,
            retmax: pageSize,
            api_key: API_KEY,
          },
        });
        return response.data;
      });
      console.log('PubMed検索レスポンス:', JSON.stringify(searchResponse, null, 2));

      const articleIds = searchResponse.esearchresult.idlist;
      console.log('取得した論文ID:', articleIds);

      const articles = await Promise.all(
        articleIds.map((id: string) => this.fetchArticleDetails(id))
      );

      const result: SearchResult = {
        articles,
        totalResults: parseInt(searchResponse.esearchresult.count[0], 10),
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('PubMed API エラー:', error.response?.data);
        throw {
          code: 'API_ERROR',
          message: `PubMed API error: ${error.response?.data?.message || error.message}`,
          status: error.response?.status,
        };
      }
      throw {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }

  async fetchArticleDetails(pmid: string): Promise<Article> {
    const cacheKey = `article:${pmid}`;
    const cachedArticle = this.cache.get<Article>(cacheKey);
    if (cachedArticle) {
      return cachedArticle;
    }

    try {
      const response = await this.rateLimiter.add(async () => {
        const result = await axios.get(`${BASE_URL}/efetch.fcgi`, {
          params: {
            db: 'pubmed',
            id: pmid,
            retmode: 'xml',
            api_key: API_KEY,
          },
        });
        return result.data;
      });

      const parsedXml = await parseStringPromise(response);
      console.log('--- PubMed API XML レスポンス ---');
      console.log(parsedXml);
      const article = parsedXml.PubmedArticleSet.PubmedArticle[0].MedlineCitation[0].Article[0];
      const citation = parsedXml.PubmedArticleSet.PubmedArticle[0].MedlineCitation[0];

      const authors =
        article.AuthorList?.[0].Author?.map((author: any) => {
          const lastName = author.LastName?.[0] || '';
          const foreName = author.ForeName?.[0] || '';
          return `${lastName} ${foreName}`.trim();
        }) || [];

      const pubDate = article.Journal[0].JournalIssue[0].PubDate[0];
      const year = pubDate.Year?.[0] || '';
      const month = pubDate.Month?.[0]?.padStart(2, '0') || '01';
      const day = pubDate.Day?.[0]?.padStart(2, '0') || '01';

      const result: Article = {
        pmid,
        title: article.ArticleTitle[0],
        abstract: article.Abstract?.[0].AbstractText?.[0] || '',
        authors,
        journal: article.Journal[0].Title[0],
        publicationDate: `${year}-${month}-${day}`,
        doi: article.ELocationID?.find((el: any) => el.$.EIdType === 'doi')?.[0],
        keywords: citation.KeywordList?.[0].Keyword?.map((k: any) => k._ || k) || [],
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw {
          code: 'API_ERROR',
          message: `PubMed API error: ${error.response?.data?.message || error.message}`,
          status: error.response?.status,
        };
      }
      throw {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }

  // 日本語クエリを受け取り、英語に翻訳してPubMed検索
  async searchWithJapaneseQuery(japaneseQuery: string, page: number = 1): Promise<SearchResult> {
    console.log('日本語クエリ:', japaneseQuery);
    const englishQuery = await translateQuery(japaneseQuery);
    console.log('翻訳後の英語クエリ:', englishQuery);
    return this.search(englishQuery, page);
  }
}
