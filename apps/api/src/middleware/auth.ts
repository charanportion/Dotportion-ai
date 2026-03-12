import { FastifyRequest, FastifyReply } from "fastify";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { prisma } from "@repo/db";
import { env } from "../env";

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

/**
 * Verifies Clerk JWT and attaches userId + dbUserId to request
 * Creates DB user on first login
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Missing authorization header" },
      });
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });

    if (!payload?.sub) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Invalid token" },
      });
    }

    const clerkId = payload.sub;

    // Get or create user in DB
    let user = await prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
      const clerkUser = await clerk.users.getUser(clerkId);
      user = await prisma.user.create({
        data: {
          clerkId,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
          name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
        },
      });
    }

    // Attach to request
    (request as any).userId = user.id;
    (request as any).clerkId = clerkId;
  } catch {
    return reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
    });
  }
}
