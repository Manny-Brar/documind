/**
 * Document indexing processor
 *
 * Orchestrates the full indexing pipeline:
 * 1. Download document from storage
 * 2. Extract text content
 * 3. Split into chunks
 * 4. Generate embeddings
 * 5. Store chunks in database
 * 6. Update document status
 *
 * Note: Requires DocumentChunk model in database.
 *   Run: pnpm prisma migrate dev
 */

import type { PrismaClient } from "@documind/db";
import { downloadFile } from "./storage.js";
import { extractText, type FileType } from "./text-extractor.js";
import { chunkText, mergeSmallChunks, type Chunk } from "./chunker.js";
import { generateBatchEmbeddings, isEmbeddingConfigured } from "./embeddings.js";

export interface IndexingOptions {
  /** Chunk size in characters */
  chunkSize?: number;
  /** Overlap between chunks */
  chunkOverlap?: number;
  /** Batch size for embedding generation */
  embeddingBatchSize?: number;
  /** Minimum chunk size (smaller chunks are merged) */
  minChunkSize?: number;
}

export interface IndexingResult {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  totalTokens: number;
  extractionTime: number;
  embeddingTime: number;
  totalTime: number;
  error?: string;
}

interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

const DEFAULT_OPTIONS: IndexingOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingBatchSize: 20,
  minChunkSize: 100,
};

/**
 * Index a single document
 */
export async function indexDocument(
  prisma: PrismaClient,
  documentId: string,
  options: IndexingOptions = {}
): Promise<IndexingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let extractionTime = 0;
  let embeddingTime = 0;

  try {
    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        orgId: true,
        fileType: true,
        storagePath: true,
        indexStatus: true,
      },
    });

    if (!document) {
      return {
        success: false,
        documentId,
        chunksCreated: 0,
        totalTokens: 0,
        extractionTime: 0,
        embeddingTime: 0,
        totalTime: Date.now() - startTime,
        error: "Document not found",
      };
    }

    if (!document.storagePath) {
      return {
        success: false,
        documentId,
        chunksCreated: 0,
        totalTokens: 0,
        extractionTime: 0,
        embeddingTime: 0,
        totalTime: Date.now() - startTime,
        error: "Document has no storage path",
      };
    }

    // Update status to processing
    await prisma.document.update({
      where: { id: documentId },
      data: { indexStatus: "processing" },
    });

    // Step 1: Download file from storage
    console.log(`[Indexer] Downloading document ${documentId}...`);
    const fileBuffer = await downloadFile(document.storagePath);

    if (!fileBuffer) {
      throw new Error("Failed to download file from storage");
    }

    // Step 2: Extract text
    console.log(`[Indexer] Extracting text from ${document.fileType}...`);
    const extractionStart = Date.now();
    const extraction = await extractText(fileBuffer, document.fileType as FileType);
    extractionTime = Date.now() - extractionStart;

    if (!extraction.text || extraction.text.trim().length === 0) {
      throw new Error("No text content extracted from document");
    }

    // Step 3: Chunk text
    console.log(`[Indexer] Chunking text (${extraction.text.length} chars)...`);
    let chunks = chunkText(extraction.text, {
      chunkSize: opts.chunkSize,
      chunkOverlap: opts.chunkOverlap,
    });

    // Merge small chunks
    chunks = mergeSmallChunks(chunks, opts.minChunkSize);

    if (chunks.length === 0) {
      throw new Error("No chunks generated from document");
    }

    console.log(`[Indexer] Generated ${chunks.length} chunks`);

    // Step 4: Generate embeddings in batches
    console.log(`[Indexer] Generating embeddings...`);
    const embeddingStart = Date.now();
    const chunksWithEmbeddings = await generateChunkEmbeddings(
      chunks,
      opts.embeddingBatchSize ?? 20
    );
    embeddingTime = Date.now() - embeddingStart;

    // Step 5: Store chunks in database
    console.log(`[Indexer] Storing ${chunksWithEmbeddings.length} chunks...`);
    await storeChunks(prisma, document.id, document.orgId, chunksWithEmbeddings);

    // Step 6: Update document status
    const totalTokens = chunksWithEmbeddings.reduce((sum, c) => sum + c.tokenCount, 0);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        indexStatus: "indexed",
        indexedAt: new Date(),
        pageCount: extraction.pageCount,
        metadata: {
          chunksCount: chunksWithEmbeddings.length,
          totalTokens,
          extractedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`[Indexer] Document ${documentId} indexed successfully`);

    return {
      success: true,
      documentId,
      chunksCreated: chunksWithEmbeddings.length,
      totalTokens,
      extractionTime,
      embeddingTime,
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Indexer] Error indexing document ${documentId}:`, errorMessage);

    // Update document with error status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        indexStatus: "failed",
        indexError: errorMessage,
      },
    });

    return {
      success: false,
      documentId,
      chunksCreated: 0,
      totalTokens: 0,
      extractionTime,
      embeddingTime,
      totalTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Generate embeddings for chunks in batches
 */
async function generateChunkEmbeddings(
  chunks: Chunk[],
  batchSize: number
): Promise<ChunkWithEmbedding[]> {
  const results: ChunkWithEmbedding[] = [];

  // Process in batches
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.content);

    const embeddingsResult = await generateBatchEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embeddingData = embeddingsResult.embeddings[j];
      if (chunk && embeddingData) {
        results.push({
          content: chunk.content,
          index: chunk.index,
          tokenCount: embeddingData.tokenCount,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          metadata: chunk.metadata,
          embedding: embeddingData.embedding,
        });
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Store chunks in database using raw SQL
 * This approach works even before the Prisma migration is fully integrated
 */
async function storeChunks(
  prisma: PrismaClient,
  documentId: string,
  orgId: string,
  chunks: ChunkWithEmbedding[]
): Promise<void> {
  // Delete existing chunks for this document using raw SQL
  await prisma.$executeRaw`
    DELETE FROM document_chunks WHERE document_id = ${documentId}::uuid
  `;

  // Insert new chunks using raw SQL
  for (const chunk of chunks) {
    await prisma.$executeRaw`
      INSERT INTO document_chunks (
        id, document_id, org_id, content, chunk_index, token_count,
        start_offset, end_offset, page_number, embedding, metadata,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${documentId}::uuid,
        ${orgId}::uuid,
        ${chunk.content},
        ${chunk.index},
        ${chunk.tokenCount},
        ${chunk.startOffset},
        ${chunk.endOffset},
        ${(chunk.metadata?.pageNumber as number | null) ?? null},
        ${JSON.stringify(chunk.embedding)}::jsonb,
        ${JSON.stringify(chunk.metadata ?? {})}::jsonb,
        NOW(),
        NOW()
      )
    `;
  }
}

/**
 * Process pending documents in the queue
 */
export async function processPendingDocuments(
  prisma: PrismaClient,
  limit: number = 10
): Promise<IndexingResult[]> {
  // Get pending documents
  const pendingDocs = await prisma.document.findMany({
    where: {
      indexStatus: "pending",
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  if (pendingDocs.length === 0) {
    return [];
  }

  console.log(`[Indexer] Processing ${pendingDocs.length} pending documents...`);

  const results: IndexingResult[] = [];

  for (const doc of pendingDocs) {
    const result = await indexDocument(prisma, doc.id);
    results.push(result);
  }

  const successful = results.filter((r) => r.success).length;
  console.log(`[Indexer] Completed: ${successful}/${results.length} successful`);

  return results;
}

/**
 * Re-index a document (delete existing chunks and re-process)
 */
export async function reindexDocument(
  prisma: PrismaClient,
  documentId: string,
  options: IndexingOptions = {}
): Promise<IndexingResult> {
  // Reset document status
  await prisma.document.update({
    where: { id: documentId },
    data: {
      indexStatus: "pending",
      indexError: null,
      indexedAt: null,
    },
  });

  return indexDocument(prisma, documentId, options);
}

/**
 * Get indexing statistics for an organization
 */
export async function getIndexingStats(
  prisma: PrismaClient,
  orgId: string
): Promise<{
  totalDocuments: number;
  indexed: number;
  pending: number;
  processing: number;
  failed: number;
  totalChunks: number;
  embeddingConfigured: boolean;
}> {
  // Get document counts by status
  const docCounts = await prisma.document.groupBy({
    by: ["indexStatus"],
    where: { orgId, deletedAt: null },
    _count: true,
  });

  // Get chunk count using raw SQL (works before migration)
  let chunkCount = 0;
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM document_chunks WHERE org_id = ${orgId}::uuid
    `;
    chunkCount = Number(result[0]?.count ?? 0);
  } catch {
    // Table might not exist yet
    chunkCount = 0;
  }

  const statusMap = new Map<string, number>();
  for (const d of docCounts) {
    statusMap.set(d.indexStatus, d._count);
  }

  const totalDocuments = Array.from(statusMap.values()).reduce((a, b) => a + b, 0);

  return {
    totalDocuments,
    indexed: statusMap.get("indexed") ?? 0,
    pending: statusMap.get("pending") ?? 0,
    processing: statusMap.get("processing") ?? 0,
    failed: statusMap.get("failed") ?? 0,
    totalChunks: chunkCount,
    embeddingConfigured: isEmbeddingConfigured(),
  };
}
