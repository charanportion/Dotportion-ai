import { Octokit } from "@octokit/rest";
import type { GitHubCredentials, RawGitHubFile } from "../types";

const INDEXABLE_EXTENSIONS = /\.(ts|tsx|js|jsx)$/;

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next\//,
  /\/dist\//,
  /\/build\//,
  /\/coverage\//,
  /\/\.turbo\//,
  /\/out\//,
  /\/\.git\//,
];

const MAX_FILES = 100;
const MAX_FILE_SIZE_BYTES = 50_000;

export async function fetchGitHubFiles(
  credentials: GitHubCredentials
): Promise<RawGitHubFile[]> {
  const octokit = new Octokit({ auth: credentials.accessToken });
  const branch = credentials.branch ?? "main";

  const { data: tree } = await octokit.git.getTree({
    owner: credentials.repoOwner,
    repo: credentials.repoName,
    tree_sha: branch,
    recursive: "1",
  });

  const relevantFiles = (tree.tree ?? [])
    .filter(
      (item) =>
        item.type === "blob" &&
        item.path &&
        INDEXABLE_EXTENSIONS.test(item.path) &&
        !EXCLUDE_PATTERNS.some((p) => p.test(item.path!)) &&
        (item.size ?? 0) < MAX_FILE_SIZE_BYTES
    )
    .slice(0, MAX_FILES);

  const results: RawGitHubFile[] = [];
  const BATCH = 10;

  for (let i = 0; i < relevantFiles.length; i += BATCH) {
    const batch = relevantFiles.slice(i, i + BATCH);
    const contents = await Promise.all(
      batch.map(async (file) => {
        try {
          const { data } = await octokit.repos.getContent({
            owner: credentials.repoOwner,
            repo: credentials.repoName,
            path: file.path!,
            ref: branch,
          });
          if ("content" in data && data.encoding === "base64") {
            return {
              path: file.path!,
              content: Buffer.from(data.content, "base64").toString("utf-8"),
              sha: data.sha,
            };
          }
          return null;
        } catch {
          return null;
        }
      })
    );
    results.push(...contents.filter((c): c is RawGitHubFile => c !== null));
  }

  return results;
}
