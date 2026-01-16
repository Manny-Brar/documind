import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Auth middleware - requires authenticated user
const isAuthed = middleware(async ({ ctx, next }) => {
  // TODO: Implement actual auth check
  // if (!ctx.session || !ctx.user) {
  //   throw new TRPCError({ code: "UNAUTHORIZED" });
  // }
  return next({
    ctx: {
      ...ctx,
      // session: ctx.session,
      // user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Admin middleware - requires admin role
const isAdmin = middleware(async ({ ctx, next }) => {
  // TODO: Implement admin check
  // if (ctx.membership?.role !== "admin") {
  //   throw new TRPCError({ code: "FORBIDDEN" });
  // }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(isAdmin);
