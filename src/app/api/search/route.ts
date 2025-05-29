import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// PubMed APIの設定
const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PUBMED_API_KEY = process.env.PUBMED_API_KEY;

// OpenAI APIの設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  pubDate: string;
  abstract: string;
  doi?: string;
}

interface SearchResult {
  articles: PubMedArticle[];
  summary: string;
  totalResults: number;
  searchQuery: string;
}

// PubMed検索（タイムアウト・リトライ対応）
async function searchPubMed(query: string, maxResults: number = 10): Promise<string[]> {
  const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi`;
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: maxResults.toString(),
    retmode: 'json',
    sort: 'relevance',
    ...(PUBMED_API_KEY && { api_key: PUBMED_API_KEY }),
  });

  console.log('PubMed検索URL:', `${searchUrl}?${params}`);
  
  const maxRetries = 3;
  const timeoutMs = 20000; // 20秒に延長
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`PubMed検索試行 ${attempt}/${maxRetries}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(`${searchUrl}?${params}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MedEvidence/1.0 (https://med-evi.example.com)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`PubMed API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('PubMed検索レスポンス:', data);
      
      const idlist = data.esearchresult?.idlist || [];
      console.log('取得したPMID一覧:', idlist);

      return idlist;

    } catch (error) {
      console.error(`PubMed検索試行 ${attempt} 失敗:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`PubMed検索が${maxRetries}回失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
      
      // 次の試行前に少し待機（指数バックオフ）
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return [];
}

// PubMed記事詳細取得（タイムアウト・リトライ対応）
async function fetchPubMedDetails(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];

  const fetchUrl = `${PUBMED_BASE_URL}/efetch.fcgi`;
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    rettype: 'abstract',
    ...(PUBMED_API_KEY && { api_key: PUBMED_API_KEY }),
  });

  console.log('PubMed詳細取得URL:', `${fetchUrl}?${params}`);

  // リトライ機能付きfetch
  const maxRetries = 3;
  const timeoutMs = 15000; // 15秒タイムアウト（XMLは大きいため）
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`PubMed詳細取得試行 ${attempt}/${maxRetries}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(`${fetchUrl}?${params}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MedEvidence/1.0 (https://med-evi.example.com)',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`PubMed詳細取得エラー: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      console.log('PubMed XMLレスポンス（最初の1000文字）:', xmlText.substring(0, 1000));
      
      const articles = parsePubMedXML(xmlText);
      console.log('パースされた記事数:', articles.length);
      
      return articles;
      
    } catch (error) {
      console.error(`PubMed詳細取得試行 ${attempt} 失敗:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`PubMed詳細取得が${maxRetries}回失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
      
      // 次の試行前に少し待機
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return [];
}

// PubMed XMLパース
function parsePubMedXML(xmlText: string): PubMedArticle[] {
  const articles: PubMedArticle[] = [];
  
  // 簡単なXMLパースのためのRegex（本格的な実装ではXMLパーサーを使用）
  const articleMatches = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
  
  for (const articleXml of articleMatches) {
    try {
      const pmid = extractXmlContent(articleXml, 'PMID') || '';
      const title = extractXmlContent(articleXml, 'ArticleTitle') || '';
      const journal = extractXmlContent(articleXml, 'Title') || '';
      const pubDate = extractPubDate(articleXml);
      const abstract = extractAbstract(articleXml);
      const authors = extractAuthors(articleXml);
      const doi = extractDoi(articleXml);

      if (pmid && title) {
        articles.push({
          pmid,
          title: cleanText(title),
          authors,
          journal: cleanText(journal),
          pubDate,
          abstract: cleanText(abstract),
          doi: cleanText(doi),
        });
      }
    } catch (error) {
      console.error('記事パースエラー:', error);
    }
  }

  return articles;
}

// XML要素の内容を抽出（改善版）
function extractXmlContent(xml: string, tagName: string): string {
  // より柔軟なRegexパターンを使用
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'),
    new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

// 出版日を抽出（改善版）
function extractPubDate(xml: string): string {
  // PubDate要素全体を取得
  const pubDateMatch = xml.match(/<PubDate[^>]*>([\s\S]*?)<\/PubDate>/i);
  if (!pubDateMatch) return '';
  
  const pubDateXml = pubDateMatch[1];
  
  // Year要素を探す
  let year = extractXmlContent(pubDateXml, 'Year');
  if (!year) {
    // MedlineDate要素から年を抽出
    const medlineDate = extractXmlContent(pubDateXml, 'MedlineDate');
    if (medlineDate) {
      const yearMatch = medlineDate.match(/(\d{4})/);
      year = yearMatch ? yearMatch[1] : '';
    }
  }
  
  const month = extractXmlContent(pubDateXml, 'Month');
  const day = extractXmlContent(pubDateXml, 'Day');
  
  if (year) {
    return [year, month, day].filter(Boolean).join('-');
  }
  return '';
}

// 著者を抽出（改善版）
function extractAuthors(xml: string): string[] {
  const authors: string[] = [];
  
  // AuthorList要素を探す
  const authorListMatch = xml.match(/<AuthorList[^>]*>([\s\S]*?)<\/AuthorList>/i);
  if (!authorListMatch) return authors;
  
  const authorListXml = authorListMatch[1];
  const authorMatches = authorListXml.match(/<Author[^>]*>([\s\S]*?)<\/Author>/gi) || [];

  for (const authorXml of authorMatches) {
    const lastName = extractXmlContent(authorXml, 'LastName');
    const foreName = extractXmlContent(authorXml, 'ForeName');
    const initials = extractXmlContent(authorXml, 'Initials');
    
    if (lastName) {
      const fullName = [lastName, foreName || initials].filter(Boolean).join(' ');
      authors.push(fullName);
    }
  }

  return authors;
}

// 抄録を抽出（改善版）
function extractAbstract(xml: string): string {
  // Abstract要素全体を取得
  const abstractMatch = xml.match(/<Abstract[^>]*>([\s\S]*?)<\/Abstract>/i);
  if (!abstractMatch) return '';
  
  const abstractXml = abstractMatch[1];
  const abstractTexts = abstractXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi) || [];
  
  if (abstractTexts.length === 0) {
    // AbstractText要素がない場合、Abstract要素の直接の内容を取得
    return cleanText(abstractXml);
  }
  
  return abstractTexts.map(text => {
    const content = text.replace(/<[^>]*>/g, '');
    return cleanText(content);
  }).join(' ');
}

// DOIを抽出（改善版）
function extractDoi(xml: string): string {
  // ELocationID要素でDOIを探す
  const eLocationMatches = xml.match(/<ELocationID[^>]*>([\s\S]*?)<\/ELocationID>/gi) || [];
  
  for (const eLocationXml of eLocationMatches) {
    if (eLocationXml.includes('EIdType="doi"') || eLocationXml.includes("EIdType='doi'")) {
      const doiMatch = eLocationXml.match(/>([^<]+)</);
      if (doiMatch) {
        return doiMatch[1].trim();
      }
    }
  }
  
  // ArticleIdList内のDOIも探す
  const articleIdMatches = xml.match(/<ArticleId[^>]*IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/gi) || [];
  if (articleIdMatches.length > 0 && articleIdMatches[0]) {
    const doiMatch = articleIdMatches[0].match(/>([^<]+)</);
    if (doiMatch) {
      return doiMatch[1].trim();
    }
  }
  
  return '';
}

// テキストをクリーンアップ
function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // HTMLタグを削除
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// OpenAI要約生成（コンテキスト対応版）
async function generateSummary(articles: PubMedArticle[], query: string, previousQueries: string[] = []): Promise<string> {
  if (articles.length === 0) {
    return '検索結果が見つかりませんでした。';
  }

  // 最大3つの論文のみ使用
  const selectedArticles = articles.slice(0, 3);
  
  // 論文の関連性をチェック（改善版）
  const relevantArticles = selectedArticles.filter(article => {
    const titleAndAbstract = (article.title + ' ' + article.abstract).toLowerCase();
    const queryTerms = query.toLowerCase().split(/[？?]/).join('').split(/\s+/);
    
    // 日本語の医学用語を英語に変換してチェック
    const medicalTermMapping: { [key: string]: string[] } = {
      '心不全': ['heart failure', 'cardiac failure', 'congestive heart failure', 'hf', 'acute heart failure', 'chronic heart failure'],
      '急性': ['acute'],
      '慢性': ['chronic'],
      '治療薬': ['treatment', 'therapy', 'drug', 'medication', 'pharmaceutical', 'therapeutic'],
      '薬': ['drug', 'medication', 'pharmaceutical'],
      '治療': ['treatment', 'therapy', 'therapeutic', 'management'],
      '治療方法': ['treatment', 'therapy', 'therapeutic', 'management', 'intervention'],
      '手術': ['surgery', 'surgical', 'operation', 'operative', 'procedure'],
      '手術方法': ['surgical methods', 'surgical procedures', 'operative methods', 'surgery', 'surgical'],
      '薬物': ['drug', 'medication', 'pharmaceutical'],
      '薬剤': ['drug', 'medication', 'pharmaceutical'],
      'ACE阻害薬': ['ace inhibitor', 'ace inhibitors'],
      'ARB': ['arb', 'angiotensin receptor blocker'],
      'β遮断薬': ['beta blocker', 'beta blockers'],
      '利尿薬': ['diuretic', 'diuretics'],
      'ジギタリス': ['digitalis', 'digoxin'],
      'ドブタミン': ['dobutamine'],
      'ドパミン': ['dopamine'],
      'フロセミド': ['furosemide'],
      'スピロノラクトン': ['spironolactone'],
      'ガイドライン': ['guidelines', 'guideline'],
      '診断': ['diagnosis', 'diagnostic'],
      
      // 心臓外科・弁膜症関連
      '大動脈弁': ['aortic valve'],
      '大動脈弁狭窄症': ['aortic stenosis', 'aortic valve stenosis', 'as'],
      '大動脈弁狭窄': ['aortic stenosis', 'aortic valve stenosis'],
      '狭窄症': ['stenosis'],
      '弁膜症': ['valvular disease', 'valve disease'],
      '弁置換': ['valve replacement'],
      '弁置換術': ['valve replacement', 'valve surgery'],
      '大動脈弁置換': ['aortic valve replacement', 'avr'],
      '大動脈弁置換術': ['aortic valve replacement', 'avr', 'savr'],
      'TAVI': ['tavi', 'transcatheter aortic valve implantation', 'transcatheter aortic valve replacement', 'tavr'],
      'SAVR': ['savr', 'surgical aortic valve replacement'],
      '経カテーテル': ['transcatheter', 'percutaneous'],
      '植込み': ['implantation', 'implant'],
      '心臓外科': ['cardiac surgery', 'cardiothoracic surgery'],
      '開心術': ['open heart surgery', 'cardiac surgery'],
      '人工弁': ['prosthetic valve', 'artificial valve'],
      '生体弁': ['bioprosthetic valve', 'tissue valve'],
      '機械弁': ['mechanical valve'],
    };
    
    // より柔軟な関連性チェック
    let hasRelevantTerms = false;
    
    // 1. 直接的なキーワードマッチング
    for (const term of queryTerms) {
      if (medicalTermMapping[term]) {
        for (const englishTerm of medicalTermMapping[term]) {
          if (titleAndAbstract.includes(englishTerm)) {
            console.log(`関連性発見: "${term}" → "${englishTerm}" が論文に含まれています`);
            hasRelevantTerms = true;
            break;
          }
        }
      } else if (titleAndAbstract.includes(term)) {
        console.log(`関連性発見: 直接マッチ "${term}" が論文に含まれています`);
        hasRelevantTerms = true;
      }
      if (hasRelevantTerms) break;
    }
    
    // 2. タイトルに重要なキーワードが含まれている場合は関連性ありとする
    const title = article.title.toLowerCase();
    const importantKeywords = [
      'heart failure', 'acute', 'treatment', 'therapy', 'guidelines', 'management',
      'aortic', 'valve', 'stenosis', 'tavi', 'savr', 'replacement', 'surgery', 'surgical'
    ];
    for (const keyword of importantKeywords) {
      if (title.includes(keyword)) {
        console.log(`タイトル関連性発見: "${keyword}" がタイトルに含まれています`);
        hasRelevantTerms = true;
        break;
      }
    }
    
    // 3. 特定の組み合わせパターンをチェック
    if (query.includes('急性心不全') || query.includes('心不全')) {
      if (title.includes('heart failure') || title.includes('cardiac failure')) {
        console.log('心不全関連の論文として関連性を認定');
        hasRelevantTerms = true;
      }
    }
    
    // 4. 大動脈弁狭窄症関連のパターンチェック
    if (query.includes('大動脈弁') || query.includes('狭窄症') || query.includes('手術')) {
      if (title.includes('aortic') || title.includes('valve') || title.includes('stenosis') || 
          title.includes('tavi') || title.includes('savr') || title.includes('surgery') || 
          title.includes('surgical') || title.includes('replacement')) {
        console.log('大動脈弁狭窄症・心臓外科関連の論文として関連性を認定');
        hasRelevantTerms = true;
      }
    }
    
    console.log(`論文 "${article.title}" の関連性: ${hasRelevantTerms}`);
    return hasRelevantTerms;
  });

  console.log(`関連性チェック: 全${selectedArticles.length}件中${relevantArticles.length}件が関連`);
  
  // 関連性の高い論文がない場合でも、タイトルに基本的なキーワードが含まれていれば使用
  let articlesToUse = relevantArticles;
  if (relevantArticles.length === 0) {
    console.log('関連性の高い論文が見つからないため、基本的なキーワードチェックを実行');
    const basicRelevantArticles = selectedArticles.filter(article => {
      const title = article.title.toLowerCase();
      const basicKeywords = [
        'heart', 'cardiac', 'failure', 'treatment', 'therapy', 'acute', 'chronic',
        'aortic', 'valve', 'stenosis', 'tavi', 'savr', 'surgery', 'surgical', 
        'replacement', 'implantation', 'transcatheter'
      ];
      return basicKeywords.some(keyword => title.includes(keyword));
    });
    
    if (basicRelevantArticles.length > 0) {
      console.log(`基本的なキーワードで${basicRelevantArticles.length}件の関連論文を発見`);
      articlesToUse = basicRelevantArticles;
    } else {
      console.log('基本的なキーワードでも関連論文が見つからないため、一般的な回答を生成');
      return `「${query}」に関する具体的な情報を含む論文が見つかりませんでした。

検索で取得された論文は以下の通りですが、ご質問の内容と直接的な関連性が低いため、詳細な回答を提供することができません：

${selectedArticles.map((article, index) => 
  `${index + 1}. ${article.title} (${article.journal}, ${article.pubDate})`
).join('\n')}

より具体的な情報を得るためには、以下をお試しください：
- 検索キーワードを変更する（例：より具体的な薬剤名、病態名など）
- 英語での検索キーワードを使用する
- 関連する専門的なガイドラインや教科書を参照する

申し訳ございませんが、現在の検索結果では「${query}」に対する適切な医学的情報を提供できません。`;
    }
  }

  // 関連性の高い論文のみを使用
  articlesToUse = articlesToUse.length > 0 ? articlesToUse : selectedArticles;
  
  const articlesText = articlesToUse.map((article, index) => {
    return `${index + 1}. ${article.title}
著者: ${article.authors.slice(0, 2).join(', ')}${article.authors.length > 2 ? ' et al.' : ''}
雑誌: ${article.journal} (${article.pubDate})
抄録: ${article.abstract.substring(0, 500)}${article.abstract.length > 500 ? '...' : ''}
`;
  }).join('\n\n');

  // コンテキスト情報を構築
  let contextInfo = '';
  let avoidanceInstructions = '';
  
  if (previousQueries.length > 0) {
    const recentQueries = previousQueries.slice(-3); // 最新の3つまで
    contextInfo = `\n\n【検索の流れ・コンテキスト】\n`;
    recentQueries.forEach((prevQuery, index) => {
      contextInfo += `${index + 1}. ${prevQuery}\n`;
    });
    contextInfo += `${recentQueries.length + 1}. ${query} ← 現在の質問\n\n`;
    contextInfo += `現在の質問「${query}」は、上記の検索の流れの中で質問されています。特に直前の質問「${recentQueries[recentQueries.length - 1]}」との関連性を考慮して回答してください。`;
    
    // 重複回避のための具体的な指示を生成
    const lastQuery = recentQueries[recentQueries.length - 1];
    if (lastQuery.includes('減量効果') || lastQuery.includes('体重') || lastQuery.includes('効果')) {
      avoidanceInstructions = '\n- 薬剤の基本的なメカニズム（食欲抑制、胃排出遅延等）は既に説明済みのため記載しない\n- 一般的な効果や体重減少効果は既に説明済みのため記載しない';
    }
    if (lastQuery.includes('治療') || lastQuery.includes('薬物療法')) {
      avoidanceInstructions = '\n- 基本的な治療メカニズムや一般的な効果は既に説明済みのため記載しない\n- 薬剤の作用機序は既に説明済みのため記載しない';
    }
    if (lastQuery.includes('診断') || lastQuery.includes('検査')) {
      avoidanceInstructions = '\n- 基本的な診断方法や検査の概要は既に説明済みのため記載しない';
    }
  }

  const prompt = `以下は「${query}」に関する医学論文の検索結果です。医師向けに専門的で読みやすい文章形式で回答してください。${contextInfo}

論文データ：
${articlesText}

回答要件（医師向け）：
1. 箇条書きではなく、読みやすい文章形式で記述
2. 論理的な構成で情報を整理（概要→詳細→特殊例→予後など）
3. 具体的な数値・基準・推奨度を文中に自然に組み込む
4. 参考文献は上記の論文1-${articlesToUse.length}のみを使用し、各文の末尾に[1][2]等で記載
5. 存在しない参考文献番号は使用禁止
6. 「参考文献の追加が必要」等の記載は一切含めない
7. 専門用語・略語を適切に使用
8. 段落分けで読みやすさを向上

${previousQueries.length > 0 ? `
重要：コンテキストを考慮した回答
- 前の質問との関連性を明確に意識して回答してください
- 前の質問で既に説明された基本的なメカニズムや概要は繰り返さない
- 現在の質問に特化した新しい情報のみを提供してください
- 例：「GLP-1作動薬の減量効果について」→「新薬の開発状況は？」の場合、GLP-1作動薬の新薬開発に特化した情報のみ記載
- 例：「糖尿病の治療は？」→「食事療法の詳細は？」の場合、糖尿病の食事療法の具体的な詳細のみ記載
- 前の質問で言及された疾患・治療法・薬剤等の基本説明は省略し、現在の質問の核心部分に焦点を当てる
- 重複する情報（メカニズム、基本的な効果等）は記載しない
` : ''}

重要な注意事項：
- 参考文献番号は1から${articlesToUse.length}までのみ使用可能
- 論文に記載されていない情報は推測で記載しない
- 不確実な情報や推奨度は記載しない
- 各文は必ず上記論文のいずれかに基づく内容とし、該当する論文番号を付ける
- 前の質問で既に説明された内容は一切繰り返さない
- 現在の質問「${query}」に直接関連する新しい情報のみを簡潔に記載する
- 論文の内容が質問と関連性が低い場合は、その旨を明記し、利用可能な情報のみを提供する

このような形式で、現在の質問に特化した新しい情報のみを提供してください。${avoidanceInstructions}`;

  try {
    console.log('OpenAI API呼び出し開始...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは専門医です。提供された論文データのみに基づいて、医師向けに正確で読みやすい文章形式の臨床情報を提供してください。参考文献番号は提供された論文の範囲内（1-${articlesToUse.length}）でのみ使用し、存在しない文献番号や「参考文献の追加が必要」等の記載は絶対に含めないでください。論文に記載されていない情報は推測で記載せず、確実にエビデンスがある内容のみを記述してください。論文の内容が質問と関連性が低い場合は、その旨を明記してください。${previousQueries.length > 0 ? '前の検索クエリとの関連性を強く意識し、コンテキストに沿った回答を提供してください。重要：前の質問で既に説明された基本的なメカニズム、概要、一般的な効果等は一切繰り返さず、現在の質問に特化した新しい情報のみを簡潔に提供してください。' : ''}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const result = completion.choices[0]?.message?.content || '要約の生成に失敗しました。';
    console.log('OpenAI API呼び出し成功、レスポンス長:', result.length);
    return result;
  } catch (error) {
    console.error('OpenAI要約生成エラー:', error);
    if (error instanceof Error) {
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return `要約の生成中にエラーが発生しました。

取得された論文：
${articlesToUse.map((article, index) => 
  `${index + 1}. ${article.title} (${article.journal}, ${article.pubDate})`
).join('\n')}

申し訳ございませんが、現在システムの問題により詳細な要約を生成できません。上記の論文タイトルを参考に、直接PubMedで詳細をご確認ください。`;
  }
}

// 日本語クエリを英語に変換する関数
async function translateQueryToEnglish(query: string): Promise<string> {
  // 日本語が含まれているかチェック
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(query);
  
  if (!hasJapanese) {
    return query; // 既に英語の場合はそのまま返す
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは医学用語の翻訳専門家です。日本語の医学的な検索クエリを、PubMed検索に適した英語の医学用語に翻訳してください。専門用語を正確に使用し、検索に適したキーワード形式で回答してください。',
        },
        {
          role: 'user',
          content: `以下の日本語の医学的検索クエリを、PubMed検索に適した英語の医学用語に翻訳してください：\n\n"${query}"\n\n翻訳された英語のキーワードのみを回答してください。`,
        },
      ],
      max_tokens: 100,
      temperature: 0.1,
    });

    const translatedQuery = completion.choices[0]?.message?.content?.trim() || query;
    console.log(`クエリ翻訳: "${query}" → "${translatedQuery}"`);
    return translatedQuery;
  } catch (error) {
    console.error('クエリ翻訳エラー:', error);
    // 翻訳に失敗した場合は、簡単な日本語→英語の医学用語変換を試行
    return simpleJapaneseToEnglishMedical(query);
  }
}

// 簡単な日本語→英語医学用語変換（医師向け専門用語）
function simpleJapaneseToEnglishMedical(query: string): string {
  const medicalTerms: { [key: string]: string } = {
    // 循環器系
    '糖尿病': 'diabetes mellitus',
    '高血圧': 'hypertension',
    '心筋梗塞': 'myocardial infarction STEMI NSTEMI',
    '脳梗塞': 'cerebral infarction stroke',
    '冠動脈バイパス術': 'coronary artery bypass graft CABG',
    'バイパス術': 'bypass surgery CABG',
    '経皮的冠動脈インターベンション': 'percutaneous coronary intervention PCI',
    '三枝病変': 'three vessel disease multivessel',
    '左主幹部': 'left main coronary artery LMCA',
    '左前下行枝': 'left anterior descending LAD',
    '右冠動脈': 'right coronary artery RCA',
    '回旋枝': 'left circumflex LCX',
    '狭窄': 'stenosis',
    '冠動脈': 'coronary artery',
    '左室機能': 'left ventricular function LVEF',
    '駆出率': 'ejection fraction EF',
    '狭心症': 'angina pectoris',
    '心不全': 'heart failure HFrEF HFpEF',
    '急性心不全': 'acute heart failure',
    '慢性心不全': 'chronic heart failure',
    '心房細動': 'atrial fibrillation AF',
    '心室頻拍': 'ventricular tachycardia VT',
    '心室細動': 'ventricular fibrillation VF',
    
    // 一般的な医学用語
    '適応': 'indication criteria',
    '禁忌': 'contraindication',
    '治療': 'treatment therapy',
    '治療薬': 'therapeutic drugs medications',
    '薬物療法': 'drug therapy pharmacotherapy',
    '手術': 'surgery surgical intervention',
    '予後': 'prognosis outcome',
    '診断': 'diagnosis',
    '症状': 'symptoms clinical presentation',
    '副作用': 'side effects adverse effects',
    '効果': 'efficacy effectiveness',
    '長期': 'long-term',
    '短期': 'short-term',
    '予防': 'prevention prophylaxis',
    '合併症': 'complications',
    '生存率': 'survival rate',
    '死亡率': 'mortality',
    '臨床試験': 'clinical trial RCT',
    'ガイドライン': 'guidelines recommendation',
    '薬': 'drug medication',
    '薬剤': 'medication drug',
    '投与': 'administration',
    '用量': 'dosage dose',
    
    // 心不全治療薬関連
    'ACE阻害薬': 'ace inhibitor',
    'ARB': 'arb',
    'β遮断薬': 'beta blocker',
    '利尿薬': 'diuretic',
    'ジギタリス': 'digitalis',
    'ドブタミン': 'dobutamine',
    'ドパミン': 'dopamine',
    'ノルアドレナリン': 'noradrenaline norepinephrine',
    'フロセミド': 'furosemide',
    'スピロノラクトン': 'spironolactone',
    
    // がん関連
    '癌': 'cancer carcinoma',
    'がん': 'cancer malignancy',
    '食道癌': 'esophageal cancer',
    '胃癌': 'gastric cancer',
    '肺癌': 'lung cancer',
    '乳癌': 'breast cancer',
    '大腸癌': 'colorectal cancer',
    '肝癌': 'hepatocellular carcinoma HCC',
    '膵癌': 'pancreatic cancer',
    '前立腺癌': 'prostate cancer',
    '化学療法': 'chemotherapy',
    '放射線療法': 'radiotherapy radiation therapy',
    '免疫療法': 'immunotherapy',
    '分子標的治療': 'molecular targeted therapy',
    
    // その他の専門用語
    '血圧': 'blood pressure BP',
    '血糖': 'blood glucose',
    'ヘモグロビンA1c': 'HbA1c glycated hemoglobin',
    'コレステロール': 'cholesterol LDL HDL',
    '腎機能': 'renal function eGFR',
    '肝機能': 'liver function',
    '炎症': 'inflammation',
    '感染': 'infection',
    '抗生物質': 'antibiotics',
    '抗凝固': 'anticoagulation',
    '抗血小板': 'antiplatelet',
  };

  let translatedQuery = query;
  
  // 医学用語を英語に置換
  Object.entries(medicalTerms).forEach(([japanese, english]) => {
    const regex = new RegExp(japanese, 'g');
    translatedQuery = translatedQuery.replace(regex, english);
  });

  // 疑問符や助詞を削除
  translatedQuery = translatedQuery
    .replace(/[？?]/g, '')
    .replace(/[のはをにがでと]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`医師向け翻訳: "${query}" → "${translatedQuery}"`);
  return translatedQuery || query;
}

// 代替PubMed検索（より広範囲な検索）
async function searchPubMedAlternative(query: string, maxResults: number = 10): Promise<string[]> {
  // より広範囲な検索のため、クエリを調整
  const broadQuery = query
    .replace(/"/g, '') // 引用符を削除
    .split(' ')
    .filter(word => word.length > 2) // 短い単語を除外
    .join(' OR '); // OR検索に変更
  
  console.log(`代替検索クエリ: "${broadQuery}"`);
  
  const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi`;
  const params = new URLSearchParams({
    db: 'pubmed',
    term: broadQuery,
    retmax: maxResults.toString(),
    retmode: 'json',
    sort: 'relevance',
    ...(PUBMED_API_KEY && { api_key: PUBMED_API_KEY }),
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`${searchUrl}?${params}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MedEvidence/1.0 (https://med-evi.example.com)',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`代替検索エラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const idlist = data.esearchresult?.idlist || [];
    console.log('代替検索で取得したPMID一覧:', idlist);
    
    return idlist;
  } catch (error) {
    console.error('代替検索も失敗:', error);
    return [];
  }
}

// メインの検索エンドポイント
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, maxResults = 3, previousQueries = [] } = body; // previousQueriesを追加

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: '検索クエリが必要です' },
        { status: 400 }
      );
    }

    // 前のクエリのコンテキストを考慮した検索クエリを構築
    let contextualQuery = query;
    if (previousQueries.length > 0) {
      // 最新の1-2個のクエリをコンテキストとして使用
      const recentQueries = previousQueries.slice(-2);
      contextualQuery = `${recentQueries.join(' ')} ${query}`;
      console.log(`コンテキスト付きクエリ: "${contextualQuery}"`);
    }

    // 日本語クエリを英語に翻訳（コンテキスト付き）
    console.log(`元のクエリ: "${query}"`);
    const translatedQuery = await translateQueryToEnglish(contextualQuery);
    console.log(`翻訳後クエリ: "${translatedQuery}"`);

    // PubMed検索実行（翻訳されたクエリを使用）
    console.log(`PubMed検索開始: "${translatedQuery}"`);
    let pmids: string[] = [];
    
    try {
      pmids = await searchPubMed(translatedQuery, Math.min(maxResults, 3)); // 最大3つに制限
    } catch (error) {
      console.error('通常のPubMed検索が失敗、代替検索を試行:', error);
      pmids = await searchPubMedAlternative(translatedQuery, Math.min(maxResults, 3)); // 最大3つに制限
    }
    
    if (pmids.length === 0) {
      return NextResponse.json({
        articles: [],
        summary: `「${query}」に関する検索結果が見つかりませんでした。検索キーワードを変更してお試しください。\n\n検索に使用した英語キーワード: "${translatedQuery}"\n\nネットワークエラーが発生した可能性があります。しばらく時間をおいて再度お試しください。`,
        totalResults: 0,
        searchQuery: query,
      });
    }

    // 記事詳細取得
    console.log(`${pmids.length}件の記事詳細を取得中...`);
    const articles = await fetchPubMedDetails(pmids);

    // 最も関連性の高い3つの論文のみを使用
    const selectedArticles = articles.slice(0, 3);
    console.log(`選択された論文数: ${selectedArticles.length}`);

    // OpenAI要約生成（元の日本語クエリとコンテキストを使用）
    console.log('OpenAI要約生成中...');
    const summary = await generateSummary(selectedArticles, query, previousQueries);

    const result: SearchResult = {
      articles: selectedArticles,
      summary,
      totalResults: selectedArticles.length,
      searchQuery: query,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('検索エラー:', error);
    return NextResponse.json(
      { 
        error: '検索中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
} 