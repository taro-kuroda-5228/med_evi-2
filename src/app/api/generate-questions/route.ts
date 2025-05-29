import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI APIの設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { summary, currentQuery, previousQuery } = body;

    if (!summary || !previousQuery) {
      return NextResponse.json(
        { error: '要約と前のクエリが必要です' },
        { status: 400 }
      );
    }

    const prompt = `以下は医学的な検索結果の要約です。この要約の内容から、医師が次に質問したくなるような関連質問を3つ生成してください。

前の質問: "${previousQuery}"
要約内容:
${summary}

要件:
1. 要約の内容に直接関連する具体的な質問を生成
2. 医師が実際に知りたいと思う実用的な質問
3. 前の質問で既に答えられている内容は避ける
4. 簡潔で明確な質問文
5. 要約で言及されている具体的な薬剤名、疾患名、治療法等を活用

例:
- 要約でGLP-1作動薬の減量効果が説明されている場合
  → "GLP-1作動薬の副作用は？"
  → "新薬の開発状況は？"
  → "投与量の調整基準は？"

- 要約で肺がんの治療が説明されている場合
  → "免疫療法の適応基準は？"
  → "手術と薬物療法の選択基準は？"
  → "予後因子は？"

JSON形式で回答してください:
{
  "questions": ["質問1", "質問2", "質問3"]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは医学専門家です。医学的な要約から、医師が次に質問したくなるような関連質問を生成してください。質問は具体的で実用的であり、要約の内容に直接関連している必要があります。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      try {
        // JSONレスポンスをパース
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
            return NextResponse.json({
              questions: parsedResponse.questions.slice(0, 3) // 最大3つまで
            });
          }
        }
        
        // JSONパースに失敗した場合、テキストから質問を抽出
        const lines = responseText.split('\n').filter(line => 
          line.trim().startsWith('-') || 
          line.trim().startsWith('•') || 
          line.includes('？') || 
          line.includes('?')
        );
        
        const extractedQuestions = lines
          .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
          .filter(line => line.length > 0 && (line.includes('？') || line.includes('?')))
          .slice(0, 3);

        if (extractedQuestions.length > 0) {
          return NextResponse.json({
            questions: extractedQuestions
          });
        }

      } catch (parseError) {
        console.error('JSON解析エラー:', parseError);
      }

      // フォールバック：デフォルト質問
      return NextResponse.json({
        questions: [
          '副作用や注意点は？',
          '他の治療法との比較は？',
          '最新の研究結果は？'
        ]
      });

    } catch (openaiError) {
      console.error('OpenAI API エラー:', openaiError);
      
      // OpenAI APIエラーの場合のフォールバック
      return NextResponse.json({
        questions: [
          '詳細な治療方法は？',
          '副作用について教えて',
          '最新のガイドラインは？'
        ]
      });
    }

  } catch (error) {
    console.error('関連質問生成エラー:', error);
    return NextResponse.json(
      { 
        error: '関連質問の生成中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
} 