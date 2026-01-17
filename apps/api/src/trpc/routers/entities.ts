/**
 * Entities Router - Knowledge Graph API
 *
 * Provides endpoints for:
 * - Entity listing and filtering
 * - Entity details with mentions and relationships
 * - Graph data for visualization
 * - Entity-aware search
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, verifyMembership } from "../trpc.js";

// Define entity types locally (matches Prisma schema)
type EntityType =
  | "PERSON"
  | "ORGANIZATION"
  | "LOCATION"
  | "DATE"
  | "CONCEPT"
  | "PRODUCT"
  | "EVENT"
  | "TOPIC"
  | "MONEY"
  | "TECHNOLOGY"
  | "OTHER"
  // Slack-specific entity types
  | "SLACK_WORKSPACE"
  | "SLACK_USER"
  | "SLACK_CHANNEL"
  | "SLACK_THREAD"
  | "SLACK_MESSAGE"
  | "SLACK_BOT"
  | "SLACK_FILE"
  | "SLACK_REACTION";

// Define relationship types locally (matches Prisma schema)
type RelationshipType =
  | "WORKS_FOR"
  | "REPORTS_TO"
  | "COLLABORATES"
  | "AUTHORED"
  | "MENTIONED"
  | "SUBSIDIARY_OF"
  | "PARTNER_OF"
  | "COMPETES_WITH"
  | "DISCUSSES"
  | "RELATES_TO"
  | "LOCATED_IN"
  | "OCCURRED_ON"
  | "INVOLVES"
  | "ASSOCIATED"
  | "OTHER"
  // Slack-specific structural relationships
  | "MEMBER_OF"
  | "CONTAINS"
  | "PART_OF"
  // Slack-specific communication relationships
  | "AUTHORED_BY"
  | "POSTED_IN"
  | "REPLIED_TO"
  | "MENTIONED_IN"
  // Slack-specific collaborative relationships
  | "COLLABORATED_IN"
  | "ACTIVE_IN"
  // Slack-specific semantic relationships
  | "REFERENCES"
  | "SHARES"
  // Slack-specific signal relationships
  | "REACTED_WITH"
  | "REACTED_TO"
  | "PINNED_IN";

// Helper types for Prisma results
interface RelatedEntityResult {
  id: string;
  name: string;
  type: EntityType;
}

interface OutgoingRelationshipResult {
  id: string;
  type: RelationshipType;
  weight: number;
  confidence: number;
  description: string | null;
  targetEntity: RelatedEntityResult;
}

interface IncomingRelationshipResult {
  id: string;
  type: RelationshipType;
  weight: number;
  confidence: number;
  description: string | null;
  sourceEntity: RelatedEntityResult;
}

interface EntityResult {
  id: string;
  name: string;
  type: EntityType;
  mentionCount: number;
  confidence: number;
}

interface RelationshipResult {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: RelationshipType;
  weight: number;
  confidence: number;
}

interface EntityByTypeResult {
  type: EntityType;
  _count: number;
}

interface EntityMentionResult {
  entity: {
    id: string;
    name: string;
    type: EntityType;
    mentionCount: number;
  };
}

interface RelationshipTypeResult {
  type: RelationshipType;
  _count: number;
}

interface EntityMentionCountResult {
  entityId: string;
  _count: number;
}

// Entity type enum for input validation
const EntityTypeEnum = z.enum([
  "PERSON",
  "ORGANIZATION",
  "LOCATION",
  "DATE",
  "CONCEPT",
  "PRODUCT",
  "EVENT",
  "TOPIC",
  "MONEY",
  "TECHNOLOGY",
  "OTHER",
]);

// Relationship type enum for input validation
const RelationshipTypeEnum = z.enum([
  "WORKS_FOR",
  "REPORTS_TO",
  "COLLABORATES",
  "AUTHORED",
  "MENTIONED",
  "SUBSIDIARY_OF",
  "PARTNER_OF",
  "COMPETES_WITH",
  "DISCUSSES",
  "RELATES_TO",
  "LOCATED_IN",
  "OCCURRED_ON",
  "INVOLVES",
  "ASSOCIATED",
  "OTHER",
]);

export const entitiesRouter = router({
  /**
   * List entities with filtering and pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        type: EntityTypeEnum.optional(),
        search: z.string().max(200).optional(),
        sortBy: z.enum(["name", "mentionCount", "createdAt"]).default("mentionCount"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMembership(ctx.prisma, ctx.user.id, input.orgId);

      const where: {
        orgId: string;
        type?: EntityType;
        OR?: Array<{
          name?: { contains: string; mode: "insensitive" };
          normalizedName?: { contains: string; mode: "insensitive" };
        }>;
      } = {
        orgId: input.orgId,
      };

      if (input.type) {
        where.type = input.type;
      }

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { normalizedName: { contains: input.search.toLowerCase(), mode: "insensitive" } },
        ];
      }

      const entities = await ctx.prisma.entity.findMany({
        where,
        orderBy: { [input.sortBy]: input.sortOrder },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        select: {
          id: true,
          name: true,
          type: true,
          confidence: true,
          mentionCount: true,
          documentCount: true,
          aliases: true,
          createdAt: true,
        },
      });

      let nextCursor: string | undefined;
      if (entities.length > input.limit) {
        const nextItem = entities.pop();
        nextCursor = nextItem?.id;
      }

      return {
        entities,
        nextCursor,
      };
    }),

  /**
   * Get a single entity with details, mentions, and relationships
   */
  get: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        entityId: z.string().uuid(),
        includeMentions: z.boolean().default(true),
        includeRelationships: z.boolean().default(true),
        mentionLimit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMembership(ctx.prisma, ctx.user.id, input.orgId);

      // Get the base entity
      const entity = await ctx.prisma.entity.findFirst({
        where: {
          id: input.entityId,
          orgId: input.orgId,
        },
        select: {
          id: true,
          name: true,
          type: true,
          normalizedName: true,
          aliases: true,
          confidence: true,
          mentionCount: true,
          documentCount: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!entity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entity not found",
        });
      }

      // Get mentions if requested
      let mentions: Array<{
        id: string;
        mentionText: string;
        contextBefore: string;
        contextAfter: string;
        startOffset: number;
        endOffset: number;
        confidence: number;
        chunk: {
          id: string;
          content: string;
          pageNumber: number | null;
          document: {
            id: string;
            filename: string;
            fileType: string;
          };
        };
      }> = [];

      if (input.includeMentions) {
        mentions = await ctx.prisma.entityMention.findMany({
          where: {
            entityId: input.entityId,
            orgId: input.orgId,
          },
          take: input.mentionLimit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            mentionText: true,
            contextBefore: true,
            contextAfter: true,
            startOffset: true,
            endOffset: true,
            confidence: true,
            chunk: {
              select: {
                id: true,
                content: true,
                pageNumber: true,
                document: {
                  select: {
                    id: true,
                    filename: true,
                    fileType: true,
                  },
                },
              },
            },
          },
        });
      }

      // Get relationships if requested
      let relationships: Array<{
        id: string;
        type: RelationshipType;
        direction: "outgoing" | "incoming";
        relatedEntity: {
          id: string;
          name: string;
          type: EntityType;
        };
        weight: number;
        confidence: number;
        description: string | null;
      }> = [];

      if (input.includeRelationships) {
        const [outgoing, incoming] = await Promise.all([
          ctx.prisma.relationship.findMany({
            where: {
              sourceEntityId: input.entityId,
              orgId: input.orgId,
            },
            select: {
              id: true,
              type: true,
              weight: true,
              confidence: true,
              description: true,
              targetEntity: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          }),
          ctx.prisma.relationship.findMany({
            where: {
              targetEntityId: input.entityId,
              orgId: input.orgId,
            },
            select: {
              id: true,
              type: true,
              weight: true,
              confidence: true,
              description: true,
              sourceEntity: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          }),
        ]);

        relationships = [
          ...outgoing.map((r: OutgoingRelationshipResult) => ({
            id: r.id,
            type: r.type,
            direction: "outgoing" as const,
            relatedEntity: r.targetEntity,
            weight: r.weight,
            confidence: r.confidence,
            description: r.description,
          })),
          ...incoming.map((r: IncomingRelationshipResult) => ({
            id: r.id,
            type: r.type,
            direction: "incoming" as const,
            relatedEntity: r.sourceEntity,
            weight: r.weight,
            confidence: r.confidence,
            description: r.description,
          })),
        ];
      }

      return {
        ...entity,
        mentions,
        relationships,
      };
    }),

  /**
   * Get graph data for visualization
   * Returns nodes (entities) and edges (relationships) in a format
   * suitable for graph visualization libraries
   */
  getGraph: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        // Filter by entity types
        entityTypes: z.array(EntityTypeEnum).optional(),
        // Filter by relationship types
        relationshipTypes: z.array(RelationshipTypeEnum).optional(),
        // Only include entities with minimum mentions
        minMentions: z.number().min(0).default(1),
        // Limit total nodes for performance
        nodeLimit: z.number().min(1).max(500).default(100),
        // Center on a specific entity (for focused view)
        centeredEntityId: z.string().uuid().optional(),
        // Depth for centered view (hops from center)
        depth: z.number().min(1).max(3).default(2),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMembership(ctx.prisma, ctx.user.id, input.orgId);

      // If centered on a specific entity, use graph traversal
      if (input.centeredEntityId) {
        return getCenteredGraph(ctx.prisma, {
          ...input,
          centeredEntityId: input.centeredEntityId,
        });
      }

      // Otherwise, get top entities by mention count
      const entityWhere: {
        orgId: string;
        mentionCount: { gte: number };
        type?: { in: EntityType[] };
      } = {
        orgId: input.orgId,
        mentionCount: { gte: input.minMentions },
      };

      if (input.entityTypes && input.entityTypes.length > 0) {
        entityWhere.type = { in: input.entityTypes as EntityType[] };
      }

      const entities = await ctx.prisma.entity.findMany({
        where: entityWhere,
        orderBy: { mentionCount: "desc" },
        take: input.nodeLimit,
        select: {
          id: true,
          name: true,
          type: true,
          mentionCount: true,
          confidence: true,
        },
      });

      const entityIds = entities.map((e: EntityResult) => e.id);

      // Get relationships between these entities
      const relationshipWhere: {
        orgId: string;
        sourceEntityId: { in: string[] };
        targetEntityId: { in: string[] };
        type?: { in: RelationshipType[] };
      } = {
        orgId: input.orgId,
        sourceEntityId: { in: entityIds },
        targetEntityId: { in: entityIds },
      };

      if (input.relationshipTypes && input.relationshipTypes.length > 0) {
        relationshipWhere.type = { in: input.relationshipTypes as RelationshipType[] };
      }

      const relationships = await ctx.prisma.relationship.findMany({
        where: relationshipWhere,
        select: {
          id: true,
          sourceEntityId: true,
          targetEntityId: true,
          type: true,
          weight: true,
          confidence: true,
        },
      });

      // Transform to graph format
      const nodes = entities.map((e: EntityResult) => ({
        id: e.id,
        label: e.name,
        type: e.type,
        size: Math.log2(e.mentionCount + 1) * 5 + 10, // Scale node size by mentions
        confidence: e.confidence,
        mentionCount: e.mentionCount,
      }));

      const edges = relationships.map((r: RelationshipResult) => ({
        id: r.id,
        source: r.sourceEntityId,
        target: r.targetEntityId,
        type: r.type,
        weight: r.weight,
        confidence: r.confidence,
      }));

      return {
        nodes,
        edges,
        stats: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          entityTypes: [...new Set(entities.map((e: EntityResult) => e.type))],
          relationshipTypes: [...new Set(relationships.map((r: RelationshipResult) => r.type))],
        },
      };
    }),

  /**
   * Get entity statistics for the organization
   */
  getStats: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMembership(ctx.prisma, ctx.user.id, input.orgId);

      const [
        totalEntities,
        totalMentions,
        totalRelationships,
        entitiesByType,
        topEntities,
        recentEntities,
      ] = await Promise.all([
        ctx.prisma.entity.count({ where: { orgId: input.orgId } }),
        ctx.prisma.entityMention.count({ where: { orgId: input.orgId } }),
        ctx.prisma.relationship.count({ where: { orgId: input.orgId } }),
        ctx.prisma.entity.groupBy({
          by: ["type"],
          where: { orgId: input.orgId },
          _count: true,
          orderBy: { _count: { type: "desc" } },
        }),
        ctx.prisma.entity.findMany({
          where: { orgId: input.orgId },
          orderBy: { mentionCount: "desc" },
          take: 10,
          select: {
            id: true,
            name: true,
            type: true,
            mentionCount: true,
          },
        }),
        ctx.prisma.entity.findMany({
          where: { orgId: input.orgId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        totalEntities,
        totalMentions,
        totalRelationships,
        entitiesByType: entitiesByType.map((e: EntityByTypeResult) => ({
          type: e.type,
          count: e._count,
        })),
        topEntities,
        recentEntities,
      };
    }),

  /**
   * Search entities by name
   */
  search: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        query: z.string().min(1).max(200),
        types: z.array(EntityTypeEnum).optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMembership(ctx.prisma, ctx.user.id, input.orgId);

      const where: {
        orgId: string;
        OR: Array<{
          name?: { contains: string; mode: "insensitive" };
          normalizedName?: { contains: string; mode: "insensitive" };
          aliases?: { has: string };
        }>;
        type?: { in: EntityType[] };
      } = {
        orgId: input.orgId,
        OR: [
          { name: { contains: input.query, mode: "insensitive" } },
          { normalizedName: { contains: input.query.toLowerCase(), mode: "insensitive" } },
          { aliases: { has: input.query.toLowerCase() } },
        ],
      };

      if (input.types && input.types.length > 0) {
        where.type = { in: input.types as EntityType[] };
      }

      const entities = await ctx.prisma.entity.findMany({
        where,
        orderBy: { mentionCount: "desc" },
        take: input.limit,
        select: {
          id: true,
          name: true,
          type: true,
          mentionCount: true,
          confidence: true,
        },
      });

      return entities;
    }),

  /**
   * Get entities mentioned in a specific document
   */
  getByDocument: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        documentId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMembership(ctx.prisma, ctx.user.id, input.orgId);

      // Get unique entities mentioned in this document's chunks
      const mentions = await ctx.prisma.entityMention.findMany({
        where: {
          orgId: input.orgId,
          chunk: {
            documentId: input.documentId,
          },
        },
        select: {
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              mentionCount: true,
            },
          },
        },
        distinct: ["entityId"],
        take: input.limit,
      });

      // Count mentions per entity in this document
      const entityMentionCounts = await ctx.prisma.entityMention.groupBy({
        by: ["entityId"],
        where: {
          orgId: input.orgId,
          chunk: {
            documentId: input.documentId,
          },
        },
        _count: true,
      });

      const countMap = new Map(entityMentionCounts.map((e: EntityMentionCountResult) => [e.entityId, e._count]));

      return mentions.map((m: EntityMentionResult) => ({
        ...m.entity,
        documentMentions: countMap.get(m.entity.id) ?? 0,
      }));
    }),

  /**
   * Get relationship types summary
   */
  getRelationshipTypes: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMembership(ctx.prisma, ctx.user.id, input.orgId);

      const types = await ctx.prisma.relationship.groupBy({
        by: ["type"],
        where: { orgId: input.orgId },
        _count: true,
        orderBy: { _count: { type: "desc" } },
      });

      return types.map((t: RelationshipTypeResult) => ({
        type: t.type,
        count: t._count,
      }));
    }),
});

/**
 * Get a centered graph view starting from a specific entity
 */
async function getCenteredGraph(
  prisma: Parameters<typeof verifyMembership>[0],
  input: {
    orgId: string;
    centeredEntityId: string;
    depth: number;
    entityTypes?: string[];
    relationshipTypes?: string[];
    nodeLimit: number;
  }
) {
  const visited = new Set<string>();
  const toVisit = [input.centeredEntityId];
  const allEntities: Array<{
    id: string;
    name: string;
    type: string;
    mentionCount: number;
    confidence: number;
  }> = [];
  const allRelationships: Array<{
    id: string;
    sourceEntityId: string;
    targetEntityId: string;
    type: string;
    weight: number;
    confidence: number;
  }> = [];

  let currentDepth = 0;

  while (toVisit.length > 0 && currentDepth < input.depth && allEntities.length < input.nodeLimit) {
    const currentLevel = [...toVisit];
    toVisit.length = 0;

    for (const entityId of currentLevel) {
      if (visited.has(entityId)) continue;
      visited.add(entityId);

      // Get the entity
      const entity = await prisma.entity.findFirst({
        where: {
          id: entityId,
          orgId: input.orgId,
        },
        select: {
          id: true,
          name: true,
          type: true,
          mentionCount: true,
          confidence: true,
        },
      });

      if (!entity) continue;

      // Check type filter
      if (input.entityTypes && input.entityTypes.length > 0) {
        if (!input.entityTypes.includes(entity.type)) continue;
      }

      allEntities.push(entity);

      if (allEntities.length >= input.nodeLimit) break;

      // Get relationships
      const relationshipWhere: {
        orgId: string;
        OR: Array<{ sourceEntityId: string } | { targetEntityId: string }>;
        type?: { in: RelationshipType[] };
      } = {
        orgId: input.orgId,
        OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }],
      };

      if (input.relationshipTypes && input.relationshipTypes.length > 0) {
        relationshipWhere.type = { in: input.relationshipTypes as RelationshipType[] };
      }

      const relationships = await prisma.relationship.findMany({
        where: relationshipWhere,
        select: {
          id: true,
          sourceEntityId: true,
          targetEntityId: true,
          type: true,
          weight: true,
          confidence: true,
        },
      });

      for (const rel of relationships) {
        if (!allRelationships.some((r) => r.id === rel.id)) {
          allRelationships.push(rel);
        }

        // Add connected entities to visit list
        const connectedId =
          rel.sourceEntityId === entityId ? rel.targetEntityId : rel.sourceEntityId;
        if (!visited.has(connectedId)) {
          toVisit.push(connectedId);
        }
      }
    }

    currentDepth++;
  }

  // Transform to graph format
  const nodes = allEntities.map((e) => ({
    id: e.id,
    label: e.name,
    type: e.type,
    size: Math.log2(e.mentionCount + 1) * 5 + 10,
    confidence: e.confidence,
    mentionCount: e.mentionCount,
    isCentered: e.id === input.centeredEntityId,
  }));

  // Only include edges where both nodes exist
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = allRelationships
    .filter((r) => nodeIds.has(r.sourceEntityId) && nodeIds.has(r.targetEntityId))
    .map((r) => ({
      id: r.id,
      source: r.sourceEntityId,
      target: r.targetEntityId,
      type: r.type,
      weight: r.weight,
      confidence: r.confidence,
    }));

  return {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      entityTypes: [...new Set(allEntities.map((e) => e.type))],
      relationshipTypes: [...new Set(allRelationships.map((r) => r.type))],
      depth: currentDepth,
      centeredEntityId: input.centeredEntityId,
    },
  };
}
