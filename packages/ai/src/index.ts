// AI Clients (Gemini-backed)
export { callClaude, callClaudeJSON, CLAUDE_MODEL } from "./claude";
export {
  generateEmbedding,
  generateEmbeddings,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from "./openai";

// Prompts
export {
  SIGNAL_EXTRACTOR_SYSTEM_PROMPT,
  SIGNAL_EXTRACTOR_PROMPT_V1,
  CLUSTER_NAMER_PROMPT_V1,
} from "./prompts/signal-extractor.v1";

export {
  PROBLEM_DETECTOR_SYSTEM_PROMPT,
  PROBLEM_DETECTOR_PROMPT_V1,
} from "./prompts/problem-detector.v1";

export {
  FEATURE_GENERATOR_SYSTEM_PROMPT,
  FEATURE_GENERATOR_PROMPT_V1,
} from "./prompts/feature-generator.v1";

export {
  IMPACT_ESTIMATOR_SYSTEM_PROMPT,
  IMPACT_ESTIMATOR_PROMPT_V1,
} from "./prompts/impact-estimator.v1";

export {
  PRD_GENERATOR_SYSTEM_PROMPT,
  PRD_GENERATOR_PROMPT_V1,
  extractTasksFromPRD,
} from "./prompts/prd-generator.v1";

export {
  CHAT_AGENT_SYSTEM_PROMPT,
  CHAT_TOOL_DESCRIPTIONS,
} from "./prompts/chat-agent.v1";
