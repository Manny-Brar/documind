import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@documind/db";
import { router, protectedProcedure } from "../trpc.js";

export const settingsRouter = router({
  /**
   * Get organization settings
   */
  getOrganization: protectedProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
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
              stripeCustomerId: true,
              stripeSubscriptionId: true,
              subscriptionStatus: true,
              currentPeriodEnd: true,
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
      };
    }),

  /**
   * Update organization settings (admin only)
   */
  updateOrganization: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        name: z.string().min(2).max(100).optional(),
        settings: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
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
        where: { id: input.orgId },
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

  /**
   * Get team members
   */
  getMembers: protectedProcedure
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

      const members = await ctx.prisma.membership.findMany({
        where: {
          orgId: input.orgId,
          status: { in: ["active", "pending"] },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return members.map((m) => ({
        id: m.id,
        user: m.user,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        invitedBy: m.invitedBy,
        createdAt: m.createdAt,
      }));
    }),

  /**
   * Invite a team member (admin only)
   */
  inviteMember: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(["admin", "member", "viewer"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          role: "admin",
          status: "active",
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can invite members",
        });
      }

      // Check if user exists
      let user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      // If user doesn't exist, create a placeholder
      if (!user) {
        const emailName = input.email.split("@")[0] ?? "User";
        user = await ctx.prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            email: input.email,
            name: emailName,
            emailVerified: false,
          },
        });
      }

      // Check if already a member
      const existingMembership = await ctx.prisma.membership.findFirst({
        where: {
          userId: user.id,
          orgId: input.orgId,
        },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this organization",
        });
      }

      // Generate invitation token
      const invitationToken = crypto.randomUUID();
      const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create pending membership
      const newMembership = await ctx.prisma.membership.create({
        data: {
          userId: user.id,
          orgId: input.orgId,
          role: input.role,
          status: "pending",
          invitedById: ctx.user.id,
          invitationToken,
          invitationExpires,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // TODO: Send invitation email

      return {
        id: newMembership.id,
        user: newMembership.user,
        role: newMembership.role,
        status: newMembership.status,
        invitationToken,
      };
    }),

  /**
   * Update member role (admin only)
   */
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        membershipId: z.string().uuid(),
        role: z.enum(["admin", "member", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the membership to update
      const targetMembership = await ctx.prisma.membership.findUnique({
        where: { id: input.membershipId },
      });

      if (!targetMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      // Verify admin membership
      const adminMembership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: targetMembership.orgId,
          role: "admin",
          status: "active",
        },
      });

      if (!adminMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update member roles",
        });
      }

      // Can't change own role
      if (targetMembership.userId === ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot change your own role",
        });
      }

      const updated = await ctx.prisma.membership.update({
        where: { id: input.membershipId },
        data: { role: input.role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        id: updated.id,
        user: updated.user,
        role: updated.role,
      };
    }),

  /**
   * Remove member (admin only)
   */
  removeMember: protectedProcedure
    .input(z.object({ membershipId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find the membership to remove
      const targetMembership = await ctx.prisma.membership.findUnique({
        where: { id: input.membershipId },
      });

      if (!targetMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      // Verify admin membership
      const adminMembership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: targetMembership.orgId,
          role: "admin",
          status: "active",
        },
      });

      if (!adminMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can remove members",
        });
      }

      // Can't remove self
      if (targetMembership.userId === ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot remove yourself from the organization",
        });
      }

      await ctx.prisma.membership.update({
        where: { id: input.membershipId },
        data: { status: "removed" },
      });

      return { success: true };
    }),

  /**
   * Get billing info
   */
  getBilling: protectedProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
        },
        include: {
          org: {
            select: {
              planId: true,
              stripeCustomerId: true,
              stripeSubscriptionId: true,
              subscriptionStatus: true,
              currentPeriodEnd: true,
              storageQuotaBytes: true,
              storageUsedBytes: true,
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

      // Plan details
      const plans: Record<string, { name: string; price: number; storage: number; features: string[] }> = {
        starter: {
          name: "Starter",
          price: 0,
          storage: 25,
          features: ["25 GB storage", "100 documents", "Basic search"],
        },
        pro: {
          name: "Pro",
          price: 29,
          storage: 100,
          features: ["100 GB storage", "Unlimited documents", "AI answers", "Priority support"],
        },
        business: {
          name: "Business",
          price: 99,
          storage: 500,
          features: ["500 GB storage", "Unlimited documents", "AI answers", "Team features", "API access"],
        },
      };

      const org = membership.org;
      const currentPlan = plans[org.planId] || plans.starter;

      return {
        plan: {
          id: org.planId,
          ...currentPlan,
        },
        subscription: {
          status: org.subscriptionStatus,
          currentPeriodEnd: org.currentPeriodEnd,
        },
        usage: {
          storageUsedBytes: Number(org.storageUsedBytes),
          storageQuotaBytes: Number(org.storageQuotaBytes),
          storagePercentage: Math.round(
            (Number(org.storageUsedBytes) / Number(org.storageQuotaBytes)) * 100
          ),
        },
        availablePlans: Object.entries(plans).map(([id, plan]) => ({
          id,
          ...plan,
          isCurrent: id === org.planId,
        })),
      };
    }),
});
