import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";

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

  // Protected endpoint to verify auth is working
  me: protectedProcedure.query(({ ctx }) => {
    return {
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        image: ctx.user.image,
      },
      session: {
        id: ctx.session.id,
        expiresAt: ctx.session.expiresAt,
      },
    };
  }),
});
