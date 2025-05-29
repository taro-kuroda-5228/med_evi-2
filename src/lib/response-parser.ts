import { z } from 'zod';

// 論文情報のスキーマ定義
const PaperSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  journal: z.string(),
  year: z.string(),
  abstract: z.string(),
  pmid: z.string().optional(),
  doi: z.string().optional(),
  keywords: z.array(z.string()),
});

export type Paper = z.infer<typeof PaperSchema>;

export function parseResponse(response: string): Paper {
  try {
    const json = JSON.parse(response);
    return PaperSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid paper data: ${error.message}`);
    }
    throw new Error(
      `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
