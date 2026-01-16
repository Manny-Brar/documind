// Shared TypeScript types

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>[];
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Pagination
export interface PaginationMeta {
  page: number;
  perPage: number;
  totalPages: number;
  totalCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Search types
export interface SearchResult {
  documentId: string;
  filename: string;
  fileType: string;
  relevanceScore: number;
  snippet: string;
  highlights: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  source: "upload" | "google_drive" | "api";
  createdAt: string;
}

export interface SearchAnswer {
  text: string;
  citations: Array<{
    documentId: string;
    filename: string;
    passage: string;
    page?: number;
  }>;
  confidence: number;
}

export interface SearchResponse {
  answer?: SearchAnswer;
  results: SearchResult[];
  pagination: PaginationMeta;
  queryId: string;
  latencyMs: number;
}

// Auth types
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  role: "admin" | "member" | "viewer";
}

// Plan types
export interface Plan {
  id: "starter" | "growth" | "professional" | "enterprise";
  name: string;
  maxUsers: number;
  storageGb: number;
  priceMonthly: number;
}

export const PLANS: Record<Plan["id"], Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    maxUsers: 10,
    storageGb: 25,
    priceMonthly: 99,
  },
  growth: {
    id: "growth",
    name: "Growth",
    maxUsers: 25,
    storageGb: 100,
    priceMonthly: 199,
  },
  professional: {
    id: "professional",
    name: "Professional",
    maxUsers: 50,
    storageGb: 500,
    priceMonthly: 399,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    maxUsers: Infinity,
    storageGb: Infinity,
    priceMonthly: 0, // Custom pricing
  },
};
