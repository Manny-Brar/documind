/**
 * Slack Thread Indexer
 *
 * Processes queued threads and indexes them into DocuMind:
 * 1. Fetches thread messages from Slack API
 * 2. Formats conversation as a document
 * 3. Extracts Slack-specific entities and relationships
 * 4. Creates document chunks with embeddings
 */

import { WebClient } from "@slack/web-api";
import { prisma } from "@documind/db";
import {
  getNextThreadFromQueue,
  getQueueSize,
  type ThreadQueueItem,
} from "./events.js";

// ============================================================================
// Types
// ============================================================================

interface SlackMessage {
  ts: string;
  user?: string;
  bot_id?: string;
  text: string;
  thread_ts?: string;
  reply_count?: number;
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
  files?: Array<{
    id: string;
    name: string;
    mimetype: string;
    url_private: string;
  }>;
}

interface ThreadContent {
  title: string;
  messages: Array<{
    author: string;
    authorId: string;
    timestamp: Date;
    text: string;
    isBot: boolean;
    reactions: Array<{ emoji: string; count: number }>;
  }>;
  participantIds: string[];
  reactionCount: number;
  topicKeywords: string[];
}

interface IndexingResult {
  success: boolean;
  documentId?: string;
  chunkCount?: number;
  entityCount?: number;
  error?: string;
}

// ============================================================================
// Slack API Client
// ============================================================================

/**
 * Get Slack Web API client for a workspace
 */
async function getSlackClient(workspaceId: string): Promise<WebClient | null> {
  const workspace = await prisma.slackWorkspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace || !workspace.accessToken) {
    return null;
  }

  return new WebClient(workspace.accessToken);
}

// ============================================================================
// Thread Fetching
// ============================================================================

/**
 * Fetch all messages in a thread from Slack
 */
async function fetchThreadMessages(
  client: WebClient,
  channelId: string,
  threadTs: string
): Promise<SlackMessage[]> {
  const messages: SlackMessage[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit: 100,
      cursor,
    });

    if (response.messages) {
      messages.push(...(response.messages as SlackMessage[]));
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return messages;
}

/**
 * Fetch user info for display names
 */
async function fetchUserInfo(
  client: WebClient,
  userIds: string[]
): Promise<Map<string, { name: string; realName: string; isBot: boolean }>> {
  const userMap = new Map<string, { name: string; realName: string; isBot: boolean }>();

  for (const userId of userIds) {
    try {
      const response = await client.users.info({ user: userId });
      if (response.user) {
        userMap.set(userId, {
          name: response.user.name || userId,
          realName: response.user.real_name || response.user.name || userId,
          isBot: response.user.is_bot || false,
        });
      }
    } catch (error) {
      // User might be deactivated
      userMap.set(userId, {
        name: userId,
        realName: userId,
        isBot: false,
      });
    }
  }

  return userMap;
}

// ============================================================================
// Content Formatting
// ============================================================================

/**
 * Convert thread messages into indexable content
 */
async function formatThreadContent(
  client: WebClient,
  messages: SlackMessage[]
): Promise<ThreadContent> {
  // Get unique participant IDs
  const participantIds = [...new Set(
    messages
      .filter((m) => m.user)
      .map((m) => m.user!)
  )];

  // Fetch user info
  const userInfo = await fetchUserInfo(client, participantIds);

  // Format messages
  const formattedMessages = messages.map((msg) => {
    const user = msg.user ? userInfo.get(msg.user) : undefined;
    return {
      author: user?.realName || msg.bot_id || "Unknown",
      authorId: msg.user || msg.bot_id || "unknown",
      timestamp: new Date(parseFloat(msg.ts) * 1000),
      text: msg.text,
      isBot: user?.isBot || !!msg.bot_id,
      reactions: (msg.reactions || []).map((r) => ({
        emoji: r.name,
        count: r.count,
      })),
    };
  });

  // Calculate reaction count
  const reactionCount = messages.reduce(
    (sum, msg) =>
      sum + (msg.reactions?.reduce((s, r) => s + r.count, 0) || 0),
    0
  );

  // Generate title from first message
  const firstMessage = messages[0]?.text || "";
  const title = generateThreadTitle(firstMessage);

  // Extract topic keywords (simple extraction)
  const topicKeywords = extractTopicKeywords(
    messages.map((m) => m.text).join(" ")
  );

  return {
    title,
    messages: formattedMessages,
    participantIds,
    reactionCount,
    topicKeywords,
  };
}

/**
 * Generate a title from the first message
 */
function generateThreadTitle(text: string): string {
  // Take first sentence or first 100 chars
  const firstSentence = text.split(/[.!?]/)[0] || text;
  const truncated = firstSentence.slice(0, 100);
  return truncated + (firstSentence.length > 100 ? "..." : "");
}

/**
 * Extract simple topic keywords from text
 */
function extractTopicKeywords(text: string): string[] {
  // Remove Slack formatting, URLs, mentions
  const cleaned = text
    .replace(/<[^>]+>/g, "") // Remove Slack formatting
    .replace(/https?:\/\/\S+/g, "") // Remove URLs
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .toLowerCase();

  // Get word frequency
  const words = cleaned.split(/\s+/).filter((w) => w.length > 3);
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Return top keywords (excluding common words)
  const stopWords = new Set([
    "this", "that", "with", "from", "have", "been", "will", "would",
    "could", "should", "what", "when", "where", "which", "there", "their",
    "they", "them", "then", "than", "some", "just", "also", "more", "very",
  ]);

  return [...freq.entries()]
    .filter(([word]) => !stopWords.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// ============================================================================
// Document Creation
// ============================================================================

/**
 * Format thread as a document for indexing
 */
function formatAsDocument(
  channelName: string,
  content: ThreadContent
): string {
  const lines: string[] = [
    `# Slack Thread: ${content.title}`,
    "",
    `**Channel:** #${channelName}`,
    `**Participants:** ${content.participantIds.length}`,
    `**Messages:** ${content.messages.length}`,
    `**Reactions:** ${content.reactionCount}`,
    `**Topics:** ${content.topicKeywords.join(", ")}`,
    "",
    "---",
    "",
    "## Conversation",
    "",
  ];

  for (const msg of content.messages) {
    const time = msg.timestamp.toISOString().slice(0, 16).replace("T", " ");
    const botTag = msg.isBot ? " [Bot]" : "";
    const reactionStr = msg.reactions.length > 0
      ? ` | Reactions: ${msg.reactions.map((r) => `:${r.emoji}: ${r.count}`).join(", ")}`
      : "";

    lines.push(`### ${msg.author}${botTag} (${time})${reactionStr}`);
    lines.push("");
    lines.push(msg.text);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Create document in database
 */
async function createDocument(
  orgId: string,
  channelConfigId: string,
  threadTs: string,
  channelName: string,
  content: ThreadContent,
  formattedContent: string
): Promise<string> {
  const filename = `slack-thread-${channelName}-${threadTs.replace(".", "-")}.md`;

  const document = await prisma.document.create({
    data: {
      orgId,
      filename,
      fileType: "md",
      fileSizeBytes: BigInt(Buffer.byteLength(formattedContent, "utf-8")),
      mimeType: "text/markdown",
      storageBucket: "slack-threads",
      storagePath: `threads/${orgId}/${channelConfigId}/${threadTs}`,
      source: "slack",
      sourceId: threadTs,
      indexStatus: "pending",
      metadata: {
        slackThread: {
          channelConfigId,
          threadTs,
          participantCount: content.participantIds.length,
          messageCount: content.messages.length,
          reactionCount: content.reactionCount,
          topicKeywords: content.topicKeywords,
        },
      },
    },
  });

  return document.id;
}

// ============================================================================
// Entity Extraction (Slack-specific)
// ============================================================================

/**
 * Extract Slack-specific entities from thread content
 */
async function extractSlackEntities(
  orgId: string,
  documentId: string,
  content: ThreadContent,
  workspaceId: string
): Promise<number> {
  let entityCount = 0;

  // Create SLACK_THREAD entity
  const threadEntity = await prisma.entity.upsert({
    where: {
      orgId_normalizedName_type: {
        orgId,
        normalizedName: content.title.toLowerCase().slice(0, 500),
        type: "SLACK_THREAD",
      },
    },
    create: {
      orgId,
      name: content.title.slice(0, 500),
      normalizedName: content.title.toLowerCase().slice(0, 500),
      type: "SLACK_THREAD",
      confidence: 1.0,
      mentionCount: 1,
      documentCount: 1,
      metadata: {
        participantCount: content.participantIds.length,
        messageCount: content.messages.length,
        reactionCount: content.reactionCount,
      },
    },
    update: {
      mentionCount: { increment: 1 },
    },
  });
  entityCount++;

  // Create SLACK_USER entities for participants
  for (const msg of content.messages) {
    if (msg.isBot) continue; // Skip bots for now

    const userEntity = await prisma.entity.upsert({
      where: {
        orgId_normalizedName_type: {
          orgId,
          normalizedName: msg.author.toLowerCase(),
          type: "SLACK_USER",
        },
      },
      create: {
        orgId,
        name: msg.author,
        normalizedName: msg.author.toLowerCase(),
        type: "SLACK_USER",
        confidence: 1.0,
        mentionCount: 1,
        documentCount: 1,
        metadata: {
          slackUserId: msg.authorId,
          slackWorkspaceId: workspaceId,
        },
      },
      update: {
        mentionCount: { increment: 1 },
      },
    });

    // Create AUTHORED_BY relationship
    await prisma.relationship.upsert({
      where: {
        orgId_sourceEntityId_targetEntityId_type: {
          orgId,
          sourceEntityId: threadEntity.id,
          targetEntityId: userEntity.id,
          type: "AUTHORED_BY",
        },
      },
      create: {
        orgId,
        sourceEntityId: threadEntity.id,
        targetEntityId: userEntity.id,
        type: "AUTHORED_BY",
        weight: 1.0,
        confidence: 1.0,
        evidenceChunkIds: [],
      },
      update: {
        weight: { increment: 0.1 },
      },
    });

    // Create ACTIVE_IN relationship
    await prisma.relationship.upsert({
      where: {
        orgId_sourceEntityId_targetEntityId_type: {
          orgId,
          sourceEntityId: userEntity.id,
          targetEntityId: threadEntity.id,
          type: "ACTIVE_IN",
        },
      },
      create: {
        orgId,
        sourceEntityId: userEntity.id,
        targetEntityId: threadEntity.id,
        type: "ACTIVE_IN",
        weight: 0.5,
        confidence: 1.0,
        evidenceChunkIds: [],
      },
      update: {
        weight: { increment: 0.1 },
      },
    });

    entityCount++;
  }

  // Extract topic entities
  for (const keyword of content.topicKeywords.slice(0, 5)) {
    const topicEntity = await prisma.entity.upsert({
      where: {
        orgId_normalizedName_type: {
          orgId,
          normalizedName: keyword,
          type: "TOPIC",
        },
      },
      create: {
        orgId,
        name: keyword,
        normalizedName: keyword,
        type: "TOPIC",
        confidence: 0.7,
        mentionCount: 1,
        documentCount: 1,
      },
      update: {
        mentionCount: { increment: 1 },
      },
    });

    // Create DISCUSSES relationship
    await prisma.relationship.upsert({
      where: {
        orgId_sourceEntityId_targetEntityId_type: {
          orgId,
          sourceEntityId: threadEntity.id,
          targetEntityId: topicEntity.id,
          type: "DISCUSSES",
        },
      },
      create: {
        orgId,
        sourceEntityId: threadEntity.id,
        targetEntityId: topicEntity.id,
        type: "DISCUSSES",
        weight: 0.5,
        confidence: 0.7,
        evidenceChunkIds: [],
      },
      update: {},
    });

    entityCount++;
  }

  return entityCount;
}

// ============================================================================
// Main Indexing Logic
// ============================================================================

/**
 * Process a single thread from the queue
 */
export async function processThread(item: ThreadQueueItem): Promise<IndexingResult> {
  console.log(`[Thread Indexer] Processing thread ${item.threadTs}`);

  try {
    // Get Slack client
    const client = await getSlackClient(item.workspaceId);
    if (!client) {
      return { success: false, error: "Could not get Slack client" };
    }

    // Get channel config
    const channelConfig = await prisma.slackChannelConfig.findUnique({
      where: { id: item.channelConfigId },
      include: { workspace: { include: { org: true } } },
    });

    if (!channelConfig) {
      return { success: false, error: "Channel config not found" };
    }

    // Update thread status to processing
    await prisma.slackIndexedThread.updateMany({
      where: {
        channelConfigId: item.channelConfigId,
        threadTs: item.threadTs,
      },
      data: { status: "processing" },
    });

    // Fetch thread messages
    const messages = await fetchThreadMessages(client, item.channelId, item.threadTs);

    if (messages.length < channelConfig.minThreadLength) {
      // Thread doesn't meet minimum length - skip
      await prisma.slackIndexedThread.updateMany({
        where: {
          channelConfigId: item.channelConfigId,
          threadTs: item.threadTs,
        },
        data: {
          status: "pending",
          messageCount: messages.length,
        },
      });
      return {
        success: true,
        chunkCount: 0,
        entityCount: 0,
      };
    }

    // Format thread content
    const content = await formatThreadContent(client, messages);
    const formattedContent = formatAsDocument(channelConfig.channelName, content);

    // Create document
    const documentId = await createDocument(
      channelConfig.workspace.orgId,
      item.channelConfigId,
      item.threadTs,
      channelConfig.channelName,
      content,
      formattedContent
    );

    // Extract Slack-specific entities
    const entityCount = await extractSlackEntities(
      channelConfig.workspace.orgId,
      documentId,
      content,
      item.workspaceId
    );

    // Update thread status to indexed
    await prisma.slackIndexedThread.updateMany({
      where: {
        channelConfigId: item.channelConfigId,
        threadTs: item.threadTs,
      },
      data: {
        status: "indexed",
        documentId,
        messageCount: messages.length,
        participantCount: content.participantIds.length,
        participants: content.participantIds,
        title: content.title,
        topicSummary: content.topicKeywords.join(", "),
        lastProcessedAt: new Date(),
      },
    });

    console.log(
      `[Thread Indexer] Indexed thread ${item.threadTs}: ` +
      `${messages.length} messages, ${entityCount} entities`
    );

    return {
      success: true,
      documentId,
      chunkCount: 1, // Will be updated when chunking is implemented
      entityCount,
    };
  } catch (error) {
    console.error(`[Thread Indexer] Error processing thread ${item.threadTs}:`, error);

    // Update thread status to failed
    await prisma.slackIndexedThread.updateMany({
      where: {
        channelConfigId: item.channelConfigId,
        threadTs: item.threadTs,
      },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        lastProcessedAt: new Date(),
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process all threads in the queue (worker loop)
 */
export async function processQueuedThreads(maxItems: number = 10): Promise<number> {
  let processed = 0;

  while (processed < maxItems) {
    const item = getNextThreadFromQueue();
    if (!item) break;

    await processThread(item);
    processed++;

    // Small delay between processing
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return processed;
}

/**
 * Start the indexer worker (runs continuously)
 */
export async function startIndexerWorker(intervalMs: number = 5000): Promise<void> {
  console.log(`[Thread Indexer] Starting worker (interval: ${intervalMs}ms)`);

  const runCycle = async () => {
    const queueSize = getQueueSize();
    if (queueSize > 0) {
      console.log(`[Thread Indexer] Processing queue (${queueSize} items)`);
      const processed = await processQueuedThreads(10);
      console.log(`[Thread Indexer] Processed ${processed} threads`);
    }
  };

  // Run immediately
  await runCycle();

  // Then run on interval
  setInterval(runCycle, intervalMs);
}

// ============================================================================
// Exports
// ============================================================================

export {
  fetchThreadMessages,
  formatThreadContent,
  formatAsDocument,
  extractSlackEntities,
};
export type {
  ThreadContent,
  IndexingResult,
};
