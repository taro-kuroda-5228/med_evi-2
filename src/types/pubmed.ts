export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  doi?: string;
  keywords?: string[];
  url: string;
}

export interface PubMedSearchResponse {
  articles: PubMedArticle[];
  totalResults: number;
  page: number;
  pageSize: number;
}

export interface PubMedError {
  code: string;
  message: string;
  details?: unknown;
}
