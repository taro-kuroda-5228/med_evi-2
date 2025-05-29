// 環境変数の設定を確認
if (!process.env.PUBMED_API_KEY) {
  throw new Error('PUBMED_API_KEY is not set in .env.local');
}

// デフォルト値の設定
process.env.PUBMED_API_BASE_URL =
  process.env.PUBMED_API_BASE_URL || 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
process.env.PUBMED_API_RATE_LIMIT = process.env.PUBMED_API_RATE_LIMIT || '3';
process.env.PUBMED_API_CACHE_TTL = process.env.PUBMED_API_CACHE_TTL || '3600';
