/**
 * Slack Integration Service
 *
 * Handles Slack Bot initialization with Bolt.js
 * Supports Socket Mode (development) and HTTP (production)
 */

import { App, LogLevel } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import type { FastifyInstance } from "fastify";
import { prisma } from "@documind/db";

// ============================================================================
// Configuration
// ============================================================================

export interface SlackConfig {
  botToken: string;
  signingSecret: string;
  appToken?: string;  // Required for Socket Mode
  clientId?: string;
  clientSecret?: string;
  socketMode: boolean;
}

/**
 * Check if Slack is fully configured for operation
 */
export function isSlackConfigured(): boolean {
  return !!(
    process.env.SLACK_BOT_TOKEN &&
    process.env.SLACK_SIGNING_SECRET
  );
}

/**
 * Check if OAuth is configured (for installation flow)
 */
export function isSlackOAuthConfigured(): boolean {
  return !!(
    process.env.SLACK_CLIENT_ID &&
    process.env.SLACK_CLIENT_SECRET
  );
}

/**
 * Check if Socket Mode is configured
 */
export function isSocketModeConfigured(): boolean {
  return !!(
    process.env.SLACK_APP_TOKEN &&
    process.env.SLACK_SOCKET_MODE === "true"
  );
}

/**
 * Get Slack configuration from environment
 */
export function getSlackConfig(): SlackConfig | null {
  if (!isSlackConfigured()) {
    return null;
  }

  return {
    botToken: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    appToken: process.env.SLACK_APP_TOKEN,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    socketMode: process.env.SLACK_SOCKET_MODE === "true",
  };
}

// ============================================================================
// Bolt App Instance
// ============================================================================

let slackApp: App | null = null;

/**
 * Get or create the Slack Bolt app instance
 */
export function getSlackApp(): App | null {
  if (!isSlackConfigured()) {
    return null;
  }

  if (slackApp) {
    return slackApp;
  }

  const config = getSlackConfig()!;
  const logLevel = process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.INFO;

  if (config.socketMode && config.appToken) {
    // Socket Mode for development (recommended)
    slackApp = new App({
      token: config.botToken,
      appToken: config.appToken,
      socketMode: true,
      logLevel,
    });
    console.log("[Slack] Initialized in Socket Mode");
  } else {
    // HTTP mode - use Bolt's built-in HTTP receiver
    // Note: In Bolt v4, we initialize without a custom receiver
    // and handle HTTP routing separately via Fastify
    slackApp = new App({
      token: config.botToken,
      signingSecret: config.signingSecret,
      logLevel,
    });
    console.log("[Slack] Initialized in HTTP Mode (handlers only)");
  }

  return slackApp;
}

// ============================================================================
// Workspace & User Management
// ============================================================================

/**
 * Get workspace by Slack team ID
 */
export async function getWorkspaceByTeamId(teamId: string) {
  return prisma.slackWorkspace.findUnique({
    where: { teamId },
    include: { org: true },
  });
}

/**
 * Get workspace by organization ID
 */
export async function getWorkspaceByOrgId(orgId: string) {
  return prisma.slackWorkspace.findFirst({
    where: { orgId, isActive: true },
  });
}

/**
 * Get or create Slack user mapping
 */
export async function getOrCreateUserMapping(params: {
  slackWorkspaceId: string;
  slackUserId: string;
  slackUsername?: string;
  slackDisplayName?: string;
  slackEmail?: string;
}) {
  return prisma.slackUserMapping.upsert({
    where: {
      slackWorkspaceId_slackUserId: {
        slackWorkspaceId: params.slackWorkspaceId,
        slackUserId: params.slackUserId,
      },
    },
    create: {
      slackWorkspaceId: params.slackWorkspaceId,
      slackUserId: params.slackUserId,
      slackUsername: params.slackUsername,
      slackDisplayName: params.slackDisplayName,
      slackEmail: params.slackEmail,
    },
    update: {
      slackUsername: params.slackUsername,
      slackDisplayName: params.slackDisplayName,
      slackEmail: params.slackEmail,
    },
  });
}

/**
 * Link Slack user to DocuMind user by email
 */
export async function linkUserByEmail(
  slackWorkspaceId: string,
  slackUserId: string,
  email: string
) {
  // Find DocuMind user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  // Update mapping with user ID
  return prisma.slackUserMapping.update({
    where: {
      slackWorkspaceId_slackUserId: {
        slackWorkspaceId,
        slackUserId,
      },
    },
    data: { userId: user.id },
  });
}

// ============================================================================
// Block Kit Formatting Utilities
// ============================================================================

export interface SearchResultBlock {
  answer: string;
  sources: Array<{
    filename: string;
    documentId: string;
    score?: number;
  }>;
  orgSlug?: string;
}

/**
 * Format RAG search result as Slack Block Kit message
 */
export function formatSearchResultBlocks(result: SearchResultBlock): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: result.answer,
      },
    },
  ];

  if (result.sources.length > 0) {
    blocks.push({ type: "divider" });

    const sourcesList = result.sources
      .slice(0, 5)
      .map((s, i) => `${i + 1}. ${s.filename}`)
      .join("\n");

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Sources:*\n${sourcesList}`,
        },
      ],
    });

    // Add view in DocuMind button if we have the org slug
    if (result.orgSlug) {
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View in DocuMind",
              emoji: true,
            },
            url: `${process.env.WEB_URL || "http://localhost:5173"}/${result.orgSlug}/search`,
            action_id: "view_in_documind",
          },
        ],
      });
    }
  }

  return blocks;
}

/**
 * Format error message as Slack Block Kit
 */
export function formatErrorBlocks(message: string, helpText?: string): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:warning: ${message}`,
      },
    },
  ];

  if (helpText) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: helpText,
        },
      ],
    });
  }

  return blocks;
}

/**
 * Format loading/processing message
 */
export function formatLoadingBlocks(query: string): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:hourglass_flowing_sand: Searching for: *${query}*`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "This may take a few seconds...",
        },
      ],
    },
  ];
}

// ============================================================================
// Fastify Integration
// ============================================================================

/**
 * Register Slack HTTP endpoints with Fastify
 * Note: Socket Mode is the recommended approach for events.
 * HTTP mode is primarily for OAuth flow.
 */
export async function registerSlackRoutes(fastify: FastifyInstance) {
  // OAuth install URL
  fastify.get("/slack/install", async (request, reply) => {
    if (!isSlackOAuthConfigured()) {
      return reply.status(503).send({ error: "Slack OAuth not configured" });
    }

    const scopes = [
      "commands",
      "chat:write",
      "users:read",
      "users:read.email",
    ].join(",");

    const redirectUri = `${process.env.API_URL || "http://localhost:3001"}/slack/oauth_redirect`;
    const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return reply.redirect(installUrl);
  });

  console.log("[Slack] HTTP routes registered (OAuth only - use Socket Mode for events)");
}

// ============================================================================
// Lifecycle
// ============================================================================

/**
 * Start the Slack app
 * For Socket Mode: starts WebSocket connection
 * For HTTP Mode: just initializes (routes handled by Fastify)
 */
export async function startSlackApp() {
  const app = getSlackApp();
  if (!app) {
    console.log("[Slack] Not configured, skipping start");
    return false;
  }

  const config = getSlackConfig()!;

  if (config.socketMode) {
    await app.start();
    console.log("[Slack] Socket Mode app started");
  } else {
    console.log("[Slack] HTTP mode - routes registered with Fastify");
  }

  return true;
}

/**
 * Stop the Slack app
 */
export async function stopSlackApp() {
  if (slackApp) {
    await slackApp.stop();
    slackApp = null;
    console.log("[Slack] App stopped");
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export type { App } from "@slack/bolt";

// Handler registration (imported lazily to avoid circular deps)
export { registerSlackHandlers, executeSearch } from "./handlers.js";

// Events API handlers (message indexing pipeline)
export {
  registerSlackEventHandlers,
  getNextThreadFromQueue,
  getQueueSize,
} from "./events.js";

// Thread indexing worker
export {
  processThread,
  processQueuedThreads,
  startIndexerWorker,
} from "./thread-indexer.js";

// Permission-aware search filtering
export {
  getUserChannelPermissions,
  canUserAccessChannel,
  filterDocumentsBySlackPermissions,
  buildSlackSearchContext,
  invalidatePermissionCache,
  type SlackSearchContext,
} from "./permissions.js";

// OAuth flow
export {
  registerSlackOAuthRoutes,
  getInstallUrl,
  disconnectWorkspace,
  revokeWorkspaceToken,
  generateInstallState,
} from "./oauth.js";
