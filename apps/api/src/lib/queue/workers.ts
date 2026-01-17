/**
 * BullMQ Workers for Background Job Processing
 *
 * Processes:
 * - Document indexing jobs
 * - Entity extraction jobs
 * - Batch operation jobs
 */

import { Worker, Job } from "bullmq";
import { prisma } from "@documind/db";
import {
  QUEUE_NAMES,
  getSharedConnection,
  type DocumentIndexingJobData,
  type EntityExtractionJobData,
  type BatchOperationJobData,
} from "./index.js";
import { indexDocument, processPendingDocuments } from "../indexer.js";
import {
  extractEntitiesFromChunks,
  type ChunkExtractionInput,
} from "../entity-extractor.js";

// Active workers
let documentIndexingWorker: Worker | null = null;
let entityExtractionWorker: Worker | null = null;
let batchOperationsWorker: Worker | null = null;

/**
 * Process a document indexing job
 */
async function processDocumentIndexingJob(
  job: Job<DocumentIndexingJobData>
): Promise<{
  success: boolean;
  chunksCreated: number;
  entitiesExtracted: number;
  error?: string;
}> {
  const { documentId, orgId, enableEntityExtraction = true } = job.data;

  console.log(`[Worker] Processing document indexing job: ${documentId}`);

  try {
    const result = await indexDocument(prisma, documentId, {
      enableEntityExtraction,
    });

    if (!result.success) {
      throw new Error(result.error || "Indexing failed");
    }

    console.log(
      `[Worker] Completed indexing ${documentId}: ${result.chunksCreated} chunks, ${result.entitiesExtracted} entities`
    );

    return {
      success: true,
      chunksCreated: result.chunksCreated,
      entitiesExtracted: result.entitiesExtracted,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Worker] Error indexing document ${documentId}:`, errorMessage);

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        indexStatus: "failed",
        indexError: errorMessage,
      },
    });

    throw error;
  }
}

/**
 * Process an entity extraction job
 */
async function processEntityExtractionJob(
  job: Job<EntityExtractionJobData>
): Promise<{
  success: boolean;
  entitiesExtracted: number;
  relationshipsExtracted: number;
  error?: string;
}> {
  const { documentId, orgId, chunkIds } = job.data;

  console.log(`[Worker] Processing entity extraction job for document: ${documentId}`);

  try {
    // Get chunk content
    const chunks = await prisma.$queryRaw<
      Array<{ id: string; content: string }>
    >`
      SELECT id, content
      FROM document_chunks
      WHERE id = ANY(${chunkIds}::uuid[])
      AND org_id = ${orgId}::uuid
    `;

    if (chunks.length === 0) {
      return {
        success: true,
        entitiesExtracted: 0,
        relationshipsExtracted: 0,
      };
    }

    // Prepare input for entity extraction
    const chunkInputs: ChunkExtractionInput[] = chunks.map((c: { id: string; content: string }) => ({
      chunkId: c.id,
      content: c.content,
      documentId,
    }));

    // Extract entities
    const result = await extractEntitiesFromChunks(prisma, orgId, chunkInputs);

    console.log(
      `[Worker] Extracted ${result.entitiesExtracted} entities, ${result.relationshipsExtracted} relationships for ${documentId}`
    );

    return {
      success: true,
      entitiesExtracted: result.entitiesExtracted,
      relationshipsExtracted: result.relationshipsExtracted,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Worker] Error extracting entities for ${documentId}:`, errorMessage);
    throw error;
  }
}

/**
 * Process a batch operation job
 */
async function processBatchOperationJob(
  job: Job<BatchOperationJobData>
): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  error?: string;
}> {
  const { operationType, orgId, options } = job.data;

  console.log(`[Worker] Processing batch operation: ${operationType} for org ${orgId}`);

  try {
    switch (operationType) {
      case "reindex_all": {
        // Reset all documents to pending
        await prisma.document.updateMany({
          where: { orgId, deletedAt: null },
          data: { indexStatus: "pending", indexError: null },
        });

        // Process pending documents in batches
        let totalProcessed = 0;
        let totalFailed = 0;
        let hasMore = true;

        while (hasMore) {
          const results = await processPendingDocuments(prisma, 5);
          totalProcessed += results.filter((r) => r.success).length;
          totalFailed += results.filter((r) => !r.success).length;
          hasMore = results.length === 5;

          // Update job progress
          await job.updateProgress({
            processed: totalProcessed,
            failed: totalFailed,
          });
        }

        return {
          success: true,
          processed: totalProcessed,
          failed: totalFailed,
        };
      }

      case "extract_entities_all": {
        // Get all indexed documents
        const documents = await prisma.document.findMany({
          where: {
            orgId,
            indexStatus: "indexed",
            deletedAt: null,
          },
          select: { id: true },
        });

        let processed = 0;
        let failed = 0;

        for (const doc of documents) {
          try {
            // Get chunks for this document
            const chunks = await prisma.$queryRaw<
              Array<{ id: string; content: string }>
            >`
              SELECT id, content FROM document_chunks WHERE document_id = ${doc.id}::uuid
            `;

            const chunkInputs: ChunkExtractionInput[] = chunks.map((c: { id: string; content: string }) => ({
              chunkId: c.id,
              content: c.content,
              documentId: doc.id,
            }));

            await extractEntitiesFromChunks(prisma, orgId, chunkInputs);
            processed++;
          } catch (e) {
            console.error(`[Worker] Failed entity extraction for ${doc.id}:`, e);
            failed++;
          }

          await job.updateProgress({ processed, failed, total: documents.length });
        }

        return {
          success: true,
          processed,
          failed,
        };
      }

      case "cleanup": {
        // Delete old chunks for deleted documents
        const result = await prisma.$executeRaw`
          DELETE FROM document_chunks
          WHERE document_id IN (
            SELECT id FROM documents WHERE deleted_at IS NOT NULL
          )
        `;

        // Delete orphaned entities (no mentions)
        const entityResult = await prisma.$executeRaw`
          DELETE FROM entities
          WHERE mention_count = 0
          AND org_id = ${orgId}::uuid
        `;

        return {
          success: true,
          processed: Number(result) + Number(entityResult),
          failed: 0,
        };
      }

      default:
        throw new Error(`Unknown operation type: ${operationType}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Worker] Error processing batch operation ${operationType}:`, errorMessage);
    throw error;
  }
}

/**
 * Start all workers
 */
export function startWorkers(concurrency: number = 3): void {
  const connection = getSharedConnection();

  // Document indexing worker
  documentIndexingWorker = new Worker(
    QUEUE_NAMES.DOCUMENT_INDEXING,
    processDocumentIndexingJob,
    {
      connection,
      concurrency,
      limiter: {
        max: 5,
        duration: 60000, // 5 jobs per minute max
      },
    }
  );

  documentIndexingWorker.on("completed", (job, result) => {
    console.log(`[Worker] Document indexing completed: ${job.id}`, result);
  });

  documentIndexingWorker.on("failed", (job, error) => {
    console.error(`[Worker] Document indexing failed: ${job?.id}`, error.message);
  });

  // Entity extraction worker
  entityExtractionWorker = new Worker(
    QUEUE_NAMES.ENTITY_EXTRACTION,
    processEntityExtractionJob,
    {
      connection,
      concurrency: 2, // Lower concurrency for LLM calls
      limiter: {
        max: 10,
        duration: 60000, // 10 jobs per minute max
      },
    }
  );

  entityExtractionWorker.on("completed", (job, result) => {
    console.log(`[Worker] Entity extraction completed: ${job.id}`, result);
  });

  entityExtractionWorker.on("failed", (job, error) => {
    console.error(`[Worker] Entity extraction failed: ${job?.id}`, error.message);
  });

  // Batch operations worker
  batchOperationsWorker = new Worker(
    QUEUE_NAMES.BATCH_OPERATIONS,
    processBatchOperationJob,
    {
      connection,
      concurrency: 1, // Only one batch job at a time
    }
  );

  batchOperationsWorker.on("completed", (job, result) => {
    console.log(`[Worker] Batch operation completed: ${job.id}`, result);
  });

  batchOperationsWorker.on("failed", (job, error) => {
    console.error(`[Worker] Batch operation failed: ${job?.id}`, error.message);
  });

  console.log("[Worker] All workers started");
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (documentIndexingWorker) {
    closePromises.push(documentIndexingWorker.close());
  }
  if (entityExtractionWorker) {
    closePromises.push(entityExtractionWorker.close());
  }
  if (batchOperationsWorker) {
    closePromises.push(batchOperationsWorker.close());
  }

  await Promise.all(closePromises);

  documentIndexingWorker = null;
  entityExtractionWorker = null;
  batchOperationsWorker = null;

  console.log("[Worker] All workers stopped");
}

/**
 * Check if workers are running
 */
export function areWorkersRunning(): boolean {
  return !!(documentIndexingWorker && entityExtractionWorker && batchOperationsWorker);
}
