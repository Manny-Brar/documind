import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@documind/db";
import { router, protectedProcedure } from "../trpc.js";

/**
 * Generates a URL-safe slug from a string
 * Converts to lowercase, replaces spaces with hyphens, removes special characters
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Ensures slug uniqueness by appending a random suffix if needed
 */
async function ensureUniqueSlug(
  prisma: typeof import("@documind/db").prisma,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    // Add random suffix
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${baseSlug}-${suffix}`;
    attempts++;
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to generate unique slug",
  });
}

export const organizationsRouter = router({
  /**
   * Create a new organization
   * The creating user becomes the admin
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const baseSlug = input.slug || generateSlug(input.name);
      const slug = await ensureUniqueSlug(ctx.prisma, baseSlug);

      // Create organization and membership in a transaction
      const org = await ctx.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: input.name,
            slug,
          },
        });

        // Add the creator as admin
        await tx.membership.create({
          data: {
            userId: ctx.user.id,
            orgId: organization.id,
            role: "admin",
            status: "active",
            joinedAt: new Date(),
          },
        });

        return organization;
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
      };
    }),

  /**
   * List all organizations the user is a member of
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.membership.findMany({
      where: {
        userId: ctx.user.id,
        status: "active",
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
            planId: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      planId: m.org.planId,
      role: m.role,
      joinedAt: m.joinedAt,
      createdAt: m.org.createdAt,
    }));
  }),

  /**
   * Get organization by slug (must be a member)
   */
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          status: "active",
          org: {
            slug: input.slug,
            deletedAt: null,
          },
        },
        include: {
          org: {
            select: {
              id: true,
              name: true,
              slug: true,
              planId: true,
              storageQuotaBytes: true,
              storageUsedBytes: true,
              settings: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or you don't have access",
        });
      }

      return {
        ...membership.org,
        role: membership.role,
        joinedAt: membership.joinedAt,
      };
    }),

  /**
   * Get or create a personal organization for the user
   * Called after signup/login to ensure user has at least one org
   */
  getOrCreatePersonal: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user already has an organization
    const existingMembership = await ctx.prisma.membership.findFirst({
      where: {
        userId: ctx.user.id,
        status: "active",
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (existingMembership) {
      return {
        id: existingMembership.org.id,
        name: existingMembership.org.name,
        slug: existingMembership.org.slug,
        isNew: false,
      };
    }

    // Create a personal organization
    const userName = ctx.user.name || ctx.user.email.split("@")[0];
    const baseSlug = generateSlug(`${userName}-workspace`);
    const slug = await ensureUniqueSlug(ctx.prisma, baseSlug);

    const org = await ctx.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: `${userName}'s Workspace`,
          slug,
        },
      });

      await tx.membership.create({
        data: {
          userId: ctx.user.id,
          orgId: organization.id,
          role: "admin",
          status: "active",
          joinedAt: new Date(),
        },
      });

      return organization;
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      isNew: true,
    };
  }),

  /**
   * Update organization details (admin only)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(2).max(100).optional(),
        settings: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.id,
          role: "admin",
          status: "active",
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update organization settings",
        });
      }

      const org = await ctx.prisma.organization.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.settings && { settings: input.settings as Prisma.InputJsonValue }),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          settings: true,
          updatedAt: true,
        },
      });

      return org;
    }),
});
