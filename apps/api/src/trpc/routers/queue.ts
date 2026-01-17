/**
 * Queue Management tRPC Router
 *
 * Provides endpoints for:
 * - Queue status and statistics
 * - Job management
 * - Triggering batch operations
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import {
  getAllQueueStats,
  getQueueStats,
  addDocumentIndexingJob,
  addBatchOperationJob,
  isQueueConfigured,
  QUEUE_NAMES,
  getDocumentIndexingQueue,
} from "../../lib/queue/index.js";
import { areWorkersRunning } from "../../lib/queue/workers.js";

// Job info interface for API response
export interface JobInfo {
  id: string;
  name: string;
  data: unknown;
  progress: unknown;
  timestamp: number | undefined;
  finishedOn: number | undefined;
  processedOn: number | undefined;
  failedReason: string | undefined;
}

export const queueRouter = router({
  /**
   * Get queue system status
   */
  getStatus: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify admin access
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
          message: "Admin access required",
        });
      }

      const configured = isQueueConfigured();
      const workersRunning = areWorkersRunning();

      let stats = null;
      if (configured) {
        try {
          stats = await getAllQueueStats();
        } catch (error) {
          console.error("[Queue] Error getting stats:", error);
        }
      }

      return {
        configured,
        workersRunning,
        stats,
        queues: Object.values(QUEUE_NAMES),
      };
    }),

  /**
   * Get statistics for a specific queue
   */
  getQueueStats: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        queueName: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify admin access
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
          message: "Admin access required",
        });
      }

      if (!isQueueConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Queue system not configured",
        });
      }

      return getQueueStats(input.queueName);
    }),

  /**
   * Queue a document for indexing
   */
  queueDocumentIndexing: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        documentId: z.string().uuid(),
        priority: z.enum(["high", "normal", "low"]).default("normal"),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      // Verify document exists and belongs to org
      const document = await ctx.prisma.document.findFirst({
        where: {
          id: input.documentId,
          orgId: input.orgId,
          deletedAt: null,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      if (!isQueueConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Queue system not configured. Documents will be indexed synchronously.",
        });
      }

      const job = await addDocumentIndexingJob({
        documentId: input.documentId,
        orgId: input.orgId,
        priority: input.priority,
      });

      // Update document status
      await ctx.prisma.document.update({
        where: { id: input.documentId },
        data: { indexStatus: "pending" },
      });

      return {
        jobId: job.id,
        status: "queued",
      };
    }),

  /**
   * Trigger a batch re-index operation
   */
  triggerBatchReindex: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin access
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
          message: "Admin access required",
        });
      }

      if (!isQueueConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Queue system not configured",
        });
      }

      const job = await addBatchOperationJob({
        operationType: "reindex_all",
        orgId: input.orgId,
      });

      return {
        jobId: job.id,
        status: "queued",
        message: "Batch re-index job queued successfully",
      };
    }),

  /**
   * Trigger entity extraction for all documents
   */
  triggerEntityExtraction: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin access
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
          message: "Admin access required",
        });
      }

      if (!isQueueConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Queue system not configured",
        });
      }

      const job = await addBatchOperationJob({
        operationType: "extract_entities_all",
        orgId: input.orgId,
      });

      return {
        jobId: job.id,
        status: "queued",
        message: "Entity extraction job queued successfully",
      };
    }),

  /**
   * Get recent jobs for the organization
   */
  getRecentJobs: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        queueName: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(["completed", "failed", "active", "waiting"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify admin access
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
          message: "Admin access required",
        });
      }

      if (!isQueueConfigured()) {
        return { jobs: [], total: 0 };
      }

      const queue = getDocumentIndexingQueue();

      let jobs: JobInfo[] = [];

      try {
        let rawJobs;
        switch (input.status) {
          case "completed":
            rawJobs = await queue.getCompleted(0, input.limit);
            break;
          case "failed":
            rawJobs = await queue.getFailed(0, input.limit);
            break;
          case "active":
            rawJobs = await queue.getActive(0, input.limit);
            break;
          case "waiting":
            rawJobs = await queue.getWaiting(0, input.limit);
            break;
          default:
            rawJobs = await queue.getJobs(["completed", "failed", "active", "waiting"], 0, input.limit);
        }

        jobs = rawJobs
          .filter((job) => {
            // Filter by org
            const jobData = job.data as { orgId?: string };
            return jobData.orgId === input.orgId;
          })
          .map((job): JobInfo => ({
            id: job.id ?? "unknown",
            name: job.name,
            data: job.data,
            progress: job.progress,
            timestamp: job.timestamp,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn,
            failedReason: job.failedReason,
          }));
      } catch (error) {
        console.error("[Queue] Error getting jobs:", error);
      }

      return {
        jobs,
        total: jobs.length,
      };
    }),
});
