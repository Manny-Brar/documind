/**
 * Slack Integration tRPC Router
 *
 * Provides API for managing Slack workspace connections from the web app
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import {
  isSlackConfigured,
  isSlackOAuthConfigured,
  getInstallUrl,
  disconnectWorkspace,
  revokeWorkspaceToken,
} from "../../lib/slack/index.js";

export const slackRouter = router({
  /**
   * Get Slack integration status for an organization
   */
  getStatus: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify admin access
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["admin", "owner"] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need admin access to manage integrations",
        });
      }

      // Check if Slack is configured on the server
      const isConfigured = isSlackConfigured();
      const isOAuthConfigured = isSlackOAuthConfigured();

      // Get workspace connection if exists
      const workspace = await ctx.prisma.slackWorkspace.findFirst({
        where: {
          orgId: input.orgId,
          isActive: true,
        },
        select: {
          id: true,
          teamId: true,
          teamName: true,
          scopes: true,
          installedAt: true,
          updatedAt: true,
        },
      });

      // Get usage stats if connected
      let stats = null;
      if (workspace) {
        const [searchCount, userMappingCount] = await Promise.all([
          ctx.prisma.searchLog.count({
            where: {
              orgId: input.orgId,
              sessionId: { startsWith: `slack-${workspace.teamId}` },
            },
          }),
          ctx.prisma.slackUserMapping.count({
            where: { slackWorkspaceId: workspace.id },
          }),
        ]);

        stats = {
          searchCount,
          userMappingCount,
        };
      }

      return {
        isConfigured,
        isOAuthConfigured,
        isConnected: !!workspace,
        workspace,
        stats,
      };
    }),

  /**
   * Get installation URL for connecting Slack
   */
  getInstallUrl: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin access
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["admin", "owner"] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need admin access to connect Slack",
        });
      }

      if (!isSlackOAuthConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Slack OAuth is not configured on this server",
        });
      }

      // Check if already connected
      const existingWorkspace = await ctx.prisma.slackWorkspace.findFirst({
        where: {
          orgId: input.orgId,
          isActive: true,
        },
      });

      if (existingWorkspace) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A Slack workspace is already connected. Disconnect it first.",
        });
      }

      const url = getInstallUrl(input.orgId, ctx.user.id);

      return { url };
    }),

  /**
   * Disconnect Slack workspace
   */
  disconnect: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        revokeToken: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin access
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["admin", "owner"] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need admin access to disconnect Slack",
        });
      }

      // Find the workspace
      const workspace = await ctx.prisma.slackWorkspace.findFirst({
        where: {
          orgId: input.orgId,
          isActive: true,
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No Slack workspace is connected",
        });
      }

      // Optionally revoke the token
      if (input.revokeToken) {
        await revokeWorkspaceToken(workspace.id);
      }

      // Disconnect the workspace
      const success = await disconnectWorkspace(workspace.id, ctx.user.id);

      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to disconnect workspace",
        });
      }

      return { success: true };
    }),

  /**
   * Get list of user mappings for a workspace
   */
  getUserMappings: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify access
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      // Get the workspace
      const workspace = await ctx.prisma.slackWorkspace.findFirst({
        where: {
          orgId: input.orgId,
          isActive: true,
        },
      });

      if (!workspace) {
        return { mappings: [], nextCursor: undefined };
      }

      const mappings = await ctx.prisma.slackUserMapping.findMany({
        where: { slackWorkspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        select: {
          id: true,
          slackUserId: true,
          slackUsername: true,
          slackDisplayName: true,
          slackEmail: true,
          userId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (mappings.length > input.limit) {
        const nextItem = mappings.pop();
        nextCursor = nextItem?.id;
      }

      return {
        mappings,
        nextCursor,
      };
    }),

  /**
   * Link a Slack user to a DocuMind user
   */
  linkUser: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        slackMappingId: z.string().uuid(),
        userId: z.string().optional(), // If not provided, unlinks
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin access
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["admin", "owner"] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need admin access to link users",
        });
      }

      // Get the mapping and verify it belongs to this org
      const mapping = await ctx.prisma.slackUserMapping.findFirst({
        where: {
          id: input.slackMappingId,
          workspace: {
            orgId: input.orgId,
          },
        },
      });

      if (!mapping) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Slack user mapping not found",
        });
      }

      // If linking to a user, verify they're in this org
      if (input.userId) {
        const userMembership = await ctx.prisma.membership.findFirst({
          where: {
            userId: input.userId,
            orgId: input.orgId,
            status: "active",
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Target user is not a member of this organization",
          });
        }
      }

      // Update the mapping
      await ctx.prisma.slackUserMapping.update({
        where: { id: input.slackMappingId },
        data: { userId: input.userId || null },
      });

      return { success: true };
    }),

  /**
   * Get list of channel configurations for a workspace
   */
  getChannels: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify admin access
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["admin", "owner"] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need admin access to manage channels",
        });
      }

      // Get the workspace
      const workspace = await ctx.prisma.slackWorkspace.findFirst({
        where: {
          orgId: input.orgId,
          isActive: true,
        },
      });

      if (!workspace) {
        return { channels: [] };
      }

      const channels = await ctx.prisma.slackChannelConfig.findMany({
        where: { slackWorkspaceId: workspace.id },
        orderBy: { channelName: "asc" },
        select: {
          id: true,
          channelId: true,
          channelName: true,
          channelType: true,
          isEnabled: true,
          indexRepliesOnly: true,
          minThreadLength: true,
          lastSyncAt: true,
          memberCount: true,
          topic: true,
          purpose: true,
          _count: {
            select: {
              indexedThreads: true,
            },
          },
        },
      });

      // Get indexed thread counts by status
      const channelStats = await Promise.all(
        channels.map(async (channel) => {
          const [indexed, pending, failed] = await Promise.all([
            ctx.prisma.slackIndexedThread.count({
              where: {
                channelConfigId: channel.id,
                status: "indexed",
              },
            }),
            ctx.prisma.slackIndexedThread.count({
              where: {
                channelConfigId: channel.id,
                status: "pending",
              },
            }),
            ctx.prisma.slackIndexedThread.count({
              where: {
                channelConfigId: channel.id,
                status: "failed",
              },
            }),
          ]);

          return {
            ...channel,
            stats: {
              totalThreads: channel._count.indexedThreads,
              indexedThreads: indexed,
              pendingThreads: pending,
              failedThreads: failed,
            },
          };
        })
      );

      return { channels: channelStats };
    }),

  /**
   * Update channel configuration
   */
  updateChannel: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        channelId: z.string().uuid(),
        isEnabled: z.boolean().optional(),
        indexRepliesOnly: z.boolean().optional(),
        minThreadLength: z.number().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin access
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["admin", "owner"] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need admin access to update channels",
        });
      }

      // Verify channel belongs to this org's workspace
      const channel = await ctx.prisma.slackChannelConfig.findFirst({
        where: {
          id: input.channelId,
          workspace: {
            orgId: input.orgId,
          },
        },
      });

      if (!channel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Channel not found",
        });
      }

      // Update channel config
      const updated = await ctx.prisma.slackChannelConfig.update({
        where: { id: input.channelId },
        data: {
          ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
          ...(input.indexRepliesOnly !== undefined && {
            indexRepliesOnly: input.indexRepliesOnly,
          }),
          ...(input.minThreadLength !== undefined && {
            minThreadLength: input.minThreadLength,
          }),
        },
      });

      return { channel: updated };
    }),

  /**
   * Get indexed threads for a channel
   */
  getIndexedThreads: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        channelId: z.string().uuid(),
        status: z.enum(["pending", "processing", "indexed", "failed"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify access
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      // Verify channel belongs to this org
      const channel = await ctx.prisma.slackChannelConfig.findFirst({
        where: {
          id: input.channelId,
          workspace: {
            orgId: input.orgId,
          },
        },
      });

      if (!channel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Channel not found",
        });
      }

      const threads = await ctx.prisma.slackIndexedThread.findMany({
        where: {
          channelConfigId: input.channelId,
          ...(input.status && { status: input.status }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        select: {
          id: true,
          threadTs: true,
          title: true,
          messageCount: true,
          participantCount: true,
          status: true,
          topicSummary: true,
          lastProcessedAt: true,
          errorMessage: true,
          createdAt: true,
          document: {
            select: {
              id: true,
              filename: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (threads.length > input.limit) {
        const nextItem = threads.pop();
        nextCursor = nextItem?.id;
      }

      return {
        threads,
        nextCursor,
      };
    }),

  /**
   * Retry failed thread indexing
   */
  retryThread: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        threadId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify admin access
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
          role: { in: ["admin", "owner"] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need admin access to retry threads",
        });
      }

      // Verify thread belongs to this org
      const thread = await ctx.prisma.slackIndexedThread.findFirst({
        where: {
          id: input.threadId,
          channelConfig: {
            workspace: {
              orgId: input.orgId,
            },
          },
        },
      });

      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      // Reset status to pending
      await ctx.prisma.slackIndexedThread.update({
        where: { id: input.threadId },
        data: {
          status: "pending",
          errorMessage: null,
        },
      });

      return { success: true };
    }),
});
