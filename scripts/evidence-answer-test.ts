import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ESM環境で__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルのパスを明示的に指定
config({ path: resolve(__dirname, '../.env') });

// 環境変数の確認
console.log('PUBMED_API_KEY:', process.env.PUBMED_API_KEY);

import { PubMedClient } from '../src/lib/pubmed-client.js';
import { generateSummary, Paper } from '../src/lib/summarizer.js';

async function main() {
  const client = new PubMedClient();
  const japaneseQuery = '高齢者のインフルエンザワクチンの有効性は？';

  // 1. 日本語クエリでPubMed検索
  console.log('PubMed検索を実行中...');
  const searchResult = await client.searchWithJapaneseQuery(japaneseQuery);
  console.log('検索結果:', JSON.stringify(searchResult, null, 2));

  // 2. Article[] → Paper[] へ変換
  const papers: Paper[] = searchResult.articles.map(article => ({
    title: article.title,
    authors: article.authors,
    journal: article.journal,
    year: article.publicationDate.split('-')[0],
    abstract: article.abstract,
    pmid: article.pmid,
    doi: article.doi,
    keywords: article.keywords,
  }));
  console.log('変換後の論文情報:', JSON.stringify(papers, null, 2));

  // 3. 論文情報を要約
  console.log('要約を生成中...');
  const summary = await generateSummary(papers);

  // 4. 結果表示
  console.log('--- 要約 ---');
  console.log(summary);
}

main().catch(console.error);
