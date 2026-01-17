# DocuMind - Strategic Next Steps

## Current State Assessment

**Completed (Phase 1 & 5):**
- ✅ tRPC auth context with org membership validation
- ✅ Invitation acceptance flow with token-based invites
- ✅ OAuth & session flow verified
- ✅ Production deployment config (Cloud Build, env examples)
- ✅ Stripe billing integration (checkout, portal, webhooks)
- ✅ Email service with Resend (invitation emails)

**Existing Implementation (Already Working):**
- ✅ Full RAG pipeline: embeddings → vector search → answer generation
- ✅ Document indexing: upload → extraction → chunking → storage
- ✅ Multi-provider AI: Vertex AI, OpenAI, mock fallback
- ✅ Text extraction: PDF, DOCX, PPTX, XLSX, TXT, MD
- ✅ Search with feedback tracking and history
- ✅ Multi-tenant organizations with billing
- ✅ Usage tracking and metering

**Key Insight:** The custom RAG is functional. The question is whether to enhance it or replace it with Gemini File Search.

---

## Strategic Decision Point

### Option A: Enhance Current RAG + Add Knowledge Graph
**Keep working custom RAG, add entity intelligence on top**

| Pros | Cons |
|------|------|
| Leverage working code | Maintain custom infrastructure |
| Full control over pipeline | Embedding storage in JSON (not pgvector) |
| Faster to add Graph layer | May hit scaling limits |

### Option B: Migrate to Gemini File Search + Add Knowledge Graph
**Replace custom RAG with Google-managed, then add entities**

| Pros | Cons |
|------|------|
| Google-managed infrastructure | Throw away working code |
| Automatic grounding & citations | New API to learn |
| Scales automatically | Vendor lock-in |

### Recommendation: **Option A for MVP, evaluate Option B later**

The current RAG works. Focus on differentiation (Knowledge Graph) rather than infrastructure migration. Revisit Gemini migration when you need to scale beyond current limits.

---

## Phase 2: Knowledge Graph Foundation (Recommended Next)

**Goal:** Add entity extraction and relationships to enable complex queries that vector search alone cannot answer.

**Duration:** 2-3 weeks | **Priority:** P0 Critical

### 2.1 Database Schema Updates
**Complexity:** Small | **Duration:** 1 day

```
Files: packages/db/prisma/schema.prisma
```

Tasks:
- [ ] Add `Entity` model (id, orgId, type, name, normalizedName, metadata)
- [ ] Add `EntityMention` model (entityId, documentId, position, context)
- [ ] Add `Relationship` model (sourceId, targetId, type, documentId, confidence)
- [ ] Add indexes for efficient queries
- [ ] Run migration: `pnpm prisma migrate dev`

Entity Types:
```
PERSON, ORGANIZATION, PROJECT, DATE, MONEY, LOCATION, PRODUCT, EVENT
```

Relationship Types:
```
AUTHORED, WORKS_AT, MENTIONS, DISCUSSED_IN, APPROVED_BY, REPORTS_TO
```

### 2.2 Entity Extraction Pipeline
**Complexity:** Medium | **Duration:** 3-4 days

```
Files:
- apps/api/src/lib/entity-extraction.ts (create)
- apps/api/src/lib/indexer.ts (modify)
```

Tasks:
- [ ] Create LLM prompt for entity extraction with structured JSON output
- [ ] Support batch processing for large documents
- [ ] Return confidence scores for each entity
- [ ] Extract relationships between entities in same document
- [ ] Handle extraction failures gracefully

Prompt Structure:
```typescript
interface ExtractedEntity {
  name: string;
  type: "PERSON" | "ORGANIZATION" | "PROJECT" | ...;
  confidence: number;
  context: string; // surrounding text
  position?: number; // character offset
}

interface ExtractedRelationship {
  source: string; // entity name
  target: string; // entity name
  type: string;
  confidence: number;
}
```

### 2.3 Entity Resolution & Deduplication
**Complexity:** Medium | **Duration:** 2-3 days

```
Files:
- apps/api/src/lib/entity-resolution.ts (create)
```

Tasks:
- [ ] Normalize entity names (case, whitespace, common variations)
- [ ] Fuzzy matching using Levenshtein distance or similar
- [ ] Merge duplicate entities across documents
- [ ] Track canonical vs alias names
- [ ] Handle edge cases: "John Smith" vs "J. Smith" vs "John"

### 2.4 Integrate with Document Indexing
**Complexity:** Small | **Duration:** 1-2 days

```
Files:
- apps/api/src/lib/indexer.ts (modify)
```

Tasks:
- [ ] Run entity extraction after text extraction
- [ ] Store entities with document reference
- [ ] Track extraction status on document (extractionStatus field)
- [ ] Handle extraction as optional (don't fail indexing if extraction fails)
- [ ] Log extraction metrics

Flow:
```
Upload → Extract Text → Chunk → Embed → Store Chunks
                              ↓
                         Extract Entities → Resolve → Store Entities
```

### 2.5 Entity API Endpoints
**Complexity:** Medium | **Duration:** 2-3 days

```
Files:
- apps/api/src/trpc/routers/entities.ts (create)
- apps/api/src/trpc/router.ts (add to appRouter)
```

Endpoints:
- [ ] `entities.list` - List entities with filters (type, document, search)
- [ ] `entities.getById` - Get entity with all mentions and relationships
- [ ] `entities.search` - Fuzzy search entities by name
- [ ] `entities.getRelationships` - Get relationships for an entity
- [ ] `entities.merge` - Manually merge duplicate entities (admin only)
- [ ] `entities.getStats` - Entity counts by type

### 2.6 Entity Display in Search Results
**Complexity:** Small | **Duration:** 1-2 days

```
Files:
- apps/web/src/routes/_authenticated/search.tsx (modify)
- packages/ui/src/components/entity-badge.tsx (create)
```

Tasks:
- [ ] Show entity badges on search results
- [ ] Entity type icons (person, org, project, etc.)
- [ ] Click entity to filter search
- [ ] Entity highlight in document preview

---

## Phase 3: Intelligence Layer

**Goal:** Combine entity graph with search for superior query understanding.

**Duration:** 2 weeks | **Priority:** P1 High

### 3.1 Graph-Enhanced Query Processing
**Complexity:** Large | **Duration:** 4-5 days

```
Files:
- apps/api/src/lib/query-enhancer.ts (create)
- apps/api/src/trpc/routers/search.ts (modify)
```

Tasks:
- [ ] Extract entities from user query using same extraction pipeline
- [ ] Look up related entities in graph
- [ ] Expand query with entity context
- [ ] Boost documents containing mentioned entities
- [ ] Track entity-based search patterns

Example:
```
Query: "What did John say about Q3 budget?"

1. Extract: John (PERSON), Q3 budget (PROJECT/TOPIC)
2. Lookup: John's mentions, Q3 budget documents
3. Expand: Include related entities (John's team, budget approvers)
4. Search: Boost documents with entity matches
5. Answer: Grounded response with citations
```

### 3.2 Entity Detail Pages
**Complexity:** Medium | **Duration:** 3-4 days

```
Files:
- apps/web/src/routes/_authenticated/entities.tsx (create)
- apps/web/src/routes/_authenticated/entities.$entityId.tsx (create)
```

Features:
- [ ] Entity list page with search and type filters
- [ ] Entity detail page with:
  - All mentions across documents
  - Relationships visualization
  - Timeline of appearances
  - Related entities
- [ ] Navigation from search results to entity page
- [ ] Breadcrumb navigation

### 3.3 Document Quality Signals
**Complexity:** Medium | **Duration:** 2-3 days

```
Files:
- apps/api/src/lib/document-scoring.ts (create)
- apps/api/src/trpc/routers/documents.ts (modify)
```

Signals:
- [ ] Freshness score (days since upload/update)
- [ ] Entity richness (number of entities extracted)
- [ ] Search frequency (how often document appears in results)
- [ ] Feedback score (thumbs up/down from users)
- [ ] Staleness warning (documents >12 months old)

### 3.4 Relationship Visualization
**Complexity:** Medium | **Duration:** 3-4 days

```
Files:
- apps/web/src/components/relationship-graph.tsx (create)
Dependencies: react-force-graph or d3-force
```

Features:
- [ ] Interactive node-link diagram
- [ ] Color nodes by entity type
- [ ] Size nodes by mention count
- [ ] Click node to navigate to entity
- [ ] Filter by relationship type
- [ ] Zoom and pan controls

---

## Phase 4: Production Hardening

**Goal:** Make the system bulletproof for production.

**Duration:** 1-2 weeks | **Priority:** P1 High (can parallelize)

### 4.1 Background Job Queue
**Complexity:** Medium | **Duration:** 2-3 days

```
Files:
- apps/api/src/jobs/queue.ts (create)
- apps/api/src/jobs/workers/index.ts (create)
- apps/api/src/jobs/workers/document-indexer.ts (create)
- apps/api/src/jobs/workers/entity-extractor.ts (create)
Dependencies: bullmq, ioredis
```

Jobs:
- [ ] Document indexing (async, with retries)
- [ ] Entity extraction (after indexing)
- [ ] Email sending (with retry)
- [ ] Usage aggregation (daily rollup)

Infrastructure:
- [ ] Redis connection (Upstash or GCP Memorystore)
- [ ] Job status API endpoints
- [ ] Admin job dashboard (optional)

### 4.2 Audit Logging Enhancement
**Complexity:** Small | **Duration:** 1-2 days

```
Files:
- apps/api/src/trpc/trpc.ts (add middleware)
- apps/api/src/trpc/routers/audit.ts (create)
```

Actions to Log:
- [ ] Document uploads and deletes
- [ ] Search queries
- [ ] Settings changes
- [ ] Team member changes
- [ ] Billing events

Features:
- [ ] Admin-only audit log viewer
- [ ] Filter by action type, user, date range
- [ ] Export to CSV

### 4.3 Health Checks & Monitoring
**Complexity:** Small | **Duration:** 1 day

```
Files:
- apps/api/src/lib/health.ts (create)
- apps/api/src/trpc/routers/health.ts (modify)
```

Checks:
- [ ] Database connectivity
- [ ] Redis connectivity (if using BullMQ)
- [ ] GCS storage access
- [ ] AI provider availability
- [ ] Stripe API status

Endpoints:
- [ ] `/health/live` - Kubernetes liveness probe
- [ ] `/health/ready` - Kubernetes readiness probe
- [ ] `/health/detailed` - Full system status (authenticated)

### 4.4 Error Tracking & Alerting
**Complexity:** Small | **Duration:** 1 day

```
Dependencies: @sentry/node (or similar)
Files: apps/api/src/lib/sentry.ts (create)
```

Tasks:
- [ ] Sentry or similar error tracking
- [ ] Capture unhandled exceptions
- [ ] Add user context to errors
- [ ] Alert on error rate spikes

### 4.5 Performance Optimization
**Complexity:** Medium | **Duration:** 2-3 days

Tasks:
- [ ] Add database indexes for common queries
- [ ] Implement query result caching (Redis)
- [ ] Optimize embedding batch sizes
- [ ] Add connection pooling for Prisma
- [ ] Profile and optimize slow endpoints

---

## Phase 5: Slack Integration

**Goal:** Add Slack as query interface and data source.

**Duration:** 3-4 weeks | **Priority:** P2 (after core is solid)

### 5A: Slack Query Interface (Week 1-2)

#### 5A.1 Slack App Setup
**Complexity:** Small | **Duration:** 1 day

Tasks:
- [ ] Create Slack app in workspace
- [ ] Configure OAuth scopes (see below)
- [ ] Set up event subscriptions URL
- [ ] Install app to development workspace

OAuth Scopes:
```
app_mentions:read
chat:write
commands
users:read
```

#### 5A.2 Bolt SDK Integration
**Complexity:** Medium | **Duration:** 2-3 days

```
Files:
- apps/api/src/slack/app.ts (create)
- apps/api/src/slack/handlers/mention.ts (create)
- apps/api/src/slack/handlers/command.ts (create)
- apps/api/src/index.ts (add Slack routes)
Dependencies: @slack/bolt
```

Tasks:
- [ ] Initialize Bolt app with credentials
- [ ] Handle app_mention events
- [ ] Handle slash commands (/documind)
- [ ] Verify Slack signatures

#### 5A.3 Query Handler
**Complexity:** Medium | **Duration:** 2-3 days

```
Files:
- apps/api/src/slack/handlers/query.ts (create)
```

Flow:
1. Parse mention: `@DocuMind what's our remote work policy?`
2. Extract query text
3. Map Slack user → DocuMind org
4. Run search query
5. Format response with Block Kit
6. Reply in thread

#### 5A.4 Auth Mapping
**Complexity:** Medium | **Duration:** 2 days

```
Files:
- packages/db/prisma/schema.prisma (add SlackInstallation)
- apps/api/src/slack/auth.ts (create)
```

Tasks:
- [ ] Store Slack team ID → DocuMind org mapping
- [ ] OAuth installation flow
- [ ] Handle workspace uninstalls
- [ ] Multi-workspace support

#### 5A.5 Response Formatting
**Complexity:** Small | **Duration:** 1-2 days

```
Files:
- apps/api/src/slack/blocks/answer.ts (create)
- apps/api/src/slack/blocks/sources.ts (create)
```

Features:
- [ ] Block Kit message formatting
- [ ] Inline document previews
- [ ] Citation links
- [ ] Feedback buttons (👍 👎)
- [ ] "View in DocuMind" link

### 5B: Slack Conversation Ingestion (Week 3-4)

#### 5B.1 Channel Selection UI
**Complexity:** Medium | **Duration:** 2-3 days

```
Files:
- apps/web/src/routes/_authenticated/settings.integrations.tsx (modify)
- apps/api/src/trpc/routers/integrations.ts (create)
```

Features:
- [ ] List available Slack channels
- [ ] Toggle indexing per channel
- [ ] Show sync status and last sync time
- [ ] Privacy warning for channel selection

#### 5B.2 History Backfill
**Complexity:** Large | **Duration:** 3-4 days

```
Files:
- apps/api/src/slack/sync/backfill.ts (create)
- apps/api/src/jobs/workers/slack-backfill.ts (create)
```

Tasks:
- [ ] Fetch historical messages via conversations.history
- [ ] Paginate through all messages
- [ ] Rate limit handling (Slack tier limits)
- [ ] Progress tracking
- [ ] Resume from failure

#### 5B.3 Real-time Ingestion
**Complexity:** Medium | **Duration:** 2-3 days

```
Files:
- apps/api/src/slack/handlers/message.ts (create)
```

Tasks:
- [ ] Handle message events for indexed channels
- [ ] Process new messages as they arrive
- [ ] Handle message edits and deletes
- [ ] Batch processing for efficiency

#### 5B.4 Thread Handling
**Complexity:** Medium | **Duration:** 2 days

Tasks:
- [ ] Group thread replies as single conversation
- [ ] Maintain thread context
- [ ] Update when new replies added
- [ ] Handle thread-only channels

#### 5B.5 File Attachment Processing
**Complexity:** Medium | **Duration:** 2-3 days

```
Files:
- apps/api/src/slack/sync/files.ts (create)
```

Tasks:
- [ ] Detect file attachments in messages
- [ ] Download files via Slack API
- [ ] Run through document indexing pipeline
- [ ] Link to source message

#### 5B.6 Entity Extraction for Slack
**Complexity:** Medium | **Duration:** 2 days

Tasks:
- [ ] Extract entities from conversation text
- [ ] Map Slack @mentions to entities
- [ ] Track who said what (author attribution)
- [ ] Extract decisions and action items

---

## Execution Order (Recommended)

### Sprint 1 (Week 1-2): Knowledge Graph Core
Focus: Database + extraction pipeline

| Day | Tasks |
|-----|-------|
| 1 | 2.1 Database schema updates |
| 2-4 | 2.2 Entity extraction pipeline |
| 5-6 | 2.3 Entity resolution |
| 7-8 | 2.4 Integrate with indexer |
| 9-10 | 2.5 Entity API endpoints |

Deliverable: Entities extracted and stored for all documents

### Sprint 2 (Week 3-4): Intelligence + UI
Focus: Enhanced search + visualization

| Day | Tasks |
|-----|-------|
| 1-3 | 3.1 Graph-enhanced queries |
| 4-6 | 3.2 Entity detail pages |
| 7-8 | 2.6 Entity display in search |
| 9-10 | 3.3 Document quality signals |

Deliverable: Entity-aware search with UI

### Sprint 3 (Week 5): Production Hardening
Focus: Stability + monitoring

| Day | Tasks |
|-----|-------|
| 1-2 | 4.1 Background job queue |
| 3 | 4.2 Audit logging |
| 4 | 4.3 Health checks |
| 5 | 4.4 Error tracking |

Deliverable: Production-ready infrastructure

### Sprint 4 (Week 6-7): Relationship Visualization
Focus: Graph UI + polish

| Day | Tasks |
|-----|-------|
| 1-3 | 3.4 Relationship visualization |
| 4-5 | Polish and bug fixes |
| 6-7 | User testing and iteration |

Deliverable: Complete Knowledge Graph MVP

### Sprint 5 (Week 8-9): Slack Query Interface
Focus: Slack bot for queries

| Day | Tasks |
|-----|-------|
| 1 | 5A.1 Slack app setup |
| 2-3 | 5A.2 Bolt SDK integration |
| 4-5 | 5A.3 Query handler |
| 6-7 | 5A.4 Auth mapping |
| 8 | 5A.5 Response formatting |

Deliverable: Working @DocuMind bot

### Sprint 6 (Week 10-11): Slack Ingestion
Focus: Index Slack conversations

| Day | Tasks |
|-----|-------|
| 1-2 | 5B.1 Channel selection UI |
| 3-5 | 5B.2 History backfill |
| 6-7 | 5B.3 Real-time ingestion |
| 8-9 | 5B.4-5B.6 Threads, files, entities |

Deliverable: Full Slack integration

---

## Dependencies Map

```
                    ┌─────────────────┐
                    │  Current RAG    │
                    │   (Working)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │  Knowledge  │  │  Production │  │    Slack    │
     │    Graph    │  │  Hardening  │  │  Interface  │
     │  (Sprint 1) │  │  (Sprint 3) │  │  (Sprint 5) │
     └──────┬──────┘  └─────────────┘  └──────┬──────┘
            │                                  │
            ▼                                  ▼
     ┌─────────────┐                   ┌─────────────┐
     │ Intelligence│                   │    Slack    │
     │    Layer    │                   │  Ingestion  │
     │  (Sprint 2) │                   │  (Sprint 6) │
     └──────┬──────┘                   └─────────────┘
            │
            ▼
     ┌─────────────┐
     │   Graph     │
     │ Visualization│
     │  (Sprint 4) │
     └─────────────┘
```

**Parallel Tracks:**
- Production Hardening (Sprint 3) can run parallel to Sprint 1-2
- Slack Interface (Sprint 5) can start after Sprint 3

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Entity extraction quality | Use few-shot examples, validate with test set |
| Resolution false positives | Conservative matching, manual merge UI |
| Slack rate limits | Implement exponential backoff, batch operations |
| Performance at scale | Index optimization, caching, background processing |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Scope creep | Strict sprint boundaries, defer to backlog |
| Feature overload | MVP mindset, ship incremental value |
| Integration complexity | Start with query interface before ingestion |

---

## Success Criteria

### Sprint 1-2 (Knowledge Graph)
- [ ] Entities extracted from 100% of indexed documents
- [ ] <2s entity extraction per document
- [ ] Entity resolution accuracy >90%

### Sprint 3 (Production)
- [ ] Health checks passing
- [ ] Error tracking capturing exceptions
- [ ] Background jobs processing reliably

### Sprint 4 (Visualization)
- [ ] Graph renders <1s for 100 entities
- [ ] Navigation between entities smooth
- [ ] Mobile-responsive graph view

### Sprint 5-6 (Slack)
- [ ] @DocuMind responds <3s
- [ ] Channel sync completes without errors
- [ ] Slack entities linked to document entities

---

## Environment Variables (New)

```bash
# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Slack
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
SLACK_BOT_TOKEN=xoxb-...

# Error Tracking (optional)
SENTRY_DSN=...

# Feature Flags (optional)
ENABLE_ENTITY_EXTRACTION=true
ENABLE_SLACK_INTEGRATION=false
```

---

## Immediate Next Action

**Start with:** 2.1 Database Schema Updates

```bash
# Add Entity, EntityMention, Relationship models to schema
code packages/db/prisma/schema.prisma

# Run migration
pnpm --filter @documind/db prisma migrate dev --name add_entity_models
```

This unblocks all Knowledge Graph work and has zero risk to existing functionality.
