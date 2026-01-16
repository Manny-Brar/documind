/**
 * Vector search for semantic document retrieval
 *
 * Uses embeddings to find semantically similar document chunks
 * and returns ranked results with relevance scores.
 */

import type { PrismaClient } from "@documind/db";
import { generateEmbedding, cosineSimilarity } from "./embeddings.js";

export interface SearchResult {
  documentId: string;
  filename: string;
  fileType: string;
  snippet: string;
  score: number;
  pageNumber?: number;
  chunkIndex?: number;
}

export interface SearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity score (0-1) */
  minScore?: number;
  /** Include chunks from documents with these statuses only */
  indexStatus?: string[];
}

const DEFAULT_OPTIONS: SearchOptions = {
  limit: 10,
  minScore: 0.3,
  indexStatus: ["indexed"],
};

/**
 * Search documents using vector similarity
 */
export async function searchDocuments(
  prisma: PrismaClient,
  orgId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Get all chunks for the organization
  // Note: In production, use pgvector for efficient similarity search
  const chunks = await getChunksForOrg(prisma, orgId, opts.indexStatus ?? ["indexed"]);

  if (chunks.length === 0) {
    return [];
  }

  // Calculate similarity scores
  const scoredChunks = chunks.map((chunk) => {
    const embedding = parseEmbedding(chunk.embedding);
    const score = embedding ? cosineSimilarity(queryEmbedding.embedding, embedding) : 0;

    return {
      ...chunk,
      score,
    };
  });

  // Filter by minimum score and sort by similarity
  const filteredChunks = scoredChunks
    .filter((chunk) => chunk.score >= (opts.minScore ?? 0.3))
    .sort((a, b) => b.score - a.score);

  // Deduplicate by document (keep highest scoring chunk per document)
  const documentMap = new Map<string, typeof filteredChunks[0]>();

  for (const chunk of filteredChunks) {
    const existing = documentMap.get(chunk.documentId);
    if (!existing || chunk.score > existing.score) {
      documentMap.set(chunk.documentId, chunk);
    }
  }

  // Get document details and build results
  const documentIds = Array.from(documentMap.keys()).slice(0, opts.limit ?? 10);

  const documents = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      deletedAt: null,
    },
    select: {
      id: true,
      filename: true,
      fileType: true,
    },
  });

  const documentInfo = new Map(documents.map((d) => [d.id, d]));

  const results: SearchResult[] = [];

  for (const docId of documentIds) {
    const chunk = documentMap.get(docId);
    const doc = documentInfo.get(docId);

    if (chunk && doc) {
      results.push({
        documentId: doc.id,
        filename: doc.filename,
        fileType: doc.fileType,
        snippet: createSnippet(chunk.content, query),
        score: chunk.score,
        pageNumber: chunk.pageNumber ?? undefined,
        chunkIndex: chunk.chunkIndex,
      });
    }
  }

  return results;
}

/**
 * Get all chunks for an organization
 * Note: This is a simple implementation. For production, use pgvector.
 */
async function getChunksForOrg(
  prisma: PrismaClient,
  orgId: string,
  indexStatuses: string[]
): Promise<
  Array<{
    documentId: string;
    content: string;
    chunkIndex: number;
    pageNumber: number | null;
    embedding: unknown;
  }>
> {
  try {
    // Use raw SQL to query chunks (works before Prisma migration)
    const chunks = await prisma.$queryRaw<
      Array<{
        document_id: string;
        content: string;
        chunk_index: number;
        page_number: number | null;
        embedding: unknown;
      }>
    >`
      SELECT
        dc.document_id,
        dc.content,
        dc.chunk_index,
        dc.page_number,
        dc.embedding
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE dc.org_id = ${orgId}::uuid
      AND d.index_status = ANY(${indexStatuses}::text[])
      AND d.deleted_at IS NULL
    `;

    return chunks.map((c) => ({
      documentId: c.document_id,
      content: c.content,
      chunkIndex: c.chunk_index,
      pageNumber: c.page_number,
      embedding: c.embedding,
    }));
  } catch (error) {
    // Table might not exist yet
    console.warn("[VectorSearch] Could not query chunks:", error);
    return [];
  }
}

/**
 * Parse embedding from database (stored as JSON)
 */
function parseEmbedding(embedding: unknown): number[] | null {
  if (!embedding) return null;

  if (Array.isArray(embedding)) {
    return embedding as number[];
  }

  if (typeof embedding === "string") {
    try {
      return JSON.parse(embedding) as number[];
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Create a search result snippet highlighting relevant parts
 */
function createSnippet(content: string, query: string, maxLength: number = 200): string {
  const lowerContent = content.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  // Find the best starting position (where query words appear)
  let bestStart = 0;
  let bestScore = 0;

  for (let i = 0; i < content.length - maxLength; i += 50) {
    const window = lowerContent.slice(i, i + maxLength);
    let score = 0;

    for (const word of queryWords) {
      if (window.includes(word)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  // Extract snippet
  let snippet = content.slice(bestStart, bestStart + maxLength);

  // Clean up snippet boundaries
  if (bestStart > 0) {
    // Start at word boundary
    const firstSpace = snippet.indexOf(" ");
    if (firstSpace > 0 && firstSpace < 20) {
      snippet = "..." + snippet.slice(firstSpace + 1);
    } else {
      snippet = "..." + snippet;
    }
  }

  if (bestStart + maxLength < content.length) {
    // End at word boundary
    const lastSpace = snippet.lastIndexOf(" ");
    if (lastSpace > maxLength - 30) {
      snippet = snippet.slice(0, lastSpace) + "...";
    } else {
      snippet = snippet + "...";
    }
  }

  return snippet.trim();
}

/**
 * Search with keyword fallback when no indexed chunks exist
 */
export async function searchWithFallback(
  prisma: PrismaClient,
  orgId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  // Try vector search first
  const vectorResults = await searchDocuments(prisma, orgId, query, options);

  if (vectorResults.length > 0) {
    return vectorResults;
  }

  // Fallback to filename search
  const documents = await prisma.document.findMany({
    where: {
      orgId,
      deletedAt: null,
      OR: [
        { filename: { contains: query, mode: "insensitive" } },
      ],
    },
    take: options.limit ?? 10,
    select: {
      id: true,
      filename: true,
      fileType: true,
    },
  });

  return documents.map((doc, index) => ({
    documentId: doc.id,
    filename: doc.filename,
    fileType: doc.fileType,
    snippet: `Matching filename: ${doc.filename}`,
    score: 0.5 - index * 0.05, // Decreasing scores for fallback
  }));
}
