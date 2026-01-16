import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma, type PrismaClient } from "@documind/db";
import { auth } from "../auth.js";

export interface CreateContextOptions {
  req: FastifyRequest;
  res: FastifyReply;
}

// Session type from Better Auth
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// User type from Better Auth
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Context type exposed to tRPC procedures
export interface Context {
  prisma: PrismaClient;
  session: Session | null;
  user: User | null;
  req: FastifyRequest;
  res: FastifyReply;
}

/**
 * Converts Fastify request headers to a standard Headers object
 * Required for Better Auth's API which expects Fetch API compatible headers
 */
function toHeaders(requestHeaders: FastifyRequest["headers"]): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(requestHeaders)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }
  return headers;
}

/**
 * Creates the tRPC context for each request
 * Extracts session from Better Auth cookies and makes it available to procedures
 */
export async function createContext({ req, res }: CreateContextOptions): Promise<Context> {
  // Convert Fastify headers to standard Headers object for Better Auth
  const headers = toHeaders(req.headers);

  // Get session from Better Auth
  let session: Session | null = null;
  let user: User | null = null;

  try {
    const authSession = await auth.api.getSession({ headers });
    if (authSession) {
      session = {
        id: authSession.session.id,
        userId: authSession.session.userId,
        expiresAt: authSession.session.expiresAt,
        ipAddress: authSession.session.ipAddress,
        userAgent: authSession.session.userAgent,
      };
      user = {
        id: authSession.user.id,
        email: authSession.user.email,
        name: authSession.user.name,
        image: authSession.user.image,
        emailVerified: authSession.user.emailVerified,
        createdAt: authSession.user.createdAt,
        updatedAt: authSession.user.updatedAt,
      };
    }
  } catch {
    // Session not found or invalid - user is not authenticated
    // This is expected for public routes, so we don't log an error
  }

  return {
    prisma,
    session,
    user,
    req,
    res,
  };
}
