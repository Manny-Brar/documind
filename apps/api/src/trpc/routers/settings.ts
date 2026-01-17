import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@documind/db";
import { router, protectedProcedure, verifyMembership, verifyAdmin } from "../trpc.js";

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
      // Verify admin membership using helper
      await verifyAdmin(ctx.prisma, ctx.user.id, input.orgId);

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
      // Verify membership using helper (any role can view members)
      await verifyMembership(ctx.prisma, ctx.user.id, input.orgId);

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
      // Verify admin membership using helper
      await verifyAdmin(ctx.prisma, ctx.user.id, input.orgId);

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

  /**
   * Accept an invitation to join an organization
   * Can be called by authenticated or unauthenticated users
   */
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find the invitation by token
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          invitationToken: input.token,
          status: "pending",
        },
        include: {
          org: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or already used",
        });
      }

      // Check if invitation has expired
      if (membership.invitationExpires && membership.invitationExpires < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired. Please ask for a new invitation.",
        });
      }

      // Verify the current user matches the invited user
      // or if the invited user was a placeholder, update to current user
      if (membership.userId !== ctx.user.id) {
        // Check if invited user email matches current user email
        if (membership.user.email !== ctx.user.email) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This invitation was sent to a different email address",
          });
        }
        // Same email, different user ID means placeholder was created
        // Update the membership to use the actual logged-in user
        await ctx.prisma.membership.update({
          where: { id: membership.id },
          data: { userId: ctx.user.id },
        });
      }

      // Activate the membership
      const activatedMembership = await ctx.prisma.membership.update({
        where: { id: membership.id },
        data: {
          status: "active",
          joinedAt: new Date(),
          invitationToken: null, // Clear the token
          invitationExpires: null,
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
      });

      return {
        success: true,
        organization: activatedMembership.org,
        role: activatedMembership.role,
      };
    }),

  /**
   * Get invitation details by token (public - for showing org name before accepting)
   */
  getInvitation: protectedProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          invitationToken: input.token,
          status: "pending",
        },
        include: {
          org: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          invitedBy: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!membership) {
        return { valid: false, expired: false, organization: null, invitedBy: null, role: null };
      }

      const expired = membership.invitationExpires
        ? membership.invitationExpires < new Date()
        : false;

      return {
        valid: !expired,
        expired,
        organization: membership.org,
        invitedBy: membership.invitedBy?.name || "A team member",
        role: membership.role,
      };
    }),
});
