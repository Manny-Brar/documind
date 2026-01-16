import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { fastifyTRPCPlugin as baseFastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { AnyRouter } from "@trpc/server";

interface FastifyTRPCPluginOptions<TRouter extends AnyRouter> {
  prefix?: string;
  trpcOptions: {
    router: TRouter;
    createContext: (opts: { req: FastifyRequest; res: FastifyReply }) => Promise<unknown>;
  };
}

export const fastifyTRPCPlugin: FastifyPluginCallback<FastifyTRPCPluginOptions<AnyRouter>> = (
  fastify,
  opts,
  done
) => {
  fastify.register(baseFastifyTRPCPlugin, {
    prefix: opts.prefix,
    trpcOptions: opts.trpcOptions,
  });
  done();
};
