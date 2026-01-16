// Shared Zod schemas for validation across frontend and backend
import { z } from "zod";

// User schemas
export const emailSchema = z.string().email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain a special character");

export const userSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  name: z.string().min(1).max(255),
  avatarUrl: z.string().url().nullable(),
  emailVerified: z.boolean(),
  mfaEnabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Organization schemas
export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  planId: z.enum(["starter", "growth", "professional", "enterprise"]),
  storageQuotaBytes: z.number().int().positive(),
  storageUsedBytes: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Document schemas
export const documentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1).max(500),
  fileType: z.string().min(1).max(50),
  fileSizeBytes: z.number().int().positive(),
  source: z.enum(["upload", "google_drive", "api"]),
  indexStatus: z.enum(["pending", "processing", "indexed", "failed"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Search schemas
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  options: z
    .object({
      page: z.number().int().positive().default(1),
      perPage: z.number().int().min(1).max(100).default(10),
      includeAnswer: z.boolean().default(true),
      filters: z
        .object({
          fileTypes: z.array(z.string()).optional(),
          sources: z.array(z.enum(["upload", "google_drive", "api"])).optional(),
          dateRange: z
            .object({
              field: z.enum(["created_at", "updated_at"]),
              start: z.string().datetime().optional(),
              end: z.string().datetime().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(255),
});

// Role enum
export const roleSchema = z.enum(["admin", "member", "viewer"]);

// Export types
export type User = z.infer<typeof userSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Document = z.infer<typeof documentSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type Role = z.infer<typeof roleSchema>;
