import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

export const CLAUDE_MODEL = "gemini-2.5-flash" as const;

export async function callClaude(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const response = await getClient().models.generateContent({
    model: CLAUDE_MODEL,
    contents: prompt,
    config: {
      ...(options?.systemPrompt && { systemInstruction: options.systemPrompt }),
      maxOutputTokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    },
  });
  return response.text ?? "";
}

export async function callClaudeJSON<T>(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
  }
): Promise<T> {
  const response = await getClient().models.generateContent({
    model: CLAUDE_MODEL,
    contents: prompt,
    config: {
      ...(options?.systemPrompt && { systemInstruction: options.systemPrompt }),
      maxOutputTokens: options?.maxTokens ?? 4096,
      temperature: 0.3,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text ?? "";

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse Gemini JSON response: ${text}`);
  }
}
