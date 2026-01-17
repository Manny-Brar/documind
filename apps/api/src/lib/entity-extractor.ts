/**
 * Entity Extraction Service
 *
 * Extracts named entities (people, organizations, concepts, etc.) from document chunks
 * using LLM-based extraction. Supports:
 * - Google Vertex AI (Gemini)
 * - OpenAI (GPT-4o)
 * - Mock extraction for development
 *
 * Part of the Knowledge Graph system for DocuMind.
 */

import type { PrismaClient, EntityType } from "@documind/db";

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  mentionText: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
  contextBefore?: string;
  contextAfter?: string;
}

export interface ExtractedRelationship {
  sourceEntityName: string;
  sourceEntityType: EntityType;
  targetEntityName: string;
  targetEntityType: EntityType;
  relationshipType: string;
  confidence: number;
  description?: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  tokensUsed: number;
  latencyMs: number;
}

export interface ExtractionConfig {
  provider: "vertex" | "openai" | "mock";
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ExtractionConfig = {
  provider: "mock",
  maxTokens: 2048,
  temperature: 0.1,
};

function getConfig(): ExtractionConfig {
  const vertexProject = process.env.GCP_PROJECT_ID;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (vertexProject && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      provider: "vertex",
      model: "gemini-1.5-flash",
      maxTokens: 2048,
      temperature: 0.1,
    };
  }

  if (openaiKey) {
    return {
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 2048,
      temperature: 0.1,
    };
  }

  console.warn("[EntityExtractor] No LLM provider configured - using mock extraction");
  return DEFAULT_CONFIG;
}

// ============================================================================
// EXTRACTION PROMPT
// ============================================================================

const EXTRACTION_PROMPT = `You are an expert entity and relationship extractor. Analyze the following text and extract:

1. **Named Entities**: People, organizations, locations, dates, concepts, products, events, topics, monetary values, and technologies mentioned in the text.

2. **Relationships**: Connections between the entities you identify.

For each entity, provide:
- name: The canonical/normalized name
- type: One of PERSON, ORGANIZATION, LOCATION, DATE, CONCEPT, PRODUCT, EVENT, TOPIC, MONEY, TECHNOLOGY, OTHER
- mentionText: The exact text as it appears in the document
- startOffset: Character position where the mention starts (0-indexed)
- endOffset: Character position where the mention ends
- confidence: Your confidence score from 0.0 to 1.0

For each relationship, provide:
- sourceEntityName: The name of the source entity
- sourceEntityType: The type of the source entity
- targetEntityName: The name of the target entity
- targetEntityType: The type of the target entity
- relationshipType: One of WORKS_FOR, REPORTS_TO, COLLABORATES, AUTHORED, MENTIONED, SUBSIDIARY_OF, PARTNER_OF, COMPETES_WITH, DISCUSSES, RELATES_TO, LOCATED_IN, OCCURRED_ON, INVOLVES, ASSOCIATED, OTHER
- confidence: Your confidence score from 0.0 to 1.0
- description: Brief description of the relationship

Return your response as valid JSON with this exact structure:
{
  "entities": [...],
  "relationships": [...]
}

Important guidelines:
- Be precise with character offsets - count from the beginning of the provided text
- Normalize names (e.g., "John Smith" not "john smith" or "JOHN SMITH")
- Extract dates in ISO format when possible (e.g., "2024-01-15")
- Include monetary values with currency symbols
- Only extract entities that are clearly named/identified in the text
- For relationships, only include those explicitly stated or strongly implied
- Assign higher confidence to explicit mentions, lower to inferences

TEXT TO ANALYZE:
`;

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract entities and relationships from a text chunk
 */
export async function extractEntities(
  text: string,
  config?: ExtractionConfig
): Promise<ExtractionResult> {
  const cfg = config ?? getConfig();
  const startTime = Date.now();

  if (!text || text.trim().length === 0) {
    return {
      entities: [],
      relationships: [],
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
    };
  }

  switch (cfg.provider) {
    case "vertex":
      return extractWithVertex(text, cfg, startTime);
    case "openai":
      return extractWithOpenAI(text, cfg, startTime);
    case "mock":
    default:
      return extractWithMock(text, cfg, startTime);
  }
}

/**
 * Try to dynamically import a module
 */
async function tryImport<T>(moduleName: string): Promise<T | null> {
  try {
    return (await import(moduleName)) as T;
  } catch {
    return null;
  }
}

/**
 * Extract using Google Vertex AI (Gemini)
 */
async function extractWithVertex(
  text: string,
  config: ExtractionConfig,
  startTime: number
): Promise<ExtractionResult> {
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION ?? "us-central1";

  if (!projectId) {
    throw new Error("GCP_PROJECT_ID not configured");
  }

  try {
    // Get access token
    let accessToken: string | null = null;

    interface GoogleAuthModule {
      GoogleAuth: new (options: { scopes: string[] }) => {
        getClient: () => Promise<{
          getAccessToken: () => Promise<{ token?: string | null }>;
        }>;
      };
    }

    const googleAuth = await tryImport<GoogleAuthModule>("google-auth-library");
    if (googleAuth) {
      const auth = new googleAuth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      accessToken = tokenResponse.token ?? null;
    }

    if (!accessToken) {
      console.warn("[EntityExtractor] No Vertex AI auth token available, using mock");
      return extractWithMock(text, config, startTime);
    }

    const model = config.model ?? "gemini-1.5-flash";
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

    const prompt = EXTRACTION_PROMPT + text;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: config.maxTokens ?? 2048,
          temperature: config.temperature ?? 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI error: ${error}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        totalTokenCount?: number;
      };
    };

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const tokensUsed = data.usageMetadata?.totalTokenCount ?? 0;

    return parseExtractionResponse(responseText, tokensUsed, startTime);
  } catch (error) {
    console.error("[EntityExtractor] Vertex AI error:", error);
    return extractWithMock(text, config, startTime);
  }
}

/**
 * Extract using OpenAI
 */
async function extractWithOpenAI(
  text: string,
  config: ExtractionConfig,
  startTime: number
): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  try {
    const model = config.model ?? "gpt-4o-mini";
    const prompt = EXTRACTION_PROMPT + text;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert entity extractor. Always respond with valid JSON only, no markdown formatting.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: config.maxTokens ?? 2048,
        temperature: config.temperature ?? 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const responseText = data.choices?.[0]?.message?.content ?? "{}";
    const tokensUsed = data.usage?.total_tokens ?? 0;

    return parseExtractionResponse(responseText, tokensUsed, startTime);
  } catch (error) {
    console.error("[EntityExtractor] OpenAI error:", error);
    return extractWithMock(text, config, startTime);
  }
}

/**
 * Parse the JSON response from LLM
 */
function parseExtractionResponse(
  responseText: string,
  tokensUsed: number,
  startTime: number
): ExtractionResult {
  try {
    // Clean up potential markdown formatting
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const parsed = JSON.parse(cleanJson) as {
      entities?: Array<{
        name?: string;
        type?: string;
        mentionText?: string;
        startOffset?: number;
        endOffset?: number;
        confidence?: number;
        contextBefore?: string;
        contextAfter?: string;
      }>;
      relationships?: Array<{
        sourceEntityName?: string;
        sourceEntityType?: string;
        targetEntityName?: string;
        targetEntityType?: string;
        relationshipType?: string;
        confidence?: number;
        description?: string;
      }>;
    };

    // Validate and normalize entities
    const entities: ExtractedEntity[] = (parsed.entities ?? [])
      .filter((e) => e.name && e.mentionText)
      .map((e) => ({
        name: normalizeEntityName(e.name ?? ""),
        type: normalizeEntityType(e.type),
        mentionText: e.mentionText ?? "",
        startOffset: e.startOffset ?? 0,
        endOffset: e.endOffset ?? 0,
        confidence: Math.min(1, Math.max(0, e.confidence ?? 0.5)),
        contextBefore: e.contextBefore,
        contextAfter: e.contextAfter,
      }));

    // Validate and normalize relationships
    const relationships: ExtractedRelationship[] = (parsed.relationships ?? [])
      .filter((r) => r.sourceEntityName && r.targetEntityName)
      .map((r) => ({
        sourceEntityName: normalizeEntityName(r.sourceEntityName ?? ""),
        sourceEntityType: normalizeEntityType(r.sourceEntityType),
        targetEntityName: normalizeEntityName(r.targetEntityName ?? ""),
        targetEntityType: normalizeEntityType(r.targetEntityType),
        relationshipType: r.relationshipType ?? "RELATES_TO",
        confidence: Math.min(1, Math.max(0, r.confidence ?? 0.5)),
        description: r.description,
      }));

    return {
      entities,
      relationships,
      tokensUsed,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[EntityExtractor] Failed to parse response:", error);
    return {
      entities: [],
      relationships: [],
      tokensUsed,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Normalize entity name (proper casing, trim)
 */
function normalizeEntityName(name: string): string {
  return name.trim();
}

/**
 * Normalize entity type to valid EntityType
 */
function normalizeEntityType(type?: string): EntityType {
  if (!type) return "OTHER";

  const normalized = type.toUpperCase().replace(/[^A-Z]/g, "");

  const validTypes: EntityType[] = [
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
  ];

  return validTypes.includes(normalized as EntityType)
    ? (normalized as EntityType)
    : "OTHER";
}

/**
 * Mock extraction for development/testing
 */
async function extractWithMock(
  text: string,
  _config: ExtractionConfig,
  startTime: number
): Promise<ExtractionResult> {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Simple pattern-based extraction for development
  const entities: ExtractedEntity[] = [];
  const relationships: ExtractedRelationship[] = [];

  // Extract capitalized words as potential entities (simple heuristic)
  const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  let match: RegExpExecArray | null;

  while ((match = capitalizedPattern.exec(text)) !== null) {
    const name = match[1];
    if (name && name.length > 2 && !isCommonWord(name)) {
      entities.push({
        name,
        type: guessEntityType(name),
        mentionText: name,
        startOffset: match.index,
        endOffset: match.index + name.length,
        confidence: 0.6,
      });
    }
  }

  // Extract dates
  const datePattern =
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/gi;

  while ((match = datePattern.exec(text)) !== null) {
    const dateStr = match[1];
    if (dateStr) {
      entities.push({
        name: dateStr,
        type: "DATE",
        mentionText: dateStr,
        startOffset: match.index,
        endOffset: match.index + dateStr.length,
        confidence: 0.9,
      });
    }
  }

  // Extract money
  const moneyPattern = /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|trillion))?/gi;

  while ((match = moneyPattern.exec(text)) !== null) {
    const money = match[0];
    entities.push({
      name: money,
      type: "MONEY",
      mentionText: money,
      startOffset: match.index,
      endOffset: match.index + money.length,
      confidence: 0.95,
    });
  }

  // Deduplicate by name
  const uniqueEntities = deduplicateEntities(entities);

  return {
    entities: uniqueEntities,
    relationships,
    tokensUsed: Math.ceil(text.length / 4),
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Check if word is a common English word (not a named entity)
 */
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    "The",
    "This",
    "That",
    "These",
    "Those",
    "What",
    "Which",
    "When",
    "Where",
    "Why",
    "How",
    "For",
    "And",
    "But",
    "With",
    "About",
    "From",
    "Into",
    "During",
    "Before",
    "After",
    "Above",
    "Below",
    "Between",
    "Under",
    "Again",
    "Further",
    "Then",
    "Once",
    "Here",
    "There",
    "All",
    "Each",
    "Few",
    "More",
    "Most",
    "Other",
    "Some",
    "Such",
    "Only",
    "Own",
    "Same",
    "Than",
    "Very",
    "Just",
    "Also",
    "Now",
    "However",
    "Therefore",
    "Although",
    "Because",
    "While",
    "If",
    "Or",
    "As",
    "Until",
    "So",
    "Yet",
    "Both",
    "Either",
    "Neither",
    "Not",
    "Only",
    "Can",
    "Will",
    "Should",
    "Would",
    "Could",
    "Must",
    "May",
    "Might",
    "Shall",
  ]);
  return commonWords.has(word);
}

/**
 * Guess entity type based on name patterns
 */
function guessEntityType(name: string): EntityType {
  // Organization indicators
  if (
    /\b(Inc|Corp|LLC|Ltd|Company|Co|Group|Holdings|Partners|Associates|Foundation|Institute|University|College|School|Hospital|Bank|Technologies|Solutions|Systems|Services)\b/i.test(
      name
    )
  ) {
    return "ORGANIZATION";
  }

  // Location indicators
  if (
    /\b(Street|Avenue|Road|Boulevard|City|State|County|Country|North|South|East|West|New|San|Los|Las)\b/i.test(
      name
    )
  ) {
    return "LOCATION";
  }

  // Technology indicators
  if (
    /\b(API|SDK|Framework|Platform|Software|Hardware|Cloud|AI|ML|Database|Server|Network)\b/i.test(
      name
    )
  ) {
    return "TECHNOLOGY";
  }

  // Default to PERSON for single capitalized names
  const wordCount = name.split(/\s+/).length;
  if (wordCount <= 3) {
    return "PERSON";
  }

  return "CONCEPT";
}

/**
 * Deduplicate entities by normalized name
 */
function deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const seen = new Map<string, ExtractedEntity>();

  for (const entity of entities) {
    const key = `${entity.name.toLowerCase()}_${entity.type}`;
    const existing = seen.get(key);

    if (!existing || entity.confidence > existing.confidence) {
      seen.set(key, entity);
    }
  }

  return Array.from(seen.values());
}

// ============================================================================
// ENTITY RESOLUTION
// ============================================================================

/**
 * Resolve an extracted entity to an existing entity or create a new one
 */
export async function resolveEntity(
  prisma: PrismaClient,
  orgId: string,
  extracted: ExtractedEntity
): Promise<string> {
  const normalizedName = extracted.name.toLowerCase().trim();

  // Try to find existing entity
  const existing = await prisma.entity.findFirst({
    where: {
      orgId,
      type: extracted.type,
      OR: [
        { normalizedName },
        { aliases: { has: normalizedName } },
        { aliases: { has: extracted.name } },
      ],
    },
  });

  if (existing) {
    // Update mention count
    await prisma.entity.update({
      where: { id: existing.id },
      data: {
        mentionCount: { increment: 1 },
        // Update confidence as running average
        confidence: (existing.confidence + extracted.confidence) / 2,
      },
    });
    return existing.id;
  }

  // Create new entity
  const newEntity = await prisma.entity.create({
    data: {
      orgId,
      name: extracted.name,
      type: extracted.type,
      normalizedName,
      confidence: extracted.confidence,
      mentionCount: 1,
      documentCount: 1,
    },
  });

  return newEntity.id;
}

/**
 * Create an entity mention record
 */
export async function createEntityMention(
  prisma: PrismaClient,
  entityId: string,
  chunkId: string,
  orgId: string,
  extracted: ExtractedEntity
): Promise<void> {
  await prisma.entityMention.create({
    data: {
      entityId,
      chunkId,
      orgId,
      mentionText: extracted.mentionText,
      contextBefore: extracted.contextBefore ?? "",
      contextAfter: extracted.contextAfter ?? "",
      startOffset: extracted.startOffset,
      endOffset: extracted.endOffset,
      confidence: extracted.confidence,
    },
  });
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export interface ChunkExtractionInput {
  chunkId: string;
  content: string;
  documentId: string;
}

export interface BatchExtractionResult {
  chunksProcessed: number;
  entitiesExtracted: number;
  relationshipsExtracted: number;
  totalLatencyMs: number;
}

/**
 * Process multiple chunks for entity extraction
 */
export async function extractEntitiesFromChunks(
  prisma: PrismaClient,
  orgId: string,
  chunks: ChunkExtractionInput[],
  config?: ExtractionConfig
): Promise<BatchExtractionResult> {
  const startTime = Date.now();
  let entitiesExtracted = 0;
  let relationshipsExtracted = 0;

  for (const chunk of chunks) {
    try {
      const result = await extractEntities(chunk.content, config);

      // Process entities
      for (const entity of result.entities) {
        // Add context
        const contextStart = Math.max(0, entity.startOffset - 50);
        const contextEnd = Math.min(chunk.content.length, entity.endOffset + 50);
        entity.contextBefore = chunk.content.slice(contextStart, entity.startOffset);
        entity.contextAfter = chunk.content.slice(entity.endOffset, contextEnd);

        // Resolve and create mention
        const entityId = await resolveEntity(prisma, orgId, entity);
        await createEntityMention(prisma, entityId, chunk.chunkId, orgId, entity);
        entitiesExtracted++;
      }

      // Process relationships
      for (const rel of result.relationships) {
        await createRelationship(prisma, orgId, rel, chunk.chunkId);
        relationshipsExtracted++;
      }
    } catch (error) {
      console.error(`[EntityExtractor] Error processing chunk ${chunk.chunkId}:`, error);
    }
  }

  return {
    chunksProcessed: chunks.length,
    entitiesExtracted,
    relationshipsExtracted,
    totalLatencyMs: Date.now() - startTime,
  };
}

/**
 * Create a relationship between entities
 */
async function createRelationship(
  prisma: PrismaClient,
  orgId: string,
  rel: ExtractedRelationship,
  chunkId: string
): Promise<void> {
  try {
    // Find source entity
    const sourceEntity = await prisma.entity.findFirst({
      where: {
        orgId,
        normalizedName: rel.sourceEntityName.toLowerCase(),
        type: rel.sourceEntityType,
      },
    });

    // Find target entity
    const targetEntity = await prisma.entity.findFirst({
      where: {
        orgId,
        normalizedName: rel.targetEntityName.toLowerCase(),
        type: rel.targetEntityType,
      },
    });

    if (!sourceEntity || !targetEntity) {
      return; // Skip if entities don't exist
    }

    // Map relationship type
    const relationshipType = mapRelationshipType(rel.relationshipType);

    // Upsert relationship
    await prisma.relationship.upsert({
      where: {
        orgId_sourceEntityId_targetEntityId_type: {
          orgId,
          sourceEntityId: sourceEntity.id,
          targetEntityId: targetEntity.id,
          type: relationshipType,
        },
      },
      update: {
        weight: { increment: 0.1 },
        confidence: rel.confidence,
        evidenceChunkIds: { push: chunkId },
      },
      create: {
        orgId,
        sourceEntityId: sourceEntity.id,
        targetEntityId: targetEntity.id,
        type: relationshipType,
        description: rel.description,
        weight: 0.5,
        confidence: rel.confidence,
        evidenceChunkIds: [chunkId],
      },
    });
  } catch (error) {
    console.error("[EntityExtractor] Error creating relationship:", error);
  }
}

/**
 * Map string relationship type to enum
 */
function mapRelationshipType(
  type: string
): "WORKS_FOR" | "REPORTS_TO" | "COLLABORATES" | "AUTHORED" | "MENTIONED" | "SUBSIDIARY_OF" | "PARTNER_OF" | "COMPETES_WITH" | "DISCUSSES" | "RELATES_TO" | "LOCATED_IN" | "OCCURRED_ON" | "INVOLVES" | "ASSOCIATED" | "OTHER" {
  const normalized = type.toUpperCase().replace(/[^A-Z_]/g, "");
  const validTypes = [
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
  ] as const;

  return validTypes.includes(normalized as typeof validTypes[number])
    ? (normalized as typeof validTypes[number])
    : "RELATES_TO";
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get entity extraction statistics for an organization
 */
export async function getEntityStats(
  prisma: PrismaClient,
  orgId: string
): Promise<{
  totalEntities: number;
  totalMentions: number;
  totalRelationships: number;
  entitiesByType: Record<string, number>;
  topEntities: Array<{ name: string; type: string; mentionCount: number }>;
}> {
  const [entityCount, mentionCount, relationshipCount, entityTypes, topEntities] =
    await Promise.all([
      prisma.entity.count({ where: { orgId } }),
      prisma.entityMention.count({ where: { orgId } }),
      prisma.relationship.count({ where: { orgId } }),
      prisma.entity.groupBy({
        by: ["type"],
        where: { orgId },
        _count: true,
      }),
      prisma.entity.findMany({
        where: { orgId },
        orderBy: { mentionCount: "desc" },
        take: 10,
        select: { name: true, type: true, mentionCount: true },
      }),
    ]);

  const entitiesByType: Record<string, number> = {};
  for (const et of entityTypes) {
    entitiesByType[et.type] = et._count;
  }

  return {
    totalEntities: entityCount,
    totalMentions: mentionCount,
    totalRelationships: relationshipCount,
    entitiesByType,
    topEntities,
  };
}

/**
 * Check if entity extraction is configured
 */
export function isEntityExtractionConfigured(): boolean {
  const config = getConfig();
  return config.provider !== "mock";
}
