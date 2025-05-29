import 'dotenv/config';
import { PubMedClient } from '../src/lib/pubmed-client.js';
import { generateSummary } from '../src/lib/summarizer.js';

(async () => {
  const client = new PubMedClient();
  const result = await client.search('COVID-19', 1);
  const article = result.articles[0];
  console.log('--- PubMed API レスポンス ---');
  console.log(article);
  const paper = {
    title: article.title,
    authors: article.authors,
    journal: article.journal,
    year: article.publicationDate.split('-')[0],
    abstract: article.abstract,
    pmid: article.pmid,
    doi: article.doi || '',
    keywords: article.keywords,
  };
  console.log('--- 論文情報 ---');
  console.log(paper);
  const summary = await generateSummary([paper]);
  console.log('--- 論文タイトル ---\n' + paper.title + '\n--- 要約 ---\n' + summary);
})();
