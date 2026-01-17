import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context.js";
import type { PrismaClient } from "@documind/db";

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

// ============================================================================
// ORGANIZATION MEMBERSHIP HELPERS
// ============================================================================

export type MembershipRole = "admin" | "member" | "viewer";

export interface MembershipResult {
  id: string;
  userId: string;
  orgId: string;
  role: MembershipRole;
  status: string;
  org: {
    id: string;
    name: string;
    slug: string;
    planId: string;
  };
}

/**
 * Verify user has active membership in an organization
 * @param prisma - Prisma client instance
 * @param userId - User ID to check
 * @param orgId - Organization ID to check
 * @param requiredRole - Optional minimum role required (admin > member > viewer)
 * @returns Membership record with org details
 * @throws TRPCError if membership not found or role insufficient
 */
export async function verifyMembership(
  prisma: PrismaClient,
  userId: string,
  orgId: string,
  requiredRole?: MembershipRole
): Promise<MembershipResult> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      orgId,
      status: "active",
    },
    include: {
      org: {
        select: {
          id: true,
          name: true,
          slug: true,
          planId: true,
        },
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have access to this organization",
    });
  }

  // Check role hierarchy if required role is specified
  if (requiredRole) {
    const roleHierarchy: Record<MembershipRole, number> = {
      admin: 3,
      member: 2,
      viewer: 1,
    };

    const userRoleLevel = roleHierarchy[membership.role as MembershipRole] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires ${requiredRole} role or higher`,
      });
    }
  }

  return membership as MembershipResult;
}

/**
 * Verify user is an admin of the organization
 * Convenience wrapper around verifyMembership
 */
export async function verifyAdmin(
  prisma: PrismaClient,
  userId: string,
  orgId: string
): Promise<MembershipResult> {
  return verifyMembership(prisma, userId, orgId, "admin");
}

/**
 * Verify user is at least a member of the organization
 * Convenience wrapper around verifyMembership
 */
export async function verifyMember(
  prisma: PrismaClient,
  userId: string,
  orgId: string
): Promise<MembershipResult> {
  return verifyMembership(prisma, userId, orgId, "member");
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

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

// Admin procedure - requires authenticated user
// Note: Org-level admin checks should use verifyAdmin() helper in procedures
// This ensures the orgId is properly validated from input
const isAdmin = middleware(async ({ ctx, next }) => {
  // Admin checks require org context from procedure input
  // Use verifyAdmin(ctx.prisma, ctx.user.id, input.orgId) in your procedure
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(isAdmin);
