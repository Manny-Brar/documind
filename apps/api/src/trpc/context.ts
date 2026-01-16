import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@documind/db";

export interface CreateContextOptions {
  req: FastifyRequest;
  res: FastifyReply;
}

export async function createContext({ req, res }: CreateContextOptions) {
  // TODO: Add session/auth lookup here
  // const session = await getSession(req);
  // const user = session ? await getUserById(session.userId) : null;

  return {
    req,
    res,
    prisma,
    // session,
    // user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
