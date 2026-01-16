import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@documind/db";
import { router, protectedProcedure } from "../trpc.js";
import {
  generateUploadUrl,
  generateDownloadUrl,
  isStorageConfigured,
  getBucketName,
  deleteFile,
} from "../../lib/storage.js";

// Supported file types
const SUPPORTED_FILE_TYPES = ["pdf", "docx", "pptx", "xlsx", "txt", "md"] as const;
const SUPPORTED_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  md: "text/markdown",
};

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Gets the file extension from a filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Validates a file type against supported types
 */
function validateFileType(filename: string): boolean {
  const ext = getFileExtension(filename);
  return SUPPORTED_FILE_TYPES.includes(ext as (typeof SUPPORTED_FILE_TYPES)[number]);
}

export const documentsRouter = router({
  /**
   * List all documents for an organization
   */
  list: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
        search: z.string().optional(),
        source: z.enum(["upload", "google_drive", "api"]).optional(),
        indexStatus: z.enum(["pending", "processing", "indexed", "failed"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify membership
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

      const documents = await ctx.prisma.document.findMany({
        where: {
          orgId: input.orgId,
          deletedAt: null,
          ...(input.search && {
            filename: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          }),
          ...(input.source && { source: input.source }),
          ...(input.indexStatus && { indexStatus: input.indexStatus }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        select: {
          id: true,
          filename: true,
          fileType: true,
          fileSizeBytes: true,
          mimeType: true,
          pageCount: true,
          source: true,
          sourcePath: true,
          indexStatus: true,
          indexedAt: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          uploadedBy: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (documents.length > input.limit) {
        const nextItem = documents.pop();
        nextCursor = nextItem?.id;
      }

      return {
        documents,
        nextCursor,
      };
    }),

  /**
   * Get a single document by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.prisma.document.findFirst({
        where: {
          id: input.id,
          deletedAt: null,
          org: {
            memberships: {
              some: {
                userId: ctx.user.id,
                status: "active",
              },
            },
          },
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have access",
        });
      }

      return document;
    }),

  /**
   * Get upload URL for a new document
   * Returns a signed URL for direct upload to storage
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        filename: z.string().min(1).max(500),
        fileSizeBytes: z.number().min(1).max(MAX_FILE_SIZE),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
        },
        include: {
          org: {
            select: {
              storageQuotaBytes: true,
              storageUsedBytes: true,
            },
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      // Validate file type
      if (!validateFileType(input.filename)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported file type. Supported types: ${SUPPORTED_FILE_TYPES.join(", ")}`,
        });
      }

      // Check storage quota
      const org = membership.org;
      const remainingStorage = Number(org.storageQuotaBytes) - Number(org.storageUsedBytes);
      if (input.fileSizeBytes > remainingStorage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Storage quota exceeded. Please upgrade your plan.",
        });
      }

      // Generate unique storage path
      const fileExt = getFileExtension(input.filename);
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const storagePath = `${input.orgId}/${timestamp}-${randomSuffix}.${fileExt}`;
      const mimeType = input.mimeType || SUPPORTED_MIME_TYPES[fileExt] || "application/octet-stream";
      const bucketName = getBucketName();

      // Create document record with pending status
      const document = await ctx.prisma.document.create({
        data: {
          orgId: input.orgId,
          uploadedById: ctx.user.id,
          filename: input.filename,
          fileType: fileExt,
          fileSizeBytes: BigInt(input.fileSizeBytes),
          mimeType,
          storageBucket: bucketName,
          storagePath,
          source: "upload",
          indexStatus: "pending",
        },
        select: {
          id: true,
          storagePath: true,
          storageBucket: true,
        },
      });

      // Generate signed URL for direct upload to GCS
      const signedUrlResult = await generateUploadUrl({
        storagePath,
        contentType: mimeType,
        expiresInMinutes: 15,
        contentLengthLimit: input.fileSizeBytes,
      });

      // If GCS is not configured, return fallback URL
      if (!signedUrlResult) {
        return {
          documentId: document.id,
          uploadUrl: `/api/upload/${document.id}`,
          storagePath: document.storagePath,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          headers: { "Content-Type": mimeType },
          useSignedUrl: false,
        };
      }

      return {
        documentId: document.id,
        uploadUrl: signedUrlResult.uploadUrl,
        storagePath: document.storagePath,
        expiresAt: signedUrlResult.expiresAt,
        headers: signedUrlResult.headers,
        useSignedUrl: true,
      };
    }),

  /**
   * Confirm upload completed
   * Called after file is successfully uploaded to storage
   */
  confirmUpload: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        pageCount: z.number().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find document and verify ownership
      const document = await ctx.prisma.document.findFirst({
        where: {
          id: input.documentId,
          uploadedById: ctx.user.id,
          deletedAt: null,
        },
        include: {
          org: true,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Update document and organization storage
      const [updatedDoc] = await ctx.prisma.$transaction([
        ctx.prisma.document.update({
          where: { id: input.documentId },
          data: {
            ...(input.pageCount && { pageCount: input.pageCount }),
            ...(input.metadata && { metadata: input.metadata as Prisma.InputJsonValue }),
            indexStatus: "pending", // Ready for indexing
          },
        }),
        ctx.prisma.organization.update({
          where: { id: document.orgId },
          data: {
            storageUsedBytes: {
              increment: document.fileSizeBytes,
            },
          },
        }),
      ]);

      return {
        id: updatedDoc.id,
        filename: updatedDoc.filename,
        indexStatus: updatedDoc.indexStatus,
      };
    }),

  /**
   * Delete a document (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find document and verify access
      const document = await ctx.prisma.document.findFirst({
        where: {
          id: input.id,
          deletedAt: null,
          org: {
            memberships: {
              some: {
                userId: ctx.user.id,
                status: "active",
                role: { in: ["admin", "member"] }, // Viewers can't delete
              },
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have permission to delete it",
        });
      }

      // Delete from GCS if configured
      if (document.storagePath) {
        await deleteFile(document.storagePath);
      }

      // Soft delete and update storage
      await ctx.prisma.$transaction([
        ctx.prisma.document.update({
          where: { id: input.id },
          data: { deletedAt: new Date() },
        }),
        ctx.prisma.organization.update({
          where: { id: document.orgId },
          data: {
            storageUsedBytes: {
              decrement: document.fileSizeBytes,
            },
          },
        }),
      ]);

      return { success: true };
    }),

  /**
   * Get a download URL for a document
   */
  getDownloadUrl: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        disposition: z.enum(["inline", "attachment"]).default("inline"),
      })
    )
    .query(async ({ ctx, input }) => {
      // Find document and verify access
      const document = await ctx.prisma.document.findFirst({
        where: {
          id: input.documentId,
          deletedAt: null,
          org: {
            memberships: {
              some: {
                userId: ctx.user.id,
                status: "active",
              },
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have access",
        });
      }

      if (!document.storagePath) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document file not found in storage",
        });
      }

      // Generate signed download URL
      const responseDisposition =
        input.disposition === "attachment"
          ? `attachment; filename="${document.filename}"`
          : `inline; filename="${document.filename}"`;

      const downloadUrl = await generateDownloadUrl({
        storagePath: document.storagePath,
        expiresInMinutes: 60,
        responseDisposition,
      });

      if (!downloadUrl) {
        // Fallback for local development
        return {
          downloadUrl: `/api/download/${document.id}`,
          filename: document.filename,
          mimeType: document.mimeType,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        };
      }

      return {
        downloadUrl,
        filename: document.filename,
        mimeType: document.mimeType,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
    }),

  /**
   * Get document statistics for an organization
   */
  getStats: protectedProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify membership
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          orgId: input.orgId,
          status: "active",
        },
        include: {
          org: {
            select: {
              storageQuotaBytes: true,
              storageUsedBytes: true,
            },
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      // Get document counts by status
      const [totalCount, indexedCount, pendingCount, failedCount] = await Promise.all([
        ctx.prisma.document.count({
          where: { orgId: input.orgId, deletedAt: null },
        }),
        ctx.prisma.document.count({
          where: { orgId: input.orgId, deletedAt: null, indexStatus: "indexed" },
        }),
        ctx.prisma.document.count({
          where: { orgId: input.orgId, deletedAt: null, indexStatus: "pending" },
        }),
        ctx.prisma.document.count({
          where: { orgId: input.orgId, deletedAt: null, indexStatus: "failed" },
        }),
      ]);

      // Get documents by type
      const byType = await ctx.prisma.document.groupBy({
        by: ["fileType"],
        where: { orgId: input.orgId, deletedAt: null },
        _count: true,
      });

      return {
        total: totalCount,
        indexed: indexedCount,
        pending: pendingCount,
        failed: failedCount,
        storageUsedBytes: Number(membership.org.storageUsedBytes),
        storageQuotaBytes: Number(membership.org.storageQuotaBytes),
        byType: byType.map((t) => ({
          type: t.fileType,
          count: t._count,
        })),
      };
    }),
});
