/**
 * BullMQ Job Queue Infrastructure
 *
 * Handles background job processing for:
 * - Document indexing
 * - Entity extraction
 * - Batch operations
 */

import { Queue, Worker, QueueEvents, Job, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";

// Queue names
export const QUEUE_NAMES = {
  DOCUMENT_INDEXING: "document-indexing",
  ENTITY_EXTRACTION: "entity-extraction",
  BATCH_OPERATIONS: "batch-operations",
} as const;

// Redis connection configuration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRedisConnection(): any {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  });
}

// Shared connection for all queues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharedConnection: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSharedConnection(): any {
  if (!sharedConnection) {
    sharedConnection = getRedisConnection();
    sharedConnection.on("error", (err: Error) => {
      console.error("[Queue] Redis connection error:", err.message);
    });
  }
  return sharedConnection;
}

// Queue instances
let documentIndexingQueue: Queue | null = null;
let entityExtractionQueue: Queue | null = null;
let batchOperationsQueue: Queue | null = null;

/**
 * Get or create the document indexing queue
 */
export function getDocumentIndexingQueue(): Queue {
  if (!documentIndexingQueue) {
    documentIndexingQueue = new Queue(QUEUE_NAMES.DOCUMENT_INDEXING, {
      connection: getSharedConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });
  }
  return documentIndexingQueue;
}

/**
 * Get or create the entity extraction queue
 */
export function getEntityExtractionQueue(): Queue {
  if (!entityExtractionQueue) {
    entityExtractionQueue = new Queue(QUEUE_NAMES.ENTITY_EXTRACTION, {
      connection: getSharedConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 10000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 500,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    });
  }
  return entityExtractionQueue;
}

/**
 * Get or create the batch operations queue
 */
export function getBatchOperationsQueue(): Queue {
  if (!batchOperationsQueue) {
    batchOperationsQueue = new Queue(QUEUE_NAMES.BATCH_OPERATIONS, {
      connection: getSharedConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    });
  }
  return batchOperationsQueue;
}

// Job data types
export interface DocumentIndexingJobData {
  documentId: string;
  orgId: string;
  priority?: "high" | "normal" | "low";
  enableEntityExtraction?: boolean;
}

export interface EntityExtractionJobData {
  documentId: string;
  orgId: string;
  chunkIds: string[];
}

export interface BatchOperationJobData {
  operationType: "reindex_all" | "extract_entities_all" | "cleanup";
  orgId: string;
  options?: Record<string, unknown>;
}

// Priority mapping
const PRIORITY_MAP = {
  high: 1,
  normal: 5,
  low: 10,
};

/**
 * Add a document indexing job to the queue
 */
export async function addDocumentIndexingJob(
  data: DocumentIndexingJobData
): Promise<Job<DocumentIndexingJobData>> {
  const queue = getDocumentIndexingQueue();
  const priority = PRIORITY_MAP[data.priority || "normal"];

  return queue.add(
    "index-document",
    data,
    {
      priority,
      jobId: `doc-index-${data.documentId}`, // Prevent duplicate jobs
    }
  );
}

/**
 * Add an entity extraction job to the queue
 */
export async function addEntityExtractionJob(
  data: EntityExtractionJobData
): Promise<Job<EntityExtractionJobData>> {
  const queue = getEntityExtractionQueue();

  return queue.add(
    "extract-entities",
    data,
    {
      jobId: `entity-extract-${data.documentId}`,
    }
  );
}

/**
 * Add a batch operation job
 */
export async function addBatchOperationJob(
  data: BatchOperationJobData
): Promise<Job<BatchOperationJobData>> {
  const queue = getBatchOperationsQueue();

  return queue.add(
    data.operationType,
    data,
    {
      priority: 10, // Low priority for batch jobs
    }
  );
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  let queue: Queue;
  switch (queueName) {
    case QUEUE_NAMES.DOCUMENT_INDEXING:
      queue = getDocumentIndexingQueue();
      break;
    case QUEUE_NAMES.ENTITY_EXTRACTION:
      queue = getEntityExtractionQueue();
      break;
    case QUEUE_NAMES.BATCH_OPERATIONS:
      queue = getBatchOperationsQueue();
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats(): Promise<
  Record<string, { waiting: number; active: number; completed: number; failed: number; delayed: number }>
> {
  const [documentIndexing, entityExtraction, batchOperations] = await Promise.all([
    getQueueStats(QUEUE_NAMES.DOCUMENT_INDEXING),
    getQueueStats(QUEUE_NAMES.ENTITY_EXTRACTION),
    getQueueStats(QUEUE_NAMES.BATCH_OPERATIONS),
  ]);

  return {
    [QUEUE_NAMES.DOCUMENT_INDEXING]: documentIndexing,
    [QUEUE_NAMES.ENTITY_EXTRACTION]: entityExtraction,
    [QUEUE_NAMES.BATCH_OPERATIONS]: batchOperations,
  };
}

/**
 * Gracefully close all queue connections
 */
export async function closeQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (documentIndexingQueue) {
    closePromises.push(documentIndexingQueue.close());
  }
  if (entityExtractionQueue) {
    closePromises.push(entityExtractionQueue.close());
  }
  if (batchOperationsQueue) {
    closePromises.push(batchOperationsQueue.close());
  }
  if (sharedConnection) {
    closePromises.push(sharedConnection.quit().then(() => {}));
  }

  await Promise.all(closePromises);

  documentIndexingQueue = null;
  entityExtractionQueue = null;
  batchOperationsQueue = null;
  sharedConnection = null;
}

/**
 * Check if queue system is configured (Redis available)
 */
export function isQueueConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

export { Queue, Worker, QueueEvents, Job };
