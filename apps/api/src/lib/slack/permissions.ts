/**
 * Slack Permission-Aware Search Filtering
 *
 * Ensures users can only search content from channels they have access to.
 * This prevents information leakage from private channels.
 */

import { WebClient } from "@slack/web-api";
import { prisma } from "@documind/db";

// ============================================================================
// Types
// ============================================================================

interface ChannelAccess {
  channelId: string;
  channelName: string;
  channelType: string;
  hasAccess: boolean;
}

interface UserChannelPermissions {
  slackUserId: string;
  workspaceId: string;
  accessibleChannelIds: string[];
  lastUpdated: Date;
}

// In-memory cache for channel permissions (TTL: 5 minutes)
const permissionCache = new Map<string, { permissions: UserChannelPermissions; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Get Slack client for a workspace
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

/**
 * Get channels a user has access to from Slack API
 */
async function fetchUserChannelAccess(
  client: WebClient,
  slackUserId: string
): Promise<ChannelAccess[]> {
  const accessibleChannels: ChannelAccess[] = [];
  let cursor: string | undefined;

  // Fetch public channels the user is a member of
  do {
    const response = await client.users.conversations({
      user: slackUserId,
      types: "public_channel,private_channel",
      limit: 200,
      cursor,
    });

    if (response.channels) {
      for (const channel of response.channels) {
        accessibleChannels.push({
          channelId: channel.id!,
          channelName: channel.name || "unknown",
          channelType: channel.is_private ? "private" : "public",
          hasAccess: true,
        });
      }
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return accessibleChannels;
}

/**
 * Get user's channel permissions with caching
 */
export async function getUserChannelPermissions(
  workspaceId: string,
  slackUserId: string
): Promise<UserChannelPermissions> {
  const cacheKey = `${workspaceId}:${slackUserId}`;
  const now = Date.now();

  // Check cache
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.permissions;
  }

  // Fetch from Slack API
  const client = await getSlackClient(workspaceId);
  if (!client) {
    // If no client, return empty permissions (no access)
    return {
      slackUserId,
      workspaceId,
      accessibleChannelIds: [],
      lastUpdated: new Date(),
    };
  }

  try {
    const channels = await fetchUserChannelAccess(client, slackUserId);

    const permissions: UserChannelPermissions = {
      slackUserId,
      workspaceId,
      accessibleChannelIds: channels.map((c) => c.channelId),
      lastUpdated: new Date(),
    };

    // Cache the result
    permissionCache.set(cacheKey, {
      permissions,
      expiresAt: now + CACHE_TTL_MS,
    });

    return permissions;
  } catch (error) {
    console.error("[Slack Permissions] Error fetching channel access:", error);
    // Return empty on error (fail secure)
    return {
      slackUserId,
      workspaceId,
      accessibleChannelIds: [],
      lastUpdated: new Date(),
    };
  }
}

/**
 * Check if a user can access a specific channel
 */
export async function canUserAccessChannel(
  workspaceId: string,
  slackUserId: string,
  channelId: string
): Promise<boolean> {
  const permissions = await getUserChannelPermissions(workspaceId, slackUserId);
  return permissions.accessibleChannelIds.includes(channelId);
}

/**
 * Invalidate permission cache for a user (call on channel join/leave events)
 */
export function invalidatePermissionCache(workspaceId: string, slackUserId: string): void {
  const cacheKey = `${workspaceId}:${slackUserId}`;
  permissionCache.delete(cacheKey);
}

/**
 * Clear all permission cache (useful for testing)
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
}

// ============================================================================
// Search Filtering
// ============================================================================

/**
 * Filter document IDs based on Slack channel permissions
 *
 * This is called during search to filter out documents from channels
 * the user doesn't have access to.
 */
export async function filterDocumentsBySlackPermissions(
  documentIds: string[],
  orgId: string,
  slackUserId?: string,
  workspaceId?: string
): Promise<string[]> {
  // If no Slack context, allow all documents (regular search)
  if (!slackUserId || !workspaceId) {
    return documentIds;
  }

  // Get user's accessible channels
  const permissions = await getUserChannelPermissions(workspaceId, slackUserId);

  // Get the channel configs for this workspace
  const channelConfigs = await prisma.slackChannelConfig.findMany({
    where: {
      slackWorkspaceId: workspaceId,
      channelId: { in: permissions.accessibleChannelIds },
    },
    select: {
      id: true,
      channelId: true,
    },
  });

  const accessibleConfigIds = new Set(channelConfigs.map((c) => c.id));

  // Get Slack-indexed documents and filter by accessible channels
  const slackDocuments = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      source: "slack",
    },
    select: {
      id: true,
      metadata: true,
    },
  });

  const filteredDocumentIds = new Set<string>();

  for (const doc of slackDocuments) {
    const metadata = doc.metadata as Record<string, unknown>;
    const slackThread = metadata?.slackThread as Record<string, unknown> | undefined;
    const channelConfigId = slackThread?.channelConfigId as string | undefined;

    // If we can't determine the channel, exclude it (fail secure)
    if (!channelConfigId) {
      continue;
    }

    // Check if user has access to this channel
    if (accessibleConfigIds.has(channelConfigId)) {
      filteredDocumentIds.add(doc.id);
    }
  }

  // Get non-Slack documents (always accessible)
  const nonSlackDocuments = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      source: { not: "slack" },
    },
    select: { id: true },
  });

  // Combine accessible Slack docs with non-Slack docs
  for (const doc of nonSlackDocuments) {
    filteredDocumentIds.add(doc.id);
  }

  return documentIds.filter((id) => filteredDocumentIds.has(id));
}

/**
 * Get Slack user ID from DocuMind user (for permission checking)
 */
export async function getSlackUserIdForUser(
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const mapping = await prisma.slackUserMapping.findFirst({
    where: {
      userId,
      slackWorkspaceId: workspaceId,
    },
  });

  return mapping?.slackUserId || null;
}

/**
 * Context for permission-aware search
 */
export interface SlackSearchContext {
  workspaceId: string;
  slackUserId: string;
}

/**
 * Build Slack search context from DocuMind user
 */
export async function buildSlackSearchContext(
  userId: string,
  orgId: string
): Promise<SlackSearchContext | null> {
  // Get workspace for this org
  const workspace = await prisma.slackWorkspace.findFirst({
    where: {
      orgId,
      isActive: true,
    },
  });

  if (!workspace) {
    return null;
  }

  // Get Slack user ID for this user
  const slackUserId = await getSlackUserIdForUser(userId, workspace.id);
  if (!slackUserId) {
    return null;
  }

  return {
    workspaceId: workspace.id,
    slackUserId,
  };
}

// ============================================================================
// Exports
// ============================================================================

export type {
  ChannelAccess,
  UserChannelPermissions,
};
