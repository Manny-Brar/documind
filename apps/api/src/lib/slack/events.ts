/**
 * Slack Events API Handlers
 *
 * Handles message events for thread indexing pipeline:
 * - message: Detect new messages and threads to index
 * - message.deleted: Handle message deletions
 * - reaction_added/removed: Track reactions for importance signals
 */

import type { App } from "@slack/bolt";
import { prisma } from "@documind/db";

// Slack event types (based on Slack API spec)
interface MessageEvent {
  type: "message";
  subtype?: string;
  channel: string;
  user?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
  team?: string;
  bot_id?: string;
}

interface ReactionAddedEvent {
  type: "reaction_added";
  user: string;
  reaction: string;
  item: {
    type: "message";
    channel: string;
    ts: string;
  };
  item_user: string;
  event_ts: string;
}

interface ReactionRemovedEvent {
  type: "reaction_removed";
  user: string;
  reaction: string;
  item: {
    type: "message";
    channel: string;
    ts: string;
  };
  item_user: string;
  event_ts: string;
}

import {
  getSlackApp,
  getWorkspaceByTeamId,
  getOrCreateUserMapping,
} from "./index.js";

// ============================================================================
// Types
// ============================================================================

interface SlackMessageInfo {
  teamId: string;
  channelId: string;
  messageTs: string;
  threadTs?: string;
  userId: string;
  text: string;
  isThreadReply: boolean;
  isBot: boolean;
}

interface ThreadQueueItem {
  workspaceId: string;
  channelConfigId: string;
  channelId: string;
  threadTs: string;
  priority: number;
}

// In-memory queue for thread indexing (production would use Redis/PubSub)
const threadQueue: ThreadQueueItem[] = [];

// ============================================================================
// Message Event Handler
// ============================================================================

/**
 * Process incoming message events
 * - Filters for configured channels
 * - Queues threads that meet criteria for indexing
 */
async function handleMessageEvent(event: MessageEvent & { team?: string }): Promise<void> {
  // Skip non-user messages (bots, system messages)
  if (!("user" in event) || !event.user) {
    console.log("[Slack Events] Skipping non-user message");
    return;
  }

  // Skip message edits/deletions (handled separately)
  if ("subtype" in event && event.subtype) {
    console.log(`[Slack Events] Skipping message subtype: ${event.subtype}`);
    return;
  }

  const teamId = event.team;
  if (!teamId) {
    console.log("[Slack Events] No team ID in message event");
    return;
  }

  const messageInfo: SlackMessageInfo = {
    teamId,
    channelId: event.channel,
    messageTs: event.ts,
    threadTs: event.thread_ts,
    userId: event.user,
    text: event.text || "",
    isThreadReply: !!event.thread_ts && event.thread_ts !== event.ts,
    isBot: "bot_id" in event && !!event.bot_id,
  };

  console.log(
    `[Slack Events] Message in ${messageInfo.channelId}: ` +
    `thread=${messageInfo.isThreadReply}, user=${messageInfo.userId}`
  );

  // Look up workspace
  const workspace = await getWorkspaceByTeamId(teamId);
  if (!workspace || !workspace.isActive) {
    console.log("[Slack Events] Workspace not found or inactive");
    return;
  }

  // Check if this channel is configured for indexing
  const channelConfig = await prisma.slackChannelConfig.findUnique({
    where: {
      slackWorkspaceId_channelId: {
        slackWorkspaceId: workspace.id,
        channelId: messageInfo.channelId,
      },
    },
  });

  if (!channelConfig || !channelConfig.isEnabled) {
    // Channel not configured for indexing
    return;
  }

  // Track user mapping (for entity extraction later)
  await getOrCreateUserMapping({
    slackWorkspaceId: workspace.id,
    slackUserId: messageInfo.userId,
  });

  // Determine if this message should trigger thread indexing
  const shouldQueueThread = await shouldIndexThread(
    channelConfig,
    messageInfo
  );

  if (shouldQueueThread) {
    const threadTs = messageInfo.threadTs || messageInfo.messageTs;
    await queueThreadForIndexing(workspace.id, channelConfig.id, messageInfo.channelId, threadTs);
  }
}

/**
 * Determine if a thread should be queued for indexing
 */
async function shouldIndexThread(
  config: {
    id: string;
    indexRepliesOnly: boolean;
    minThreadLength: number;
  },
  message: SlackMessageInfo
): Promise<boolean> {
  // If we only index replies, skip standalone messages
  if (config.indexRepliesOnly && !message.isThreadReply) {
    return false;
  }

  // Check if thread meets minimum length requirement
  const threadTs = message.threadTs || message.messageTs;

  // Check if we already have this thread tracked
  const existingThread = await prisma.slackIndexedThread.findFirst({
    where: {
      channelConfigId: config.id,
      threadTs,
    },
  });

  if (existingThread) {
    // Thread already being tracked, update message count
    await prisma.slackIndexedThread.update({
      where: { id: existingThread.id },
      data: {
        messageCount: { increment: 1 },
        status: existingThread.status === "indexed" ? "pending" : existingThread.status,
      },
    });

    // Re-index if already indexed (content changed)
    return existingThread.status === "indexed";
  }

  // New thread - create tracking record
  await prisma.slackIndexedThread.create({
    data: {
      channelConfigId: config.id,
      threadTs,
      parentMessageTs: message.threadTs || message.messageTs,
      messageCount: 1,
      participantCount: 1,
      participants: [message.userId],
      status: "pending",
    },
  });

  // Check if thread meets minimum length (for new threads, we'll check again later)
  // For now, queue it and let the indexer verify
  return true;
}

/**
 * Queue a thread for indexing
 */
async function queueThreadForIndexing(
  workspaceId: string,
  channelConfigId: string,
  channelId: string,
  threadTs: string
): Promise<void> {
  // Check if already in queue (simple dedup)
  const existing = threadQueue.find(
    (item) =>
      item.channelConfigId === channelConfigId && item.threadTs === threadTs
  );

  if (existing) {
    // Bump priority
    existing.priority++;
    return;
  }

  threadQueue.push({
    workspaceId,
    channelConfigId,
    channelId,
    threadTs,
    priority: 1,
  });

  console.log(`[Slack Events] Queued thread ${threadTs} for indexing`);
}

/**
 * Get next thread from queue for processing
 */
export function getNextThreadFromQueue(): ThreadQueueItem | undefined {
  // Sort by priority (higher first) and pop
  threadQueue.sort((a, b) => b.priority - a.priority);
  return threadQueue.shift();
}

/**
 * Get queue size (for monitoring)
 */
export function getQueueSize(): number {
  return threadQueue.length;
}

// ============================================================================
// Reaction Event Handlers
// ============================================================================

/**
 * Handle reaction_added events
 * Reactions signal importance/consensus - boost thread priority
 */
async function handleReactionAdded(event: ReactionAddedEvent & { team_id?: string }): Promise<void> {
  const teamId = event.team_id;
  if (!teamId) return;

  // Only care about reactions on messages in threads
  if (event.item.type !== "message") return;

  const channelId = event.item.channel;
  const messageTs = event.item.ts;

  const workspace = await getWorkspaceByTeamId(teamId);
  if (!workspace) return;

  // Check if this channel is configured
  const channelConfig = await prisma.slackChannelConfig.findUnique({
    where: {
      slackWorkspaceId_channelId: {
        slackWorkspaceId: workspace.id,
        channelId,
      },
    },
  });

  if (!channelConfig || !channelConfig.isEnabled) return;

  // Find any thread this message is part of
  const thread = await prisma.slackIndexedThread.findFirst({
    where: {
      channelConfigId: channelConfig.id,
      OR: [
        { threadTs: messageTs },
        { parentMessageTs: messageTs },
      ],
    },
  });

  if (thread) {
    // Reactions boost priority for re-indexing (captures consensus)
    console.log(`[Slack Events] Reaction added to tracked thread ${thread.threadTs}`);

    // If already indexed, mark for re-processing to capture reaction context
    if (thread.status === "indexed") {
      await prisma.slackIndexedThread.update({
        where: { id: thread.id },
        data: { status: "pending" },
      });

      await queueThreadForIndexing(
        workspace.id,
        channelConfig.id,
        channelId,
        thread.threadTs
      );
    }
  }
}

/**
 * Handle reaction_removed events
 */
async function handleReactionRemoved(event: ReactionRemovedEvent & { team_id?: string }): Promise<void> {
  // For now, we don't re-index on reaction removal
  // Could implement if needed for accuracy
  console.log("[Slack Events] Reaction removed (no action taken)");
}

// ============================================================================
// Channel Events
// ============================================================================

/**
 * Handle channel_created events
 * Auto-discover new channels (admin can enable/disable)
 */
async function handleChannelCreated(
  channelId: string,
  channelName: string,
  teamId: string
): Promise<void> {
  const workspace = await getWorkspaceByTeamId(teamId);
  if (!workspace) return;

  // Create channel config in disabled state (admin must enable)
  await prisma.slackChannelConfig.upsert({
    where: {
      slackWorkspaceId_channelId: {
        slackWorkspaceId: workspace.id,
        channelId,
      },
    },
    create: {
      slackWorkspaceId: workspace.id,
      channelId,
      channelName,
      channelType: "public",
      isEnabled: false, // Disabled by default
    },
    update: {
      channelName,
    },
  });

  console.log(`[Slack Events] New channel discovered: #${channelName}`);
}

// ============================================================================
// Event Registration
// ============================================================================

/**
 * Register all Slack Events API handlers with the Bolt app
 */
export function registerSlackEventHandlers(): boolean {
  const app = getSlackApp();
  if (!app) {
    console.log("[Slack Events] App not available, skipping event registration");
    return false;
  }

  // Message events (includes all message subtypes)
  app.event("message", async ({ event, context }) => {
    try {
      // Add team_id from context to event
      const messageEvent = {
        ...event,
        team: context.teamId,
      } as MessageEvent & { team: string };

      await handleMessageEvent(messageEvent);
    } catch (error) {
      console.error("[Slack Events] Error handling message event:", error);
    }
  });

  // Reaction events
  app.event("reaction_added", async ({ event, context }) => {
    try {
      await handleReactionAdded({ ...event, team_id: context.teamId });
    } catch (error) {
      console.error("[Slack Events] Error handling reaction_added:", error);
    }
  });

  app.event("reaction_removed", async ({ event, context }) => {
    try {
      await handleReactionRemoved({ ...event, team_id: context.teamId });
    } catch (error) {
      console.error("[Slack Events] Error handling reaction_removed:", error);
    }
  });

  // Channel events
  app.event("channel_created", async ({ event, context }) => {
    try {
      await handleChannelCreated(
        event.channel.id,
        event.channel.name,
        context.teamId || ""
      );
    } catch (error) {
      console.error("[Slack Events] Error handling channel_created:", error);
    }
  });

  // Channel rename
  app.event("channel_rename", async ({ event, context }) => {
    try {
      const workspace = await getWorkspaceByTeamId(context.teamId || "");
      if (!workspace) return;

      await prisma.slackChannelConfig.updateMany({
        where: {
          slackWorkspaceId: workspace.id,
          channelId: event.channel.id,
        },
        data: {
          channelName: event.channel.name,
        },
      });

      console.log(`[Slack Events] Channel renamed: #${event.channel.name}`);
    } catch (error) {
      console.error("[Slack Events] Error handling channel_rename:", error);
    }
  });

  // Member joined channel (for tracking)
  app.event("member_joined_channel", async ({ event, context }) => {
    try {
      const workspace = await getWorkspaceByTeamId(context.teamId || "");
      if (!workspace) return;

      // Track user mapping
      await getOrCreateUserMapping({
        slackWorkspaceId: workspace.id,
        slackUserId: event.user,
      });
    } catch (error) {
      console.error("[Slack Events] Error handling member_joined_channel:", error);
    }
  });

  console.log("[Slack Events] Event handlers registered");
  return true;
}

// ============================================================================
// Exports
// ============================================================================

export {
  handleMessageEvent,
  handleReactionAdded,
  handleReactionRemoved,
  handleChannelCreated,
};
export type { ThreadQueueItem };
