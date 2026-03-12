import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  API_PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
