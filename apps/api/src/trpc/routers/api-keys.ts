import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { router, protectedProcedure } from "../trpc.js";

/**
 * Generates a secure API key
 * Format: dm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 random chars)
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = randomBytes(24).toString("base64url");
  const key = `dm_live_${randomPart}`;
  const prefix = key.substring(0, 12);
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

export const apiKeysRouter = router({
  /**
   * List all API keys for an organization
   */
  list: protectedProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      const apiKeys = await ctx.prisma.apiKey.findMany({
        where: {
          orgId: input.orgId,
          revokedAt: null,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes,
        lastUsedAt: key.lastUsedAt,
        usageCount: Number(key.usageCount),
        expiresAt: key.expiresAt,
        createdBy: key.createdBy,
        createdAt: key.createdAt,
      }));
    }),

  /**
   * Create a new API key (admin/member only)
   */
  create: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        name: z.string().min(1).max(100),
        scopes: z.array(z.enum(["read", "write", "search"])).default(["read"]),
        expiresInDays: z.number().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin or member membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          role: { in: ["admin", "member"] },
          status: "active",
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins and members can create API keys",
        });
      }

      // Generate the key
      const { key, prefix, hash } = generateApiKey();

      // Calculate expiry
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Create the key
      const apiKey = await ctx.prisma.apiKey.create({
        data: {
          orgId: input.orgId,
          createdById: ctx.user.id,
          name: input.name,
          keyHash: hash,
          keyPrefix: prefix,
          scopes: input.scopes,
          expiresAt,
        },
      });

      // Return the full key only on creation
      return {
        id: apiKey.id,
        name: apiKey.name,
        key, // Only returned once!
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      };
    }),

  /**
   * Revoke an API key (admin only)
   */
  revoke: protectedProcedure
    .input(z.object({ keyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find the key
      const apiKey = await ctx.prisma.apiKey.findUnique({
        where: { id: input.keyId },
      });

      if (!apiKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      // Verify admin membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: apiKey.orgId,
          role: "admin",
          status: "active",
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can revoke API keys",
        });
      }

      // Revoke the key
      await ctx.prisma.apiKey.update({
        where: { id: input.keyId },
        data: {
          revokedAt: new Date(),
          revokedById: ctx.user.id,
        },
      });

      return { success: true };
    }),

  /**
   * Verify an API key (for internal use)
   * Returns the organization and scopes if valid
   */
  verify: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      // Hash the key
      const hash = createHash("sha256").update(input.key).digest("hex");

      // Find the key
      const apiKey = await ctx.prisma.apiKey.findUnique({
        where: { keyHash: hash },
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

      if (!apiKey) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid API key",
        });
      }

      // Check if revoked
      if (apiKey.revokedAt) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "API key has been revoked",
        });
      }

      // Check if expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "API key has expired",
        });
      }

      // Update last used
      await ctx.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      });

      return {
        valid: true,
        organization: apiKey.org,
        scopes: apiKey.scopes,
      };
    }),
});
