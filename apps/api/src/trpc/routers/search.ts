import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { searchWithFallback, searchDocuments, type SearchOptions } from "../../lib/vector-search.js";
import { generateAnswer, type SourceChunk } from "../../lib/rag-generator.js";
import {
  getEntitySearchContext,
  buildEntityEnrichedContext,
  type EntityContext,
  type RelatedEntity,
} from "../../lib/entity-search.js";

// Type for daily search stats
interface DailySearchResult {
  date: Date;
  count: bigint;
}

// Type for search result
interface SearchResultItem {
  documentId: string;
  filename: string;
  score: number;
  pageNumber?: number;
}

// Type for chunk result
interface ChunkResult {
  document_id: string;
  content: string;
  page_number: number | null;
  chunk_index: number;
}

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
        includeEntities: z.boolean().default(true), // Include entity context
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
        // Use vector search with embedding similarity
        const searchOpts: SearchOptions = {
          limit: input.limit,
          minScore: 0.25, // Lower threshold for more results
        };

        results = await searchWithFallback(
          ctx.prisma,
          input.orgId,
          input.query,
          searchOpts
        );
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

      // Get entity context from matched documents
      let entities: EntityContext[] = [];
      let relatedEntities: RelatedEntity[] = [];
      let entitySummary = "";

      if (input.includeEntities && results.length > 0) {
        const documentIds = [...new Set(results.map((r) => r.documentId))];
        const entityContext = await getEntitySearchContext(ctx.prisma, input.orgId, documentIds);
        entities = entityContext.entities;
        relatedEntities = entityContext.relatedEntities;
        entitySummary = entityContext.entitySummary;
      }

      // Generate AI answer for question queries
      let answer: string | null = null;
      let answerSources: Array<{ documentId: string; pageNumber?: number; filename?: string; relevance?: number }> = [];
      let tokensUsed = 0;

      if (input.queryType === "question" && results.length > 0) {
        // Get full chunk content for RAG
        const chunksForRag = await getChunksForRag(ctx.prisma, input.orgId, results);

        if (chunksForRag.length > 0) {
          // Build entity-enriched context for better answers
          const entityContext = buildEntityEnrichedContext(entities, relatedEntities);

          // Pass entity context as additional context (prepended to chunks)
          const ragResult = await generateAnswer(input.query, chunksForRag, undefined, entityContext);
          answer = ragResult.answer;
          answerSources = ragResult.sources.map((s) => ({
            documentId: s.documentId,
            pageNumber: s.pageNumber,
            filename: s.filename,
            relevance: s.relevance,
          }));
          tokensUsed = ragResult.tokensUsed;
        }
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
        tokensUsed,
        latencyMs,
        hasMoreResults: results.length === input.limit,
        // Entity context
        entities,
        relatedEntities,
        entitySummary,
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
        dailySearches: dailySearches.map((d: DailySearchResult) => ({
          date: d.date.toISOString().split('T')[0] ?? "",
          count: Number(d.count),
        })),
      };
    }),
});

/**
 * Get chunk content for RAG answer generation
 * Retrieves the top chunks matching the search results
 */
async function getChunksForRag(
  prisma: Parameters<typeof searchDocuments>[0],
  orgId: string,
  results: Array<{
    documentId: string;
    filename: string;
    score: number;
    pageNumber?: number;
  }>
): Promise<SourceChunk[]> {
  if (results.length === 0) return [];

  const documentIds = results.map((r: SearchResultItem) => r.documentId);

  try {
    // Query chunks for the matched documents
    const chunks = await prisma.$queryRaw<
      Array<{
        document_id: string;
        content: string;
        page_number: number | null;
        chunk_index: number;
      }>
    >`
      SELECT
        dc.document_id,
        dc.content,
        dc.page_number,
        dc.chunk_index
      FROM document_chunks dc
      WHERE dc.document_id = ANY(${documentIds}::uuid[])
      AND dc.org_id = ${orgId}::uuid
      ORDER BY dc.chunk_index ASC
      LIMIT 10
    `;

    // Map chunks to SourceChunk format with scores from results
    const resultMap = new Map(
      results.map((r: SearchResultItem) => [r.documentId, { filename: r.filename, score: r.score, pageNumber: r.pageNumber }])
    );

    return chunks.map((c: ChunkResult) => {
      const info = resultMap.get(c.document_id);
      return {
        documentId: c.document_id,
        filename: info?.filename ?? "Unknown",
        content: c.content,
        score: info?.score ?? 0,
        pageNumber: c.page_number ?? info?.pageNumber,
        chunkIndex: c.chunk_index,
      };
    });
  } catch (error) {
    console.warn("[Search] Could not get chunks for RAG:", error);
    return [];
  }
}
