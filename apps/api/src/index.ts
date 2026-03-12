import { config } from "dotenv";
import { resolve } from "path";
// Load root .env first, then app-level .env (app-level overrides root)
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../.env") });
import { buildServer } from "./server";
import { env } from "./env";
import { prisma } from "@repo/db";

async function main() {
  const app = buildServer();

  try {
    // Test DB connection
    await prisma.$connect();
    app.log.info("Database connected");

    await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
    app.log.info(`API server running on port ${env.API_PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

main();
