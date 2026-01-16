# DocuMind - System Design Analysis & Implementation Roadmap

**Generated:** January 15, 2026
**Status:** MVP Development Phase
**Overall Progress:** ~15% Complete

---

## Executive Summary

DocuMind is an AI-powered document search SaaS platform. The project has a solid foundation with excellent monorepo architecture and comprehensive database schema, but lacks the critical integration between authentication and business logic. This document provides a strategic breakdown of what needs to be built and in what order.

---

## 1. Current State Assessment

### 1.1 Implementation Status Overview

```
FOUNDATION LAYER
├── Monorepo (pnpm + Turborepo)    ████████████████████ 100%
├── Database Schema (Prisma)        ████████████████████ 100%
├── Shared Packages                 ████████████████████ 100%
├── API Server (Fastify)            ██████░░░░░░░░░░░░░░  30%
├── tRPC Setup                      ██████░░░░░░░░░░░░░░  30%
├── Better Auth                     ████████░░░░░░░░░░░░  40%
├── Frontend Structure              ████████░░░░░░░░░░░░  40%
└── UI Components                   ████░░░░░░░░░░░░░░░░  20%

FEATURE LAYERS
├── Auth Integration                ██░░░░░░░░░░░░░░░░░░  10%
├── Organization Management         ░░░░░░░░░░░░░░░░░░░░   0%
├── Document Management             ░░░░░░░░░░░░░░░░░░░░   0%
├── Search & AI                     ░░░░░░░░░░░░░░░░░░░░   0%
├── Team Management                 ░░░░░░░░░░░░░░░░░░░░   0%
└── Billing & Settings              ░░░░░░░░░░░░░░░░░░░░   0%
```

### 1.2 Strengths

| Area | Assessment |
|------|------------|
| **Architecture** | Excellent monorepo setup with clear separation of concerns |
| **Database Design** | Comprehensive schema covering all PRD requirements |
| **Type Safety** | End-to-end TypeScript with tRPC and Zod |
| **Auth Choice** | Better Auth is production-ready with OAuth support |
| **Tech Stack** | Modern, well-maintained dependencies |

### 1.3 Critical Gaps

| Gap | Impact | Severity |
|-----|--------|----------|
| **tRPC Context doesn't have session** | All protected endpoints are unprotected | CRITICAL |
| **No organization creation flow** | Users authenticate but have no workspace | CRITICAL |
| **No dashboard or protected routes** | Authenticated users have nowhere to go | HIGH |
| **No core features (docs/search)** | Product doesn't function | HIGH |
| **8+ TODO comments in middleware** | Auth/admin checks are bypassed | HIGH |

---

## 2. Architecture Deep Dive

### 2.1 Current Data Flow (Broken)

```
┌─────────────────────────────────────────────────────────────────┐
│ CURRENT STATE                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User → Login Page → Better Auth → Session Cookie Set ✓         │
│                           │                                      │
│                           ▼                                      │
│                      Home Page (shows user name) ✓               │
│                           │                                      │
│                           ▼                                      │
│                   ??? No Dashboard ???                           │
│                                                                  │
│  tRPC Call → Context → { session: null, user: null } ✗          │
│                           │                                      │
│                           ▼                                      │
│              protectedProcedure → Allows everything ✗            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Target Data Flow (Required)

```
┌─────────────────────────────────────────────────────────────────┐
│ TARGET STATE                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User → Login → Better Auth → Session Cookie ✓                  │
│                           │                                      │
│                           ▼                                      │
│              Check for Organization Membership                   │
│                    │              │                              │
│              Has Org ✓        No Org                             │
│                    │              │                              │
│                    ▼              ▼                              │
│              Dashboard     Create/Join Org Flow                  │
│                    │              │                              │
│                    └──────────────┘                              │
│                           │                                      │
│  tRPC Call → Context → { session, user, membership, org }       │
│                           │                                      │
│                           ▼                                      │
│         protectedProcedure → Validates session                   │
│         adminProcedure → Validates role === 'admin'              │
│         memberProcedure → Validates membership exists            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Missing Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION GAPS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. BETTER AUTH → tRPC                                          │
│     Problem: Session not extracted from cookies                  │
│     Solution: Use auth.api.getSession() in createContext        │
│                                                                  │
│  2. USER → ORGANIZATION                                         │
│     Problem: No org creation on signup                          │
│     Solution: Create default org or show onboarding flow        │
│                                                                  │
│  3. FRONTEND → PROTECTED ROUTES                                 │
│     Problem: All routes accessible to anyone                    │
│     Solution: Add beforeLoad guard on _authenticated routes     │
│                                                                  │
│  4. CONTEXT → ORGANIZATION                                      │
│     Problem: tRPC doesn't know which org user is acting in      │
│     Solution: Add org_id header or store active org in session  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Strategic Roadmap

### Phase 1: Foundation Completion (CURRENT PRIORITY)

**Objective:** Users can authenticate and access a functional dashboard

```
Week 1-2 Focus
├── Task 1.1: Connect Better Auth to tRPC Context [CRITICAL]
├── Task 1.2: Create Organization on Signup [CRITICAL]
├── Task 1.3: Build Dashboard Layout [HIGH]
├── Task 1.4: Add Protected Route Guards [HIGH]
└── Task 1.5: Organization Settings Router [MEDIUM]
```

### Phase 2: Document Management

**Objective:** Users can upload, view, and manage documents

```
Week 2-3 Focus
├── Task 2.1: GCS Integration Setup
├── Task 2.2: Signed URL Upload Flow
├── Task 2.3: Documents tRPC Router
├── Task 2.4: Document List UI
├── Task 2.5: Document Upload Component
└── Task 2.6: Document Preview Modal
```

### Phase 3: Search & AI

**Objective:** Users can search documents and get AI answers

```
Week 3-5 Focus
├── Task 3.1: Vertex AI Search Setup
├── Task 3.2: Document Indexing Pipeline
├── Task 3.3: Search tRPC Router
├── Task 3.4: Search UI with Filters
├── Task 3.5: AI Answer Generation
└── Task 3.6: Citation Display
```

### Phase 4: Team & Integrations

**Objective:** Teams can collaborate and connect integrations

```
Week 5-6 Focus
├── Task 4.1: Team Invitation Flow
├── Task 4.2: Role-Based Access Control
├── Task 4.3: Google Drive OAuth
└── Task 4.4: Drive Sync Worker
```

---

## 4. Detailed Task Breakdown

### 4.1 Task 1.1: Connect Better Auth to tRPC Context

**Priority:** CRITICAL
**Complexity:** Medium
**Dependencies:** None

**Description:**
The tRPC context currently returns `{ session: null, user: null }` for every request. We need to extract the session from the request cookies using Better Auth's API.

**Sub-tasks:**
1. Import Better Auth's session verification in context.ts
2. Extract session from request headers/cookies
3. Fetch full user data if session exists
4. Update Context type with proper session/user types
5. Update isAuthed middleware to actually check session
6. Update isAdmin middleware to check membership role
7. Add membershipProcedure for org-scoped operations

**Files to modify:**
- `apps/api/src/trpc/context.ts`
- `apps/api/src/trpc/trpc.ts`
- `apps/api/src/auth.ts`

**Acceptance Criteria:**
- [ ] Authenticated requests have session in context
- [ ] Unauthenticated requests have null session
- [ ] protectedProcedure throws UNAUTHORIZED without session
- [ ] adminProcedure throws FORBIDDEN without admin role
- [ ] Health endpoint can optionally show current user

---

### 4.2 Task 1.2: Create Organization on Signup

**Priority:** CRITICAL
**Complexity:** Medium
**Dependencies:** Task 1.1

**Description:**
When a user signs up, they need to be placed in an organization. This could be automatic (create personal org) or guided (onboarding flow).

**Sub-tasks:**
1. Create `organizations` tRPC router
2. Add `create` procedure for new organizations
3. Add `getBySlug` and `getById` queries
4. Create slug generation utility (name → slug)
5. Auto-create org and membership on first login
6. Handle edge case: existing user via Google OAuth

**Files to create:**
- `apps/api/src/trpc/routers/organizations.ts`
- `packages/shared/src/utils/slug.ts`

**Files to modify:**
- `apps/api/src/trpc/router.ts`

**Acceptance Criteria:**
- [ ] New users get an organization created automatically
- [ ] Organization has unique slug derived from user's name
- [ ] User is made admin of their organization
- [ ] Membership record created with role='admin', status='active'

---

### 4.3 Task 1.3: Build Dashboard Layout

**Priority:** HIGH
**Complexity:** Low
**Dependencies:** Task 1.1

**Description:**
Create a consistent layout for authenticated pages with sidebar navigation and header.

**Sub-tasks:**
1. Create DashboardLayout component with sidebar
2. Create navigation menu items
3. Create header with user dropdown
4. Create `_authenticated` route group
5. Create placeholder pages for main sections

**Files to create:**
- `apps/web/src/components/layout/dashboard-layout.tsx`
- `apps/web/src/components/layout/sidebar.tsx`
- `apps/web/src/components/layout/header.tsx`
- `apps/web/src/routes/_authenticated.tsx`
- `apps/web/src/routes/_authenticated/index.tsx`
- `apps/web/src/routes/_authenticated/documents.tsx`
- `apps/web/src/routes/_authenticated/search.tsx`
- `apps/web/src/routes/_authenticated/settings.tsx`

**Acceptance Criteria:**
- [ ] Sidebar shows navigation links
- [ ] Header shows user name and logout option
- [ ] All authenticated pages use consistent layout
- [ ] Mobile responsive (collapsible sidebar)

---

### 4.4 Task 1.4: Add Protected Route Guards

**Priority:** HIGH
**Complexity:** Low
**Dependencies:** Task 1.1, 1.3

**Description:**
Prevent unauthenticated users from accessing dashboard routes.

**Sub-tasks:**
1. Add `beforeLoad` hook to `_authenticated` route
2. Check session using auth client
3. Redirect to `/login` if not authenticated
4. Pass session context to child routes
5. Add "redirect back" after login

**Files to modify:**
- `apps/web/src/routes/_authenticated.tsx`
- `apps/web/src/routes/login.tsx` (redirect param)

**Acceptance Criteria:**
- [ ] Unauthenticated users redirected to login
- [ ] After login, users return to original destination
- [ ] Session available in child route context

---

### 4.5 Task 1.5: Organization Settings Router

**Priority:** MEDIUM
**Complexity:** Medium
**Dependencies:** Task 1.1, 1.2

**Description:**
tRPC router for organization-level settings and information.

**Sub-tasks:**
1. Create `settings` router
2. Add `getOrganization` query (protected)
3. Add `updateOrganization` mutation (admin)
4. Add `getUsageStats` query (protected)
5. Add `getBillingInfo` query (admin)

**Files to create:**
- `apps/api/src/trpc/routers/settings.ts`

**Files to modify:**
- `apps/api/src/trpc/router.ts`

**Acceptance Criteria:**
- [ ] Members can view org info
- [ ] Only admins can update org settings
- [ ] Usage stats show storage and document counts

---

## 5. Technical Decisions Required

### 5.1 Organization Context Strategy

**Option A: Header-Based (Recommended)**
- Client sends `X-Org-Id` header with each request
- Simpler, explicit, stateless
- Requires frontend to track current org

**Option B: Session-Based**
- Store active org ID in session/cookie
- More complex, implicit
- Requires session updates when switching orgs

**Recommendation:** Option A for simplicity

### 5.2 Signup Flow Strategy

**Option A: Auto-Create Personal Org (Recommended)**
- Create "{Name}'s Workspace" automatically
- User lands directly in dashboard
- Can create more orgs later

**Option B: Onboarding Flow**
- Show org creation wizard after signup
- More control but more friction
- Better for team-focused product

**Recommendation:** Option A for faster time-to-value

### 5.3 Multi-Org Support

**Decision:** Support from day one
- Users can be members of multiple orgs
- Org switcher in UI
- Context tied to selected org

---

## 6. Quality Improvements Needed

### 6.1 Immediate Fixes

| Issue | Location | Fix |
|-------|----------|-----|
| TODO comments | `context.ts`, `trpc.ts` | Implement actual auth checks |
| Missing env validation | `index.ts` | Add Zod schema for env vars |
| No error boundary | `__root.tsx` | Add React error boundary |
| Console.log statements | Various | Remove or use proper logger |

### 6.2 Developer Experience

| Improvement | Priority | Effort |
|-------------|----------|--------|
| Database seeding script | HIGH | Low |
| Vitest for unit tests | HIGH | Medium |
| Playwright for E2E | MEDIUM | High |
| Storybook for UI | LOW | Medium |
| API documentation | LOW | Low |

### 6.3 Production Readiness

| Item | Status | Notes |
|------|--------|-------|
| Error tracking (Sentry) | NOT SETUP | Need to add |
| Logging (structured) | PARTIAL | Pino configured |
| Health checks | BASIC | Need DB check |
| Rate limiting | CONFIGURED | 100/min global |
| CORS | CONFIGURED | Single origin |

---

## 7. Risk Assessment

### 7.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Vertex AI Search costs | Medium | High | Test with small dataset first |
| Better Auth edge cases | Low | Medium | Review docs, add tests |
| GCS signed URL complexity | Medium | Medium | Use official patterns |
| tRPC RC version | Low | Low | Pin version |

### 7.2 Implementation Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Auth context too complex | Medium | High | Start simple, iterate |
| Org creation edge cases | Medium | Medium | Handle OAuth users |
| Route protection gaps | Low | High | Add at route group level |

---

## 8. Success Metrics

### 8.1 Phase 1 Definition of Done

- [ ] User can sign up and land in dashboard
- [ ] User can sign in and access their data
- [ ] Protected routes are actually protected
- [ ] tRPC context has full auth info
- [ ] Organization created on signup
- [ ] All middleware TODOs resolved

### 8.2 MVP Definition of Done

- [ ] Phase 1 complete
- [ ] User can upload documents
- [ ] User can search documents
- [ ] User can get AI answers
- [ ] Basic team invitation works

---

## 9. Recommended Next Steps

1. **Immediate (This Session):** Task 1.1 - Connect Better Auth to tRPC Context
2. **Next:** Task 1.2 - Create Organization on Signup
3. **Then:** Task 1.3 - Build Dashboard Layout
4. **Follow:** Task 1.4 - Add Protected Route Guards
5. **Complete Phase 1:** Task 1.5 - Organization Settings Router

---

*This document should be updated as implementation progresses.*
