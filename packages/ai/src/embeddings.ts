import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_MODEL = "models/gemini-embedding-001" as const;
export const EMBEDDING_DIMENSIONS = 768 as const;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is required");
  return new GoogleGenAI({ apiKey });
}

/**
 * Generate a single embedding vector using the Gemini SDK.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text.slice(0, 8192),
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("No embedding returned from Gemini API");
  return values;
}

/**
 * Generate embeddings in batches with concurrency.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const CONCURRENCY = 10;
  const results: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const batch = texts.slice(i, i + CONCURRENCY);
    const embeddings = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    for (let j = 0; j < embeddings.length; j++) {
      results[i + j] = embeddings[j]!;
    }
  }

  return results;
}
