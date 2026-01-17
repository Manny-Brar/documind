import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import {
  getUsageSummary,
  getDailyUsage,
  checkUsageLimits,
} from "../../lib/usage-tracker.js";
import {
  isStripeConfigured,
  createCheckoutSession as stripeCreateCheckout,
  createPortalSession as stripeCreatePortal,
} from "../../lib/stripe.js";

export const billingRouter = router({
  /**
   * Get current usage summary for an organization
   */
  getUsage: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
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

      const usage = await getUsageSummary(ctx.prisma, input.orgId);

      return {
        period: usage.period,
        usage: usage.usage,
        totalCost: usage.totalCost,
      };
    }),

  /**
   * Get daily usage breakdown
   */
  getDailyUsage: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        days: z.number().min(1).max(90).default(30),
      })
    )
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

      return getDailyUsage(ctx.prisma, input.orgId, input.days);
    }),

  /**
   * Check usage limits
   */
  checkLimits: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
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

      return checkUsageLimits(ctx.prisma, input.orgId);
    }),

  /**
   * Get subscription status
   */
  getSubscription: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify admin membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["owner", "admin"] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be an admin to view billing details",
        });
      }

      const org = await ctx.prisma.organization.findUnique({
        where: { id: input.orgId },
        select: {
          planId: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionStatus: true,
          currentPeriodEnd: true,
          storageQuotaBytes: true,
          storageUsedBytes: true,
        },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      return {
        planId: org.planId,
        status: org.subscriptionStatus ?? "active",
        currentPeriodEnd: org.currentPeriodEnd,
        hasStripeCustomer: !!org.stripeCustomerId,
        hasSubscription: !!org.stripeSubscriptionId,
        storage: {
          used: Number(org.storageUsedBytes),
          quota: Number(org.storageQuotaBytes),
          percentUsed: Math.round(
            (Number(org.storageUsedBytes) / Number(org.storageQuotaBytes)) * 100
          ),
        },
      };
    }),

  /**
   * Get available plans
   */
  getPlans: protectedProcedure.query(async () => {
    // These would typically come from Stripe or a configuration
    return [
      {
        id: "starter",
        name: "Starter",
        description: "For small teams getting started",
        price: 0,
        currency: "USD",
        interval: "month",
        features: [
          "25 GB storage",
          "100 searches/month",
          "50,000 AI tokens/month",
          "5 team members",
        ],
        limits: {
          storage: 25 * 1024 * 1024 * 1024, // 25 GB
          searches: 100,
          llmTokens: 50000,
          members: 5,
        },
      },
      {
        id: "professional",
        name: "Professional",
        description: "For growing teams with more needs",
        price: 49,
        currency: "USD",
        interval: "month",
        features: [
          "100 GB storage",
          "1,000 searches/month",
          "500,000 AI tokens/month",
          "25 team members",
          "Priority support",
        ],
        limits: {
          storage: 100 * 1024 * 1024 * 1024, // 100 GB
          searches: 1000,
          llmTokens: 500000,
          members: 25,
        },
      },
      {
        id: "enterprise",
        name: "Enterprise",
        description: "For large organizations",
        price: 199,
        currency: "USD",
        interval: "month",
        features: [
          "Unlimited storage",
          "Unlimited searches",
          "Unlimited AI tokens",
          "Unlimited team members",
          "SSO & advanced security",
          "Dedicated support",
          "Custom integrations",
        ],
        limits: {
          storage: -1, // unlimited
          searches: -1,
          llmTokens: -1,
          members: -1,
        },
      },
    ];
  }),

  /**
   * Create Stripe checkout session for plan upgrade
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        planId: z.string(),
        billingInterval: z.enum(["month", "year"]).default("month"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["owner", "admin"] },
        },
        include: {
          org: {
            select: { name: true },
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be an admin to manage billing",
        });
      }

      // Check if Stripe is configured
      if (!isStripeConfigured()) {
        return {
          success: false,
          message: "Stripe integration not yet configured. Please set STRIPE_SECRET_KEY.",
          checkoutUrl: null,
        };
      }

      try {
        const result = await stripeCreateCheckout(
          ctx.prisma,
          input.orgId,
          input.planId,
          ctx.user.email,
          membership.org.name,
          input.billingInterval
        );

        return {
          success: true,
          message: null,
          checkoutUrl: result.url,
        };
      } catch (error) {
        console.error("Stripe checkout error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create checkout session",
        });
      }
    }),

  /**
   * Create Stripe portal session for subscription management
   */
  createPortalSession: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["owner", "admin"] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be an admin to manage billing",
        });
      }

      // Check if Stripe is configured
      if (!isStripeConfigured()) {
        return {
          success: false,
          message: "Stripe integration not yet configured.",
          portalUrl: null,
        };
      }

      const org = await ctx.prisma.organization.findUnique({
        where: { id: input.orgId },
        select: { stripeCustomerId: true },
      });

      if (!org?.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe customer found. Please upgrade to a paid plan first.",
        });
      }

      try {
        const result = await stripeCreatePortal(org.stripeCustomerId);

        return {
          success: true,
          message: null,
          portalUrl: result.url,
        };
      } catch (error) {
        console.error("Stripe portal error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create portal session",
        });
      }
    }),
});
