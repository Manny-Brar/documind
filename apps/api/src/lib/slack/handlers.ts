/**
 * Slack Command Handlers
 *
 * Registers slash commands and event handlers with the Bolt app
 */

import type { App, SlashCommand, RespondFn } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import { prisma } from "@documind/db";
import {
  getSlackApp,
  getWorkspaceByTeamId,
  getOrCreateUserMapping,
  formatSearchResultBlocks,
  formatErrorBlocks,
  formatLoadingBlocks,
} from "./index.js";
import { searchWithFallback, type SearchOptions } from "../vector-search.js";
import { generateAnswer, type SourceChunk } from "../rag-generator.js";
import {
  getEntitySearchContext,
  buildEntityEnrichedContext,
} from "../entity-search.js";

// ============================================================================
// Types
// ============================================================================

interface SlackSearchResult {
  answer: string | null;
  sources: Array<{
    documentId: string;
    filename: string;
    score: number;
    pageNumber?: number;
  }>;
  latencyMs: number;
}

// ============================================================================
// Search Function (shared with tRPC)
// ============================================================================

/**
 * Execute a search query for a given organization
 * This is the core search logic extracted from the tRPC router
 */
async function executeSearch(
  orgId: string,
  query: string,
  options: { limit?: number; includeEntities?: boolean } = {}
): Promise<SlackSearchResult> {
  const startTime = Date.now();
  const { limit = 10, includeEntities = true } = options;

  // Search for matching documents
  const searchOpts: SearchOptions = {
    limit,
    minScore: 0.25,
  };

  const results = await searchWithFallback(prisma, orgId, query, searchOpts);

  // Get entity context
  let entityContext = "";
  if (includeEntities && results.length > 0) {
    const documentIds = [...new Set(results.map((r) => r.documentId))];
    const entityData = await getEntitySearchContext(prisma, orgId, documentIds);
    entityContext = buildEntityEnrichedContext(
      entityData.entities,
      entityData.relatedEntities
    );
  }

  // Generate AI answer
  let answer: string | null = null;

  if (results.length > 0) {
    // Get chunks for RAG
    const chunks = await getChunksForRag(orgId, results);

    if (chunks.length > 0) {
      const ragResult = await generateAnswer(query, chunks, undefined, entityContext);
      answer = ragResult.answer;
    }
  }

  const latencyMs = Date.now() - startTime;

  return {
    answer,
    sources: results.map((r) => ({
      documentId: r.documentId,
      filename: r.filename,
      score: r.score,
      pageNumber: r.pageNumber,
    })),
    latencyMs,
  };
}

/**
 * Get chunk content for RAG answer generation
 */
async function getChunksForRag(
  orgId: string,
  results: Array<{
    documentId: string;
    filename: string;
    score: number;
    pageNumber?: number;
  }>
): Promise<SourceChunk[]> {
  if (results.length === 0) return [];

  const documentIds = results.map((r) => r.documentId);

  try {
    const chunks = await prisma.$queryRaw<
      Array<{
        document_id: string;
        content: string;
        page_number: number | null;
        chunk_index: number;
      }>
    >`
      SELECT
        dc.document_id,
        dc.content,
        dc.page_number,
        dc.chunk_index
      FROM document_chunks dc
      WHERE dc.document_id = ANY(${documentIds}::uuid[])
      AND dc.org_id = ${orgId}::uuid
      ORDER BY dc.chunk_index ASC
      LIMIT 10
    `;

    const resultMap = new Map(
      results.map((r) => [r.documentId, { filename: r.filename, score: r.score, pageNumber: r.pageNumber }])
    );

    return chunks.map((c) => {
      const info = resultMap.get(c.document_id);
      return {
        documentId: c.document_id,
        filename: info?.filename ?? "Unknown",
        content: c.content,
        score: info?.score ?? 0,
        pageNumber: c.page_number ?? info?.pageNumber,
        chunkIndex: c.chunk_index,
      };
    });
  } catch (error) {
    console.warn("[Slack] Could not get chunks for RAG:", error);
    return [];
  }
}

// ============================================================================
// /ask Slash Command
// ============================================================================

/**
 * Handle /ask slash command
 * Usage: /ask [your question]
 */
async function handleAskCommand(
  command: SlashCommand,
  respond: RespondFn
): Promise<void> {
  const { team_id, user_id, user_name, text: query } = command;

  console.log(`[Slack] /ask command from ${user_name} (${user_id}): "${query}"`);

  // Validate query
  if (!query || query.trim().length === 0) {
    await respond({
      response_type: "ephemeral",
      blocks: formatErrorBlocks(
        "Please provide a question to search for.",
        "Usage: `/ask What is our refund policy?`"
      ),
    });
    return;
  }

  // Look up workspace
  const workspace = await getWorkspaceByTeamId(team_id);

  if (!workspace) {
    await respond({
      response_type: "ephemeral",
      blocks: formatErrorBlocks(
        "This Slack workspace is not connected to DocuMind.",
        "An admin needs to install the DocuMind app and connect it to your organization."
      ),
    });
    return;
  }

  if (!workspace.isActive) {
    await respond({
      response_type: "ephemeral",
      blocks: formatErrorBlocks(
        "The DocuMind connection for this workspace has been deactivated.",
        "Contact your admin to reconnect."
      ),
    });
    return;
  }

  // Get or create user mapping
  await getOrCreateUserMapping({
    slackWorkspaceId: workspace.id,
    slackUserId: user_id,
    slackUsername: user_name,
  });

  // Send loading message
  await respond({
    response_type: "ephemeral",
    blocks: formatLoadingBlocks(query.trim()),
  });

  try {
    // Execute search
    const result = await executeSearch(workspace.orgId, query.trim(), {
      limit: 10,
      includeEntities: true,
    });

    // Check if we got an answer
    if (!result.answer && result.sources.length === 0) {
      await respond({
        response_type: "ephemeral",
        replace_original: true,
        blocks: formatErrorBlocks(
          "I couldn't find any relevant information for your question.",
          "Try rephrasing your question or check if the relevant documents have been uploaded."
        ),
      });
      return;
    }

    // Format and send response
    const responseBlocks = formatSearchResultBlocks({
      answer: result.answer || "Found relevant documents but couldn't generate a summary.",
      sources: result.sources,
      orgSlug: workspace.org.slug,
    });

    // Log the search
    await prisma.searchLog.create({
      data: {
        orgId: workspace.orgId,
        query: query.trim(),
        queryType: "question",
        resultsCount: result.sources.length,
        answerGenerated: !!result.answer,
        latencyMs: result.latencyMs,
        sessionId: `slack-${workspace.teamId}-${user_id}`,
      },
    });

    await respond({
      response_type: "ephemeral", // Only visible to the user who asked
      replace_original: true,
      blocks: responseBlocks,
    });

    console.log(`[Slack] /ask response sent (${result.latencyMs}ms, ${result.sources.length} sources)`);
  } catch (error) {
    console.error("[Slack] Error processing /ask command:", error);

    await respond({
      response_type: "ephemeral",
      replace_original: true,
      blocks: formatErrorBlocks(
        "Sorry, something went wrong while processing your question.",
        "Please try again in a moment."
      ),
    });
  }
}

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register all command and event handlers with the Slack app
 */
export function registerSlackHandlers(): boolean {
  const app = getSlackApp();
  if (!app) {
    console.log("[Slack] App not available, skipping handler registration");
    return false;
  }

  // Register /ask slash command
  app.command("/ask", async ({ command, ack, respond }) => {
    // Acknowledge immediately (must respond within 3 seconds)
    await ack();

    // Process the command asynchronously
    await handleAskCommand(command, respond);
  });

  // Register /documind slash command (alias for /ask)
  app.command("/documind", async ({ command, ack, respond }) => {
    await ack();
    await handleAskCommand(command, respond);
  });

  // Handle app home opened event
  app.event("app_home_opened", async ({ event, client, context }) => {
    try {
      // Get team_id from context (available in Bolt.js context)
      const teamId = context.teamId || "";
      const workspace = await getWorkspaceByTeamId(teamId);
      const orgName = workspace?.org.name || "your organization";

      const homeBlocks: KnownBlock[] = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Welcome to DocuMind!* :wave:\n\nSearch and ask questions about ${orgName}'s documents directly from Slack.`,
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*How to use:*\n\n`/ask [your question]`\n\nExample: `/ask What is our vacation policy?`",
          },
        },
        { type: "divider" },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Connected to: *${orgName}*`,
            },
          ],
        },
      ];

      await client.views.publish({
        user_id: event.user,
        view: {
          type: "home",
          blocks: homeBlocks,
        },
      });
    } catch (error) {
      console.error("[Slack] Error publishing app home:", error);
    }
  });

  // Handle @mentions (app mentions)
  app.event("app_mention", async ({ event, client, say, context }) => {
    // Extract the question from the mention (remove the bot mention)
    const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();

    if (!text) {
      await say({
        thread_ts: event.ts,
        text: "Hi! Ask me a question about your documents. For example: `@DocuMind What is our refund policy?`",
      });
      return;
    }

    // Get workspace from context team_id
    const teamId = context.teamId || "";
    const workspace = teamId
      ? await getWorkspaceByTeamId(teamId)
      : await prisma.slackWorkspace.findFirst({
          where: { isActive: true },
          include: { org: true },
        });

    if (!workspace) {
      await say({
        thread_ts: event.ts,
        text: ":warning: DocuMind is not connected to any organization yet.",
      });
      return;
    }

    // Send thinking message
    const thinkingMsg = await say({
      thread_ts: event.ts,
      text: `:hourglass_flowing_sand: Searching for: *${text}*`,
    });

    try {
      const result = await executeSearch(workspace.orgId, text, {
        limit: 10,
        includeEntities: true,
      });

      // Update with results
      await client.chat.update({
        channel: event.channel,
        ts: thinkingMsg.ts!,
        blocks: formatSearchResultBlocks({
          answer: result.answer || "I found some relevant documents but couldn't generate a summary.",
          sources: result.sources,
          orgSlug: workspace.org.slug,
        }),
        text: result.answer || "Search results",
      });

      // Log the search
      await prisma.searchLog.create({
        data: {
          orgId: workspace.orgId,
          query: text,
          queryType: "question",
          resultsCount: result.sources.length,
          answerGenerated: !!result.answer,
          latencyMs: result.latencyMs,
          sessionId: `slack-mention-${event.channel}`,
        },
      });
    } catch (error) {
      console.error("[Slack] Error handling app mention:", error);

      await client.chat.update({
        channel: event.channel,
        ts: thinkingMsg.ts!,
        text: ":warning: Sorry, something went wrong. Please try again.",
      });
    }
  });

  console.log("[Slack] Command and event handlers registered");
  return true;
}

// ============================================================================
// Export executeSearch for potential reuse
// ============================================================================

export { executeSearch };
