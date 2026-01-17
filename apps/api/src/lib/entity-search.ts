/**
 * Entity-Aware Search Utilities
 *
 * Enhances search with Knowledge Graph context:
 * - Extracts entities from search results
 * - Provides entity context for RAG
 * - Finds related entities for exploration
 */

import type { PrismaClient } from "@documind/db";

export interface EntityContext {
  id: string;
  name: string;
  type: string;
  mentionCount: number;
  confidence: number;
}

export interface RelatedEntity {
  id: string;
  name: string;
  type: string;
  relationshipType: string;
  direction: "incoming" | "outgoing";
}

export interface EntitySearchResult {
  entities: EntityContext[];
  relatedEntities: RelatedEntity[];
  entitySummary: string;
}

/**
 * Get entities mentioned in the search result documents
 */
export async function getEntitiesFromResults(
  prisma: PrismaClient,
  orgId: string,
  documentIds: string[],
  limit: number = 10
): Promise<EntityContext[]> {
  if (documentIds.length === 0) return [];

  try {
    const entities = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        type: string;
        mention_count: number;
        confidence: number;
        doc_mentions: bigint;
      }>
    >`
      SELECT DISTINCT ON (e.id)
        e.id,
        e.name,
        e.type,
        e.mention_count,
        e.confidence,
        COUNT(em.id) as doc_mentions
      FROM entities e
      INNER JOIN entity_mentions em ON em.entity_id = e.id
      INNER JOIN document_chunks dc ON dc.id = em.chunk_id
      WHERE dc.document_id = ANY(${documentIds}::uuid[])
      AND e.org_id = ${orgId}::uuid
      GROUP BY e.id, e.name, e.type, e.mention_count, e.confidence
      ORDER BY e.id, doc_mentions DESC, e.confidence DESC
      LIMIT ${limit}
    `;

    return entities.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      mentionCount: e.mention_count,
      confidence: e.confidence,
    }));
  } catch (error) {
    console.warn("[EntitySearch] Error fetching entities from results:", error);
    return [];
  }
}

/**
 * Get related entities based on relationships
 */
export async function getRelatedEntities(
  prisma: PrismaClient,
  orgId: string,
  entityIds: string[],
  limit: number = 10
): Promise<RelatedEntity[]> {
  if (entityIds.length === 0) return [];

  try {
    // Get entities connected via relationships
    const related = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        type: string;
        relationship_type: string;
        direction: string;
      }>
    >`
      SELECT DISTINCT ON (e.id)
        e.id,
        e.name,
        e.type,
        r.relationship_type,
        CASE WHEN r.source_entity_id = ANY(${entityIds}::uuid[]) THEN 'outgoing' ELSE 'incoming' END as direction
      FROM entities e
      INNER JOIN relationships r ON (r.source_entity_id = e.id OR r.target_entity_id = e.id)
      WHERE e.org_id = ${orgId}::uuid
      AND e.id != ALL(${entityIds}::uuid[])
      AND (r.source_entity_id = ANY(${entityIds}::uuid[]) OR r.target_entity_id = ANY(${entityIds}::uuid[]))
      ORDER BY e.id, r.confidence DESC
      LIMIT ${limit}
    `;

    return related.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      relationshipType: r.relationship_type,
      direction: r.direction as "incoming" | "outgoing",
    }));
  } catch (error) {
    console.warn("[EntitySearch] Error fetching related entities:", error);
    return [];
  }
}

/**
 * Search entities by name (fuzzy matching)
 */
export async function searchEntitiesByName(
  prisma: PrismaClient,
  orgId: string,
  query: string,
  limit: number = 5
): Promise<EntityContext[]> {
  if (!query.trim()) return [];

  try {
    const searchPattern = `%${query.toLowerCase()}%`;

    const entities = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        type: string;
        mention_count: number;
        confidence: number;
      }>
    >`
      SELECT
        id,
        name,
        type,
        mention_count,
        confidence
      FROM entities
      WHERE org_id = ${orgId}::uuid
      AND (LOWER(name) LIKE ${searchPattern} OR LOWER(normalized_name) LIKE ${searchPattern})
      ORDER BY
        CASE WHEN LOWER(name) = ${query.toLowerCase()} THEN 0 ELSE 1 END,
        mention_count DESC,
        confidence DESC
      LIMIT ${limit}
    `;

    return entities.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      mentionCount: e.mention_count,
      confidence: e.confidence,
    }));
  } catch (error) {
    console.warn("[EntitySearch] Error searching entities:", error);
    return [];
  }
}

/**
 * Generate entity summary for RAG context
 */
export function generateEntitySummary(entities: EntityContext[]): string {
  if (entities.length === 0) return "";

  const byType = new Map<string, string[]>();
  for (const e of entities) {
    const list = byType.get(e.type) || [];
    list.push(e.name);
    byType.set(e.type, list);
  }

  const parts: string[] = [];
  for (const [type, names] of byType) {
    const formattedType = type.charAt(0) + type.slice(1).toLowerCase();
    parts.push(`${formattedType}s: ${names.slice(0, 5).join(", ")}`);
  }

  return `Key entities mentioned: ${parts.join("; ")}`;
}

/**
 * Build entity-enriched context for RAG
 */
export function buildEntityEnrichedContext(
  entities: EntityContext[],
  relatedEntities: RelatedEntity[]
): string {
  if (entities.length === 0) return "";

  const lines: string[] = [
    "## Knowledge Graph Context",
    "",
    "The following entities are mentioned in the relevant documents:",
    "",
  ];

  // Group entities by type
  const byType = new Map<string, EntityContext[]>();
  for (const e of entities) {
    const list = byType.get(e.type) || [];
    list.push(e);
    byType.set(e.type, list);
  }

  for (const [type, entityList] of byType) {
    const formattedType = type.charAt(0) + type.slice(1).toLowerCase() + "s";
    lines.push(`### ${formattedType}`);
    for (const e of entityList.slice(0, 3)) {
      lines.push(`- ${e.name} (${e.mentionCount} mentions)`);
    }
    lines.push("");
  }

  // Add relationships
  if (relatedEntities.length > 0) {
    lines.push("### Key Relationships");
    for (const r of relatedEntities.slice(0, 5)) {
      const arrow = r.direction === "outgoing" ? "→" : "←";
      const relType = r.relationshipType.replace(/_/g, " ").toLowerCase();
      lines.push(`- ${arrow} ${relType}: ${r.name} (${r.type})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get full entity search context for a query
 */
export async function getEntitySearchContext(
  prisma: PrismaClient,
  orgId: string,
  documentIds: string[]
): Promise<EntitySearchResult> {
  // Get entities from matched documents
  const entities = await getEntitiesFromResults(prisma, orgId, documentIds, 15);

  // Get related entities
  const entityIds = entities.map((e) => e.id);
  const relatedEntities = await getRelatedEntities(prisma, orgId, entityIds, 10);

  // Generate summary
  const entitySummary = generateEntitySummary(entities);

  return {
    entities,
    relatedEntities,
    entitySummary,
  };
}
