import OpenAI from 'openai';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ESM環境で__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルのパスを明示的に指定
config({ path: resolve(__dirname, '../../.env') });

// 環境変数の確認
console.log('OPENAI_API_KEY in query-translator:', process.env.OPENAI_API_KEY);

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    'OPENAI_API_KEY is not set in environment variables. Please check your .env file.'
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TRANSLATE_PROMPT = (query: string) => `
以下の日本語の医学論文検索クエリを英語に翻訳してください。
翻訳はPubMed検索に適した形式で、以下のルールに従ってください：

1. 自然な英語の質問文ではなく、検索キーワードの組み合わせに変換してください
2. 医学用語は標準的な英語表現を使用してください
3. 不要な冠詞（a, an, the）や前置詞（in, of, at）は含めないでください
4. 検索に重要なキーワードのみを含めてください

日本語クエリ: ${query}

英語翻訳のみを返してください。説明や追加のテキストは不要です。
`;

export async function translateQuery(query: string): Promise<string> {
  console.log('翻訳開始:', query);
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content:
            'あなたは医学論文検索のための翻訳の専門家です。PubMed検索に適した形式で翻訳してください。',
        },
        { role: 'user', content: TRANSLATE_PROMPT(query) },
      ],
      max_tokens: 100,
    });
    const translatedQuery = response.choices[0]?.message?.content?.trim() || '';
    console.log('翻訳結果:', translatedQuery);
    return translatedQuery;
  } catch (error) {
    console.error('翻訳エラー:', error);
    throw error;
  }
}
