import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";

export const searchRouter = router({
  /**
   * Search documents and get AI-powered answers
   */
  query: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        query: z.string().min(1).max(1000),
        queryType: z.enum(["search", "question", "followup"]).default("search"),
        limit: z.number().min(1).max(20).default(10),
        sessionId: z.string().optional(), // For followup questions
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

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
              vertexDataStoreId: true,
              vertexSearchAppId: true,
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

      // Check if Vertex AI Search is configured
      const org = membership.org;
      const isVertexConfigured = org.vertexDataStoreId && org.vertexSearchAppId;

      // For now, do a simple database search until Vertex AI is configured
      // This will be replaced with actual Vertex AI Search integration
      let results: Array<{
        documentId: string;
        filename: string;
        fileType: string;
        snippet: string;
        score: number;
        pageNumber?: number;
      }> = [];

      if (!isVertexConfigured) {
        // Fallback: Simple filename search
        const documents = await ctx.prisma.document.findMany({
          where: {
            orgId: input.orgId,
            deletedAt: null,
            indexStatus: "indexed",
            OR: [
              { filename: { contains: input.query, mode: "insensitive" } },
              // In a real implementation, we'd search document content
            ],
          },
          take: input.limit,
          select: {
            id: true,
            filename: true,
            fileType: true,
            metadata: true,
          },
        });

        results = documents.map((doc, index) => ({
          documentId: doc.id,
          filename: doc.filename,
          fileType: doc.fileType,
          snippet: `Found "${input.query}" in ${doc.filename}`,
          score: 1 - index * 0.1,
        }));
      } else {
        // TODO: Implement Vertex AI Search
        // const vertexResults = await vertexSearch({
        //   dataStoreId: org.vertexDataStoreId,
        //   searchAppId: org.vertexSearchAppId,
        //   query: input.query,
        //   limit: input.limit,
        // });
        // results = vertexResults;
      }

      // Generate AI answer (placeholder)
      let answer: string | null = null;
      let answerSources: Array<{ documentId: string; pageNumber?: number }> = [];

      if (input.queryType === "question" && results.length > 0) {
        // TODO: Implement Gemini RAG for answer generation
        // For now, return a placeholder
        answer = `Based on the ${results.length} document(s) found, here's what I found about "${input.query}"...`;
        answerSources = results.slice(0, 3).map((r) => ({
          documentId: r.documentId,
          pageNumber: r.pageNumber,
        }));
      }

      const latencyMs = Date.now() - startTime;

      // Log the search
      await ctx.prisma.searchLog.create({
        data: {
          orgId: input.orgId,
          userId: ctx.user.id,
          query: input.query,
          queryType: input.queryType,
          resultsCount: results.length,
          answerGenerated: !!answer,
          latencyMs,
          sessionId: input.sessionId,
        },
      });

      return {
        results,
        answer,
        answerSources,
        latencyMs,
        hasMoreResults: results.length === input.limit,
      };
    }),

  /**
   * Get search history for an organization
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().uuid().optional(),
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

      const logs = await ctx.prisma.searchLog.findMany({
        where: { orgId: input.orgId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        select: {
          id: true,
          query: true,
          queryType: true,
          resultsCount: true,
          answerGenerated: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (logs.length > input.limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        logs,
        nextCursor,
      };
    }),

  /**
   * Get recent searches for the current user
   */
  getRecentSearches: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        limit: z.number().min(1).max(10).default(5),
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

      const searches = await ctx.prisma.searchLog.findMany({
        where: {
          orgId: input.orgId,
          userId: ctx.user.id,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        distinct: ["query"], // Only show unique queries
        select: {
          id: true,
          query: true,
          queryType: true,
          createdAt: true,
        },
      });

      return searches;
    }),

  /**
   * Submit feedback for a search result
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        searchLogId: z.string().uuid(),
        feedback: z.enum(["positive", "negative"]),
        feedbackText: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the search log belongs to user's org
      const searchLog = await ctx.prisma.searchLog.findFirst({
        where: {
          id: input.searchLogId,
          org: {
            memberships: {
              some: {
                userId: ctx.user.id,
                status: "active",
              },
            },
          },
        },
      });

      if (!searchLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Search log not found",
        });
      }

      await ctx.prisma.searchLog.update({
        where: { id: input.searchLogId },
        data: {
          feedback: input.feedback,
          feedbackText: input.feedbackText,
        },
      });

      return { success: true };
    }),

  /**
   * Get search statistics for an organization
   */
  getStats: protectedProcedure
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

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const [totalSearches, questionsAsked, positiveFeedback, negativeFeedback] =
        await Promise.all([
          ctx.prisma.searchLog.count({
            where: {
              orgId: input.orgId,
              createdAt: { gte: startDate },
            },
          }),
          ctx.prisma.searchLog.count({
            where: {
              orgId: input.orgId,
              queryType: "question",
              createdAt: { gte: startDate },
            },
          }),
          ctx.prisma.searchLog.count({
            where: {
              orgId: input.orgId,
              feedback: "positive",
              createdAt: { gte: startDate },
            },
          }),
          ctx.prisma.searchLog.count({
            where: {
              orgId: input.orgId,
              feedback: "negative",
              createdAt: { gte: startDate },
            },
          }),
        ]);

      // Get daily search counts
      const dailySearches = await ctx.prisma.$queryRaw<
        Array<{ date: Date; count: bigint }>
      >`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM search_logs
        WHERE org_id = ${input.orgId}::uuid
        AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      return {
        totalSearches,
        questionsAsked,
        positiveFeedback,
        negativeFeedback,
        satisfactionRate:
          positiveFeedback + negativeFeedback > 0
            ? Math.round(
                (positiveFeedback / (positiveFeedback + negativeFeedback)) * 100
              )
            : null,
        dailySearches: dailySearches.map((d) => ({
          date: d.date,
          count: Number(d.count),
        })),
      };
    }),
});
