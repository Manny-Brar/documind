import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";

export const healthRouter = router({
  check: publicProcedure.query(async () => {
    return {
      status: "healthy",
      timestamp: new Date(),
      version: process.env.npm_package_version || "0.0.0",
    };
  }),

  ping: publicProcedure.input(z.object({ message: z.string() })).query(({ input }) => {
    return {
      pong: input.message,
      receivedAt: new Date(),
    };
  }),
});
