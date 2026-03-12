import { callClaudeJSON, generateEmbedding } from "@repo/ai";
import type { RawGitHubFile } from "../types";

export interface NormalizedCodeModule {
  moduleName: string;
  filePath: string;
  moduleType: "service" | "route" | "component" | "util" | "other";
  description: string;
  rawContent: string;
  embedding: number[];
}

function buildSummarizePrompt(filePath: string, content: string): string {
  return `Analyze this source code file and return a JSON summary.

File: ${filePath}
Content:
\`\`\`
${content.slice(0, 3000)}
\`\`\`

Return JSON (no markdown):
{
  "moduleName": "PascalCase name of the main export/class/component",
  "moduleType": "service|route|component|util|other",
  "description": "1-2 sentences describing what this module does and its role in the system"
}`;
}

async function normalizeGitHubFile(
  file: RawGitHubFile,
  errors: string[]
): Promise<NormalizedCodeModule | null> {
  try {
    const result = await callClaudeJSON<{
      moduleName: string;
      moduleType: NormalizedCodeModule["moduleType"];
      description: string;
    }>(buildSummarizePrompt(file.path, file.content));

    const embeddingText = `${result.moduleName} ${file.path} ${result.description}`;
    const embedding = await generateEmbedding(embeddingText);

    return {
      moduleName: result.moduleName,
      filePath: file.path,
      moduleType: result.moduleType,
      description: result.description,
      rawContent: file.content.slice(0, 2000),
      embedding,
    };
  } catch (err) {
    errors.push(
      `Failed to normalize ${file.path}: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

export async function normalizeGitHubFiles(
  files: RawGitHubFile[],
  errors: string[],
  concurrency = 5
): Promise<NormalizedCodeModule[]> {
  const results: NormalizedCodeModule[] = [];
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const normalized = await Promise.all(
      batch.map((f) => normalizeGitHubFile(f, errors))
    );
    results.push(
      ...normalized.filter((n): n is NormalizedCodeModule => n !== null)
    );
  }
  return results;
}
