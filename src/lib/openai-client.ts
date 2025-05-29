import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    'OPENAI_API_KEY is not set in environment variables. Please check your .env file.'
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_RETRIES = 10;
const RETRY_DELAY = 1000; // 1秒

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  let lastError: Error | null = null;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages,
        max_tokens: 1000,
      });
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${i + 1} failed:`, lastError);
      await sleep(RETRY_DELAY);
    }
  }

  throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
