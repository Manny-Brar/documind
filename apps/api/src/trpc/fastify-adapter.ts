import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { fastifyTRPCPlugin as baseFastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { AnyRouter } from "@trpc/server";

interface FastifyTRPCPluginOptions<TRouter extends AnyRouter> {
  prefix?: string;
  trpcOptions: {
    router: TRouter;
    createContext: (opts: { req: FastifyRequest; res: FastifyReply }) => Promise<unknown>;
  };
}

export const fastifyTRPCPlugin: FastifyPluginAsync<FastifyTRPCPluginOptions<AnyRouter>> = async (
  fastify,
  opts
) => {
  await fastify.register(baseFastifyTRPCPlugin, {
    prefix: opts.prefix,
    trpcOptions: opts.trpcOptions,
  });
};
