import { generateSummary } from '../summarizer';
import { getChatCompletion } from '../openai-client';

// OpenAI APIのモック
jest.mock('../openai-client', () => ({
  getChatCompletion: jest.fn(),
}));

describe('summarizer', () => {
  const mockPapers = [
    {
      title: 'COVID-19ワクチンの有効性に関する研究',
      authors: ['山田太郎', '鈴木花子'],
      journal: '日本医学雑誌',
      year: '2023',
      abstract:
        '本研究では、COVID-19ワクチンの有効性について調査を行った。結果として、高い予防効果が確認された。',
      pmid: '12345678',
      doi: '10.1234/example',
      keywords: ['COVID-19', 'ワクチン', '有効性'],
    },
    {
      title: 'COVID-19ワクチンの副作用に関する研究',
      authors: ['佐藤次郎', '田中三郎'],
      journal: '国際医学雑誌',
      year: '2023',
      abstract:
        '本研究では、COVID-19ワクチンの副作用について調査を行った。重篤な副作用はまれであることが確認された。',
      pmid: '87654321',
      doi: '10.5678/example',
      keywords: ['COVID-19', 'ワクチン', '副作用'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('要約が正しく生成されること', async () => {
    const mockSummary = `
1. 背景・目的
COVID-19ワクチンの有効性と安全性について調査した2つの研究を統合した。

2. 主要な発見
- ワクチンは高い予防効果を示した（山田ら、2023）
- 重篤な副作用はまれであることが確認された（佐藤ら、2023）

3. 結論・提言
COVID-19ワクチンは高い有効性と安全性を有することが示された。
    `;

    (getChatCompletion as jest.Mock).mockResolvedValue(mockSummary);

    const result = await generateSummary(mockPapers);

    expect(result).toBe(mockSummary);
    expect(getChatCompletion).toHaveBeenCalledWith([
      {
        role: 'system',
        content:
          'あなたは医学論文の要約の専門家です。論文の主要な発見を箇条書きで端的に要約し、具体的な数値や統計情報を含めてください。',
      },
      {
        role: 'user',
        content: expect.stringContaining(`
以下の医学論文の主要な発見を箇条書きで端的に要約してください。

論文情報:
`),
      },
    ]);
  });

  it('エラーが発生した場合、適切に処理されること', async () => {
    const error = new Error('API error');
    (getChatCompletion as jest.Mock).mockRejectedValue(error);

    await expect(generateSummary(mockPapers)).rejects.toThrow('API error');
  });
});
