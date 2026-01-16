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
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in to access this resource" });
  }

  // Narrow the context type to guarantee session and user are present
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Admin middleware - requires admin role in organization
// Note: This will be expanded when organization context is added
const isAdmin = middleware(async ({ ctx, next }) => {
  // For now, just pass through - admin checks will require org context
  // TODO: Add organization membership check when org context is implemented
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(isAdmin);
