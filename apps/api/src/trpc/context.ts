import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma, type PrismaClient } from "@documind/db";

export interface CreateContextOptions {
  req: FastifyRequest;
  res: FastifyReply;
}

// Context type exposed to tRPC procedures (client-safe)
export interface Context {
  prisma: PrismaClient;
  session: null; // TODO: Add session type when auth is integrated
  user: null; // TODO: Add user type when auth is integrated
}

export async function createContext({ req, res }: CreateContextOptions): Promise<Context> {
  // TODO: Add session/auth lookup here
  // const session = await getSession(req);
  // const user = session ? await getUserById(session.userId) : null;

  return {
    prisma,
    session: null,
    user: null,
  };
}
