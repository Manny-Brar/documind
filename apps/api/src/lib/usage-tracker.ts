/**
 * Usage tracking service for billing and metering
 *
 * Tracks:
 * - Embedding token usage
 * - Search request counts
 * - LLM token usage (RAG answers)
 * - Storage bytes
 */

import type { PrismaClient } from "@documind/db";

export type UsageType = "embedding" | "search" | "llm" | "storage";

export interface UsageEvent {
  orgId: string;
  usageType: UsageType;
  quantity: number;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageSummary {
  usageType: UsageType;
  totalQuantity: number;
  totalCostMicros: bigint;
  periodStart: Date;
  periodEnd: Date;
}

export interface OrganizationUsage {
  orgId: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    embedding: { tokens: number; cost: number };
    search: { requests: number; cost: number };
    llm: { tokens: number; cost: number };
    storage: { bytes: number; cost: number };
  };
  totalCost: number;
}

// Cost rates (in microdollars per unit)
// These can be adjusted based on pricing strategy
const COST_RATES: Record<UsageType, { rate: number; unit: string }> = {
  embedding: { rate: 10, unit: "tokens" },     // $0.00001 per token
  search: { rate: 1000, unit: "requests" },    // $0.001 per search
  llm: { rate: 30, unit: "tokens" },           // $0.00003 per token
  storage: { rate: 1, unit: "bytes" },         // $0.000001 per byte (~$1/GB/month)
};

/**
 * Get current billing period dates
 */
function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

/**
 * Calculate cost in microdollars
 */
function calculateCost(usageType: UsageType, quantity: number): bigint {
  const rate = COST_RATES[usageType]?.rate ?? 0;
  return BigInt(Math.ceil(quantity * rate));
}

/**
 * Record a usage event
 */
export async function recordUsage(
  prisma: PrismaClient,
  event: UsageEvent
): Promise<void> {
  const period = getCurrentPeriod();
  const costMicros = calculateCost(event.usageType, event.quantity);
  const unitType = COST_RATES[event.usageType]?.unit ?? "units";

  try {
    await prisma.$executeRaw`
      INSERT INTO usage_records (
        id, org_id, usage_type, quantity, unit_type, cost_micros,
        resource_type, resource_id, metadata, period_start, period_end, created_at
      ) VALUES (
        gen_random_uuid(),
        ${event.orgId}::uuid,
        ${event.usageType},
        ${event.quantity},
        ${unitType},
        ${costMicros},
        ${event.resourceType ?? null},
        ${event.resourceId ?? null},
        ${JSON.stringify(event.metadata ?? {})}::jsonb,
        ${period.start}::date,
        ${period.end}::date,
        NOW()
      )
    `;
  } catch (error) {
    // Log but don't fail the main operation
    console.warn("[UsageTracker] Failed to record usage:", error);
  }
}

/**
 * Record embedding usage
 */
export async function recordEmbeddingUsage(
  prisma: PrismaClient,
  orgId: string,
  tokenCount: number,
  documentId?: string
): Promise<void> {
  await recordUsage(prisma, {
    orgId,
    usageType: "embedding",
    quantity: tokenCount,
    resourceType: documentId ? "document" : undefined,
    resourceId: documentId,
  });
}

/**
 * Record search usage
 */
export async function recordSearchUsage(
  prisma: PrismaClient,
  orgId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await recordUsage(prisma, {
    orgId,
    usageType: "search",
    quantity: 1,
    resourceType: "search",
    metadata,
  });
}

/**
 * Record LLM usage (RAG answers)
 */
export async function recordLLMUsage(
  prisma: PrismaClient,
  orgId: string,
  tokenCount: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await recordUsage(prisma, {
    orgId,
    usageType: "llm",
    quantity: tokenCount,
    resourceType: "rag",
    metadata,
  });
}

/**
 * Record storage usage
 */
export async function recordStorageUsage(
  prisma: PrismaClient,
  orgId: string,
  bytes: number,
  documentId?: string
): Promise<void> {
  await recordUsage(prisma, {
    orgId,
    usageType: "storage",
    quantity: bytes,
    resourceType: documentId ? "document" : undefined,
    resourceId: documentId,
  });
}

/**
 * Get usage summary for an organization
 */
export async function getUsageSummary(
  prisma: PrismaClient,
  orgId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<OrganizationUsage> {
  const period = periodStart && periodEnd
    ? { start: periodStart, end: periodEnd }
    : getCurrentPeriod();

  try {
    const results = await prisma.$queryRaw<
      Array<{
        usage_type: string;
        total_quantity: bigint;
        total_cost: bigint;
      }>
    >`
      SELECT
        usage_type,
        SUM(quantity) as total_quantity,
        SUM(cost_micros) as total_cost
      FROM usage_records
      WHERE org_id = ${orgId}::uuid
      AND period_start >= ${period.start}::date
      AND period_end <= ${period.end}::date
      GROUP BY usage_type
    `;

    // Initialize usage object
    const usage: OrganizationUsage["usage"] = {
      embedding: { tokens: 0, cost: 0 },
      search: { requests: 0, cost: 0 },
      llm: { tokens: 0, cost: 0 },
      storage: { bytes: 0, cost: 0 },
    };

    let totalCost = 0;

    // Populate from results
    for (const row of results) {
      const type = row.usage_type as UsageType;
      const quantity = Number(row.total_quantity);
      const cost = Number(row.total_cost) / 1_000_000; // Convert microdollars to dollars

      totalCost += cost;

      switch (type) {
        case "embedding":
          usage.embedding = { tokens: quantity, cost };
          break;
        case "search":
          usage.search = { requests: quantity, cost };
          break;
        case "llm":
          usage.llm = { tokens: quantity, cost };
          break;
        case "storage":
          usage.storage = { bytes: quantity, cost };
          break;
      }
    }

    return {
      orgId,
      period,
      usage,
      totalCost,
    };
  } catch (error) {
    // Table might not exist yet
    console.warn("[UsageTracker] Could not get usage summary:", error);
    return {
      orgId,
      period,
      usage: {
        embedding: { tokens: 0, cost: 0 },
        search: { requests: 0, cost: 0 },
        llm: { tokens: 0, cost: 0 },
        storage: { bytes: 0, cost: 0 },
      },
      totalCost: 0,
    };
  }
}

/**
 * Get daily usage breakdown
 */
export async function getDailyUsage(
  prisma: PrismaClient,
  orgId: string,
  days: number = 30
): Promise<
  Array<{
    date: Date;
    embedding: number;
    search: number;
    llm: number;
    storage: number;
    totalCost: number;
  }>
> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const results = await prisma.$queryRaw<
      Array<{
        date: Date;
        usage_type: string;
        total_quantity: bigint;
        total_cost: bigint;
      }>
    >`
      SELECT
        DATE(created_at) as date,
        usage_type,
        SUM(quantity) as total_quantity,
        SUM(cost_micros) as total_cost
      FROM usage_records
      WHERE org_id = ${orgId}::uuid
      AND created_at >= ${startDate}
      GROUP BY DATE(created_at), usage_type
      ORDER BY date ASC
    `;

    // Group by date
    const dateMap = new Map<
      string,
      {
        date: Date;
        embedding: number;
        search: number;
        llm: number;
        storage: number;
        totalCost: number;
      }
    >();

    for (const row of results) {
      const dateKey = row.date.toISOString().split("T")[0] ?? "";
      let entry = dateMap.get(dateKey);

      if (!entry) {
        entry = {
          date: row.date,
          embedding: 0,
          search: 0,
          llm: 0,
          storage: 0,
          totalCost: 0,
        };
        dateMap.set(dateKey, entry);
      }

      const quantity = Number(row.total_quantity);
      const cost = Number(row.total_cost) / 1_000_000;
      entry.totalCost += cost;

      switch (row.usage_type as UsageType) {
        case "embedding":
          entry.embedding = quantity;
          break;
        case "search":
          entry.search = quantity;
          break;
        case "llm":
          entry.llm = quantity;
          break;
        case "storage":
          entry.storage = quantity;
          break;
      }
    }

    return Array.from(dateMap.values());
  } catch (error) {
    console.warn("[UsageTracker] Could not get daily usage:", error);
    return [];
  }
}

/**
 * Check if organization is within usage limits
 */
export async function checkUsageLimits(
  prisma: PrismaClient,
  orgId: string
): Promise<{
  withinLimits: boolean;
  limits: {
    search: { used: number; limit: number };
    storage: { used: number; limit: number };
    llm: { used: number; limit: number };
  };
}> {
  // Get organization plan limits
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      planId: true,
      storageQuotaBytes: true,
      storageUsedBytes: true,
    },
  });

  if (!org) {
    return {
      withinLimits: false,
      limits: {
        search: { used: 0, limit: 0 },
        storage: { used: 0, limit: 0 },
        llm: { used: 0, limit: 0 },
      },
    };
  }

  // Get current period usage
  const usage = await getUsageSummary(prisma, orgId);

  // Define plan limits (these would typically come from a config or database)
  const PLAN_LIMITS: Record<string, { searches: number; llmTokens: number }> = {
    starter: { searches: 100, llmTokens: 50000 },
    professional: { searches: 1000, llmTokens: 500000 },
    enterprise: { searches: -1, llmTokens: -1 }, // unlimited
  };

  const planLimits = PLAN_LIMITS[org.planId] ?? PLAN_LIMITS.starter!;

  const searchLimit = planLimits.searches;
  const llmLimit = planLimits.llmTokens;
  const storageLimit = Number(org.storageQuotaBytes);

  const searchUsed = usage.usage.search.requests;
  const llmUsed = usage.usage.llm.tokens;
  const storageUsed = Number(org.storageUsedBytes);

  const withinLimits =
    (searchLimit < 0 || searchUsed < searchLimit) &&
    (llmLimit < 0 || llmUsed < llmLimit) &&
    storageUsed < storageLimit;

  return {
    withinLimits,
    limits: {
      search: { used: searchUsed, limit: searchLimit },
      storage: { used: storageUsed, limit: storageLimit },
      llm: { used: llmUsed, limit: llmLimit },
    },
  };
}
