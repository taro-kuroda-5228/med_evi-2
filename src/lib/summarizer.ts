import { getChatCompletion } from './openai-client';
import OpenAI from 'openai';

export interface Paper {
  title: string;
  authors: string[];
  journal: string;
  year: string;
  abstract: string;
  pmid?: string;
  doi?: string;
  keywords: string[];
}

const SUMMARY_PROMPT = (papers: Paper[]) => `
以下の医学論文の主要な発見を箇条書きで端的に要約してください。

論文情報:
${papers
  .map(
    (paper, index) => `
論文${index + 1}:
- タイトル: ${paper.title}
- 著者: ${paper.authors.join(', ')}
- ジャーナル: ${paper.journal}
- 出版年: ${paper.year}
- 要約: ${paper.abstract}
- PMID: ${paper.pmid || 'N/A'}
- DOI: ${paper.doi || 'N/A'}
- キーワード: ${paper.keywords.join(', ')}
`
  )
  .join('\n')}

要約の形式:
- 論文の主要な発見を3-5点の箇条書きで端的に説明してください。
- 各項目は1-2文程度の簡潔な表現を使用してください。
- 医療用語は標準的な表現に統一してください。
- 背景や目的は含めず、発見や結論に焦点を当ててください。
- 数値や統計情報がある場合は、具体的に記載してください。
`;

export async function generateSummary(papers: Paper[]): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        'あなたは医学論文の要約の専門家です。論文の主要な発見を箇条書きで端的に要約し、具体的な数値や統計情報を含めてください。',
    },
    { role: 'user', content: SUMMARY_PROMPT(papers) },
  ];
  return getChatCompletion(messages);
}
