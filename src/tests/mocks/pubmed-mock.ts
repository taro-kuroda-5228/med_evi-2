export const mockSearchResponse = {
  esearchresult: {
    count: ['2'],
    idlist: ['12345678', '87654321'],
  },
};

export const mockArticleXml = `
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle, 1st January 2019//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_190101.dtd">
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <Article>
        <ArticleTitle>テスト論文タイトル</ArticleTitle>
        <Abstract>
          <AbstractText>これはテスト論文のアブストラクトです。</AbstractText>
        </Abstract>
        <AuthorList>
          <Author>
            <LastName>山田</LastName>
            <ForeName>太郎</ForeName>
          </Author>
          <Author>
            <LastName>鈴木</LastName>
            <ForeName>花子</ForeName>
          </Author>
        </AuthorList>
        <Journal>
          <Title>テストジャーナル</Title>
          <JournalIssue>
            <PubDate>
              <Year>2024</Year>
              <Month>03</Month>
              <Day>15</Day>
            </PubDate>
          </JournalIssue>
        </Journal>
        <ELocationID EIdType="doi">10.1234/test.2024.001</ELocationID>
      </Article>
      <KeywordList>
        <Keyword>テスト</Keyword>
        <Keyword>医学</Keyword>
      </KeywordList>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>
`;

// パース後の期待される結果
export const expectedArticle = {
  pmid: '12345678',
  title: 'テスト論文タイトル',
  abstract: 'これはテスト論文のアブストラクトです。',
  authors: ['山田 太郎', '鈴木 花子'],
  journal: 'テストジャーナル',
  publicationDate: '2024-03-15',
  doi: '10.1234/test.2024.001',
  keywords: ['テスト', '医学'],
  url: 'https://pubmed.ncbi.nlm.nih.gov/12345678/',
};
