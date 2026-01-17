/**
 * Slack OAuth Installation Flow
 *
 * Handles OAuth installation and workspace connection to DocuMind organizations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@documind/db";
import { isSlackOAuthConfigured } from "./index.js";

// ============================================================================
// Configuration
// ============================================================================

interface SlackOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

function getOAuthConfig(): SlackOAuthConfig | null {
  if (!isSlackOAuthConfigured()) {
    return null;
  }

  const apiUrl = process.env.API_URL || "http://localhost:3001";

  return {
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    redirectUri: `${apiUrl}/slack/oauth_redirect`,
    scopes: [
      "commands",           // Slash commands
      "chat:write",         // Send messages
      "users:read",         // Get user info
      "users:read.email",   // Get user email for matching
      "app_mentions:read",  // Read @mentions
    ],
  };
}

// ============================================================================
// OAuth Token Exchange
// ============================================================================

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
  };
  incoming_webhook?: {
    channel?: string;
    channel_id?: string;
    configuration_url?: string;
    url?: string;
  };
}

/**
 * Exchange OAuth code for access token
 */
async function exchangeCodeForToken(
  code: string,
  config: SlackOAuthConfig
): Promise<SlackOAuthResponse> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  return response.json() as Promise<SlackOAuthResponse>;
}

// ============================================================================
// Installation State Management
// ============================================================================

// In-memory store for OAuth state (use Redis in production)
const pendingInstallations = new Map<
  string,
  {
    orgId: string;
    userId: string;
    expiresAt: number;
  }
>();

/**
 * Generate OAuth state parameter with org context
 */
export function generateInstallState(orgId: string, userId: string): string {
  const state = `${orgId}:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  // Store state for validation (expires in 10 minutes)
  pendingInstallations.set(state, {
    orgId,
    userId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Clean up expired states
  for (const [key, value] of pendingInstallations.entries()) {
    if (value.expiresAt < Date.now()) {
      pendingInstallations.delete(key);
    }
  }

  return state;
}

/**
 * Validate and consume OAuth state
 */
function validateInstallState(
  state: string
): { orgId: string; userId: string } | null {
  const pending = pendingInstallations.get(state);

  if (!pending) {
    return null;
  }

  if (pending.expiresAt < Date.now()) {
    pendingInstallations.delete(state);
    return null;
  }

  // Consume the state (one-time use)
  pendingInstallations.delete(state);

  return {
    orgId: pending.orgId,
    userId: pending.userId,
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Start OAuth installation flow
 * GET /slack/install?orgId=xxx
 */
async function handleInstallStart(
  request: FastifyRequest<{ Querystring: { orgId?: string; state?: string } }>,
  reply: FastifyReply
) {
  const config = getOAuthConfig();
  if (!config) {
    return reply.status(503).send({
      error: "Slack OAuth not configured",
      message: "SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be set",
    });
  }

  // Use provided state or generate error
  const state = request.query.state;
  if (!state) {
    return reply.status(400).send({
      error: "Missing state parameter",
      message: "Installation must be initiated from DocuMind settings page",
    });
  }

  // Build authorization URL
  const authUrl = new URL("https://slack.com/oauth/v2/authorize");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("scope", config.scopes.join(","));
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("state", state);

  return reply.redirect(authUrl.toString());
}

/**
 * Handle OAuth callback from Slack
 * GET /slack/oauth_redirect?code=xxx&state=xxx
 */
async function handleOAuthCallback(
  request: FastifyRequest<{ Querystring: { code?: string; state?: string; error?: string } }>,
  reply: FastifyReply
) {
  const webUrl = process.env.WEB_URL || "http://localhost:5173";
  const { code, state, error } = request.query;

  // Check for Slack errors
  if (error) {
    console.error("[Slack OAuth] Error from Slack:", error);
    return reply.redirect(
      `${webUrl}/settings/integrations?error=${encodeURIComponent(error)}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return reply.redirect(
      `${webUrl}/settings/integrations?error=missing_parameters`
    );
  }

  // Validate state and get org context
  const stateData = validateInstallState(state);
  if (!stateData) {
    return reply.redirect(
      `${webUrl}/settings/integrations?error=invalid_state`
    );
  }

  const config = getOAuthConfig();
  if (!config) {
    return reply.redirect(
      `${webUrl}/settings/integrations?error=oauth_not_configured`
    );
  }

  try {
    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(code, config);

    if (!tokenResponse.ok || !tokenResponse.access_token || !tokenResponse.team) {
      console.error("[Slack OAuth] Token exchange failed:", tokenResponse.error);
      return reply.redirect(
        `${webUrl}/settings/integrations?error=${encodeURIComponent(tokenResponse.error || "token_exchange_failed")}`
      );
    }

    // Verify the organization exists and user has access
    const membership = await prisma.membership.findFirst({
      where: {
        orgId: stateData.orgId,
        userId: stateData.userId,
        status: "active",
        role: { in: ["admin", "owner"] },
      },
      include: { org: true },
    });

    if (!membership) {
      return reply.redirect(
        `${webUrl}/settings/integrations?error=unauthorized`
      );
    }

    // Check if workspace is already connected to another org
    const existingWorkspace = await prisma.slackWorkspace.findUnique({
      where: { teamId: tokenResponse.team.id },
    });

    if (existingWorkspace && existingWorkspace.orgId !== stateData.orgId) {
      return reply.redirect(
        `${webUrl}/settings/integrations?error=workspace_connected_to_another_org`
      );
    }

    // Upsert the workspace
    await prisma.slackWorkspace.upsert({
      where: { teamId: tokenResponse.team.id },
      create: {
        orgId: stateData.orgId,
        teamId: tokenResponse.team.id,
        teamName: tokenResponse.team.name,
        botUserId: tokenResponse.bot_user_id || "",
        accessToken: tokenResponse.access_token, // TODO: Encrypt this
        scopes: tokenResponse.scope?.split(",") || [],
        installerId: tokenResponse.authed_user?.id,
        isActive: true,
      },
      update: {
        teamName: tokenResponse.team.name,
        botUserId: tokenResponse.bot_user_id || "",
        accessToken: tokenResponse.access_token,
        scopes: tokenResponse.scope?.split(",") || [],
        installerId: tokenResponse.authed_user?.id,
        isActive: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        orgId: stateData.orgId,
        userId: stateData.userId,
        action: "integration.slack.connected",
        resourceType: "slack_workspace",
        resourceId: tokenResponse.team.id,
        details: {
          teamName: tokenResponse.team.name,
          scopes: tokenResponse.scope?.split(","),
        },
      },
    });

    console.log(
      `[Slack OAuth] Successfully connected workspace ${tokenResponse.team.name} to org ${membership.org.name}`
    );

    // Redirect to success page
    return reply.redirect(
      `${webUrl}/settings/integrations?slack=connected&team=${encodeURIComponent(tokenResponse.team.name)}`
    );
  } catch (error) {
    console.error("[Slack OAuth] Callback error:", error);
    return reply.redirect(
      `${webUrl}/settings/integrations?error=internal_error`
    );
  }
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Register Slack OAuth routes with Fastify
 */
export async function registerSlackOAuthRoutes(fastify: FastifyInstance) {
  // Install start endpoint
  fastify.get("/slack/install", handleInstallStart);

  // OAuth callback endpoint
  fastify.get("/slack/oauth_redirect", handleOAuthCallback);

  console.log("[Slack OAuth] Routes registered");
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build installation URL for a given organization
 */
export function getInstallUrl(orgId: string, userId: string): string {
  const apiUrl = process.env.API_URL || "http://localhost:3001";
  const state = generateInstallState(orgId, userId);
  return `${apiUrl}/slack/install?state=${encodeURIComponent(state)}`;
}

/**
 * Disconnect a Slack workspace
 */
export async function disconnectWorkspace(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const workspace = await prisma.slackWorkspace.findUnique({
    where: { id: workspaceId },
    include: { org: true },
  });

  if (!workspace) {
    return false;
  }

  // Deactivate instead of delete to preserve history
  await prisma.slackWorkspace.update({
    where: { id: workspaceId },
    data: { isActive: false },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      orgId: workspace.orgId,
      userId,
      action: "integration.slack.disconnected",
      resourceType: "slack_workspace",
      resourceId: workspace.teamId,
      details: {
        teamName: workspace.teamName,
      },
    },
  });

  console.log(`[Slack OAuth] Disconnected workspace ${workspace.teamName}`);

  return true;
}

/**
 * Revoke Slack token (call when uninstalling)
 */
export async function revokeWorkspaceToken(
  workspaceId: string
): Promise<boolean> {
  const workspace = await prisma.slackWorkspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    return false;
  }

  try {
    // Revoke the token with Slack
    const response = await fetch("https://slack.com/api/auth.revoke", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workspace.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const result = (await response.json()) as { ok: boolean; error?: string };

    if (!result.ok) {
      console.warn("[Slack OAuth] Token revocation failed:", result.error);
    }

    return result.ok;
  } catch (error) {
    console.error("[Slack OAuth] Token revocation error:", error);
    return false;
  }
}
