/**
 * Stripe Integration
 *
 * Handles Stripe checkout, portal sessions, and webhooks for billing.
 */

import Stripe from "stripe";
import type { PrismaClient } from "@documind/db";

// Initialize Stripe client lazily
let stripeClient: Stripe | null = null;

/**
 * Get Stripe client instance
 * Throws if STRIPE_SECRET_KEY is not configured
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeClient;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Plan configuration with Stripe Price IDs
 */
export interface PlanConfig {
  id: string;
  name: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  limits: {
    storage: number; // bytes, -1 for unlimited
    searches: number; // per month, -1 for unlimited
    llmTokens: number; // per month, -1 for unlimited
    members: number; // max members, -1 for unlimited
  };
}

/**
 * Get plan configuration from environment
 */
export function getPlansConfig(): PlanConfig[] {
  return [
    {
      id: "starter",
      name: "Starter",
      // Free plan - no Stripe price
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
      stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
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
      stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
      stripePriceIdYearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
      limits: {
        storage: -1, // unlimited
        searches: -1,
        llmTokens: -1,
        members: -1,
      },
    },
  ];
}

/**
 * Get or create Stripe customer for an organization
 */
export async function getOrCreateCustomer(
  prisma: PrismaClient,
  orgId: string,
  email: string,
  name: string
): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  });

  if (org?.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      orgId,
    },
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a checkout session for plan upgrade
 */
export async function createCheckoutSession(
  prisma: PrismaClient,
  orgId: string,
  planId: string,
  email: string,
  orgName: string,
  billingInterval: "month" | "year" = "month"
): Promise<{ url: string }> {
  const stripe = getStripe();
  const plans = getPlansConfig();
  const plan = plans.find((p) => p.id === planId);

  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const priceId =
    billingInterval === "year"
      ? plan.stripePriceIdYearly
      : plan.stripePriceIdMonthly;

  if (!priceId) {
    throw new Error(`No Stripe price configured for plan: ${planId}`);
  }

  // Get or create customer
  const customerId = await getOrCreateCustomer(prisma, orgId, email, orgName);

  // Determine URLs
  const webUrl = process.env.WEB_URL || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:5173";
  const successUrl = `${webUrl}/settings?billing=success`;
  const cancelUrl = `${webUrl}/settings?billing=cancelled`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        orgId,
        planId,
      },
    },
    metadata: {
      orgId,
      planId,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return { url: session.url };
}

/**
 * Create a billing portal session for subscription management
 */
export async function createPortalSession(
  customerId: string
): Promise<{ url: string }> {
  const stripe = getStripe();

  const webUrl = process.env.WEB_URL || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:5173";
  const returnUrl = `${webUrl}/settings`;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

/**
 * Handle Stripe webhook event
 */
export async function handleWebhookEvent(
  prisma: PrismaClient,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(prisma, session);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(prisma, subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(prisma, subscription);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(prisma, invoice);
      break;
    }

    default:
      // Ignore unhandled event types
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(
  prisma: PrismaClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const orgId = session.metadata?.orgId;
  const planId = session.metadata?.planId;

  if (!orgId || !planId) {
    console.error("Missing orgId or planId in checkout session metadata");
    return;
  }

  // Get plan limits
  const plans = getPlansConfig();
  const plan = plans.find((p) => p.id === planId);

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      planId,
      stripeSubscriptionId: session.subscription as string,
      subscriptionStatus: "active",
      // Update storage quota based on plan
      storageQuotaBytes:
        plan?.limits.storage && plan.limits.storage > 0
          ? BigInt(plan.limits.storage)
          : BigInt(1024 * 1024 * 1024 * 1024), // 1TB for unlimited
    },
  });
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(
  prisma: PrismaClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const orgId = subscription.metadata?.orgId;

  // Extract period end from items if available, otherwise use start_date + billing cycle
  // Note: Stripe SDK v20+ changed the subscription structure
  const periodEndTimestamp = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const periodEnd = periodEndTimestamp
    ? new Date(periodEndTimestamp * 1000)
    : null;

  if (!orgId) {
    // Try to find org by subscription ID
    const org = await prisma.organization.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!org) {
      console.error("Could not find organization for subscription:", subscription.id);
      return;
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: subscription.status,
        ...(periodEnd && { currentPeriodEnd: periodEnd }),
      },
    });
    return;
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      ...(periodEnd && { currentPeriodEnd: periodEnd }),
    },
  });
}

/**
 * Handle subscription deletion (cancellation)
 */
async function handleSubscriptionDeleted(
  prisma: PrismaClient,
  subscription: Stripe.Subscription
): Promise<void> {
  // Find org by subscription ID
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!org) {
    console.error("Could not find organization for deleted subscription:", subscription.id);
    return;
  }

  // Downgrade to starter plan
  const starterPlan = getPlansConfig().find((p) => p.id === "starter");

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      planId: "starter",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      // Reset to starter limits
      storageQuotaBytes: starterPlan
        ? BigInt(starterPlan.limits.storage)
        : BigInt(25 * 1024 * 1024 * 1024),
    },
  });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  prisma: PrismaClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;

  // Find org by customer ID
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!org) {
    console.error("Could not find organization for failed payment:", customerId);
    return;
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: "past_due",
    },
  });

  // TODO: Send payment failed email notification
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
