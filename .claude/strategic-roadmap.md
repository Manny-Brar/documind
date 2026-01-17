# DocuMind Strategic Roadmap

## Executive Summary

DocuMind is an AI-powered document intelligence platform that helps teams search, understand, and collaborate on their knowledge. The platform differentiates through **Graph-Enhanced RAG** and **multi-channel integration** (documents + Slack).

**Current Status:** Phase 1 MVP Complete, Phase 5 Production Critical Complete

---

## Market Validation

### Target Market
- **AI-Driven Knowledge Management**: $5.23B (2024) → $35.8B (2029), **47.2% CAGR**
- **Conversational AI**: $10.7B (2024) → $49.9B (2030), **29.3% CAGR**
- **Enterprise Search**: $5.7B growing at 15% annually

### Competitive Landscape

| Competitor | Strength | DocuMind Differentiation |
|------------|----------|--------------------------|
| Glean | Deep enterprise search | Graph RAG + neobrutalism UX |
| Guru | Team knowledge cards | AI-first, document-native |
| Notion AI | Workspace integration | Deep document understanding |
| Slack AI | Native messaging context | Cross-channel intelligence |

### Key Insight
Complex queries like "What did John say about the Q3 budget in the marketing meeting?" require **entity understanding**:
- **Vector-only RAG**: ~0% accuracy (can't connect entities)
- **Graph-Enhanced RAG**: 90%+ accuracy

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Documents (PDF, DOCX)  │  Slack Conversations  │  Future: Drive   │
└───────────┬─────────────┴──────────┬────────────┴─────────┬─────────┘
            │                        │                      │
            ▼                        ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INGESTION LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Gemini File Search (Managed RAG)  │  Entity Extraction Pipeline   │
└───────────────┬────────────────────┴──────────────┬─────────────────┘
                │                                   │
                ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  Knowledge Graph (Entities + Relationships)  │  Document Index      │
│  • PERSON, ORGANIZATION, PROJECT, DATE       │  • Full-text search  │
│  • AUTHORED, WORKS_AT, MENTIONS              │  • Semantic search   │
└───────────────────────────────────────────────────────────────────────┘
                │                                   │
                ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      QUERY LAYER                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Graph-Enhanced Search  │  Grounded Answers  │  Citation Tracking   │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     INTERFACE LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Web Dashboard (Primary)  │  Slack Bot (@DocuMind)  │  Future: API  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: MVP Completion ✅ COMPLETE

**Duration:** Week 1-2 | **Status:** Complete

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 1.1 | Fix tRPC Auth Context - Org membership validation | ✅ | `b962cb4` |
| 1.2 | Invitation Acceptance Flow - Token-based invites | ✅ | `23c5a94` |
| 1.3 | Verify OAuth & Session Flow | ✅ | Verified |
| 1.4 | Production Deployment Config - Cloud Build + env | ✅ | `a93f2a2` |

---

## Phase 2: Gemini File Search Migration

**Duration:** Week 3-4 | **Priority:** P0 Critical

**Goal:** Replace custom RAG (chunking + embeddings) with Google's managed Gemini File Search for reduced infrastructure complexity.

### Tasks

| ID | Task | Complexity | Files |
|----|------|------------|-------|
| 2.1 | Create Gemini File Search Client | Large | `apps/api/src/lib/gemini-file-search.ts` |
| 2.2 | Update Database Schema | Small | `packages/db/prisma/schema.prisma` |
| 2.3 | Migrate Document Upload | Medium | `documents.ts`, `indexer.ts` |
| 2.4 | Update Search Router | Medium | `search.ts`, `rag-generator.ts` |
| 2.5 | Remove Legacy RAG Code | Small | Delete `chunker.ts`, `embeddings.ts`, `vector-search.ts` |

### Key Changes
- File Search Store per organization
- Upload documents directly to Gemini
- Grounded search with automatic citations
- No more chunk management

---

## Phase 3: Knowledge Graph Foundation

**Duration:** Week 5-6 | **Priority:** P0 Critical

**Goal:** Extract entities and relationships to enable complex queries that vector search alone cannot answer.

### Database Schema

```prisma
model Entity {
  id             String   @id @default(cuid())
  orgId          String
  type           String   // PERSON, ORGANIZATION, PROJECT, DATE, MONEY, LOCATION
  name           String
  normalizedName String   // For fuzzy matching
  metadata       Json?
  mentions       EntityMention[]
  organization   Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, type])
  @@index([normalizedName])
}

model EntityMention {
  id         String   @id @default(cuid())
  entityId   String
  documentId String
  position   Int?
  context    String?  // Surrounding text
  entity     Entity   @relation(fields: [entityId], references: [id])
  document   Document @relation(fields: [documentId], references: [id])
}

model Relationship {
  id             String @id @default(cuid())
  sourceEntityId String
  targetEntityId String
  type           String // AUTHORED, WORKS_AT, MENTIONS, DISCUSSED_IN
  documentId     String
  confidence     Float?
}
```

### Tasks

| ID | Task | Complexity | Description |
|----|------|------------|-------------|
| 3.1 | Entity Extraction Pipeline | Medium | LLM-based extraction with confidence scores |
| 3.2 | Graph Database Schema | Medium | Prisma models for entities/relationships |
| 3.3 | Integrate with Document Upload | Medium | Run extraction after Gemini upload |
| 3.4 | Entity Resolution | Large | Fuzzy matching, merge duplicates |
| 3.5 | Entity API Endpoints | Medium | CRUD for entities, relationships |
| 3.6 | Entity UI in Search | Small | Badges, filters, entity pages |

---

## Phase 4: Intelligence Layer

**Duration:** Week 7-8 | **Priority:** P1 High

**Goal:** Combine Graph + Gemini for superior query understanding.

### Tasks

| ID | Task | Complexity | Description |
|----|------|------------|-------------|
| 4.1 | Graph-Enhanced Queries | Large | Extract entities from query, add context |
| 4.2 | Entity Detail Pages | Medium | Mentions, relationships, timeline view |
| 4.3 | Document Quality Scoring | Medium | Freshness, completeness, staleness warnings |
| 4.4 | Relationship Visualization | Medium | Interactive node-link diagram |

### Query Enhancement Example

**User Query:** "What did John say about Q3 budget?"

**Graph Enhancement:**
1. Extract entities: `John` (PERSON), `Q3 budget` (PROJECT/TOPIC)
2. Find John's mentions across documents
3. Find budget-related documents
4. Add context to Gemini search
5. Return answer with citations

---

## Phase 5: Production Readiness ✅ CRITICAL COMPLETE

**Duration:** Ongoing | **Status:** Core Complete

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 5.1 | Stripe Billing Integration | ✅ | `cb67331` |
| 5.2 | Email Service (Resend) | ✅ | `c07e287` |
| 5.3 | Background Job Queue (BullMQ) | Pending | - |
| 5.4 | Audit Logging | Pending | - |
| 5.5 | Health Checks & Env Validation | Pending | - |

### Key Integrations Complete
- **Stripe**: Checkout sessions, billing portal, webhook handlers
- **Resend**: Neobrutalism-styled invitation and welcome emails

---

## Phase 6: Slack Integration

**Duration:** Week 9-12 | **Priority:** P1 High (Post-Graph)

**Goal:** Add Slack as both a **data source** and **query interface**.

### Why Slack?
1. **80% of team knowledge lives in conversations** - never documented
2. **Natural query interface** - ask questions where you work
3. **Real-time context** - decisions, discussions, approvals
4. **File attachments** - documents shared in Slack channels

### Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        SLACK WORKSPACE                              │
├────────────────────────────────────────────────────────────────────┤
│  #general  │  #engineering  │  #sales  │  @DocuMind (bot user)     │
└─────┬──────┴───────┬────────┴────┬─────┴──────────┬────────────────┘
      │              │             │                │
      │ Event API    │ Event API   │ Event API      │ Slash Commands
      ▼              ▼             ▼                ▼
┌────────────────────────────────────────────────────────────────────┐
│                    SLACK BOLT SDK                                   │
├────────────────────────────────────────────────────────────────────┤
│  Message Events  │  File Events  │  App Mentions  │  /documind     │
└─────────┬────────┴───────┬───────┴───────┬────────┴───────┬────────┘
          │                │               │                │
          ▼                ▼               ▼                ▼
┌────────────────────────────────────────────────────────────────────┐
│                    DOCUSMIND API                                    │
├────────────────────────────────────────────────────────────────────┤
│  Ingest Service  │  File Processor  │  Query Handler  │  Response  │
└──────────────────┴──────────────────┴─────────────────┴────────────┘
```

### Phase 6A: Slack Query Interface (Week 9-10)

**Start here - immediate value, simpler implementation**

| ID | Task | Complexity | Description |
|----|------|------------|-------------|
| 6A.1 | Slack App Setup | Small | Create app, configure OAuth, install to workspace |
| 6A.2 | Bolt SDK Integration | Medium | Add @slack/bolt to API, handle events |
| 6A.3 | Query Handler | Medium | @DocuMind mentions → search → threaded response |
| 6A.4 | Auth Mapping | Medium | Link Slack user → DocuMind org via Slack team ID |
| 6A.5 | Response Formatting | Small | Block Kit with citations, inline previews |
| 6A.6 | Slash Commands | Small | /documind search, /documind status |

**User Experience:**
```
@DocuMind what's our policy on remote work?

DocuMind APP  10:32 AM
Based on the Employee Handbook (last updated March 2024):

📄 Remote Work Policy
• Employees may work remotely up to 3 days per week
• Manager approval required for full remote
• Core hours: 10am-3pm local time

Sources:
• employee-handbook.pdf (page 23)
• hr-policy-update-2024.docx
```

### Phase 6B: Slack Conversation Ingestion (Week 11-12)

**Adds team conversation context to knowledge base**

| ID | Task | Complexity | Description |
|----|------|------------|-------------|
| 6B.1 | Channel Selection UI | Medium | Admin selects which channels to index |
| 6B.2 | History Backfill | Large | Fetch historical messages via conversations.history |
| 6B.3 | Real-time Ingestion | Medium | Process new messages as they arrive |
| 6B.4 | Thread Handling | Medium | Group thread replies as single document |
| 6B.5 | File Attachment Processing | Medium | Download and index files shared in Slack |
| 6B.6 | Entity Extraction for Slack | Medium | Extract people, topics from conversations |
| 6B.7 | Privacy Controls | Medium | Exclude DMs, respect channel permissions |

**Data Model:**
```prisma
model SlackChannel {
  id          String   @id @default(cuid())
  orgId       String
  channelId   String   // Slack channel ID
  channelName String
  isIndexed   Boolean  @default(false)
  lastSyncAt  DateTime?
  organization Organization @relation(fields: [orgId], references: [id])

  @@unique([orgId, channelId])
}

model SlackMessage {
  id          String   @id @default(cuid())
  orgId       String
  channelId   String
  messageTs   String   // Slack timestamp (unique ID)
  threadTs    String?  // Parent thread timestamp
  userId      String
  userName    String
  text        String
  files       Json?    // Attached file metadata
  createdAt   DateTime

  @@unique([channelId, messageTs])
}
```

### Slack OAuth Scopes Required

```
# For Query Interface (6A)
app_mentions:read
chat:write
commands
users:read

# For Conversation Ingestion (6B)
channels:history
channels:read
files:read
groups:history (private channels)
groups:read
```

---

## Complexity Assessment

### Total Implementation Effort

| Phase | Weeks | Key Deliverables |
|-------|-------|------------------|
| Phase 1: MVP | 2 | ✅ Complete |
| Phase 2: Gemini Migration | 2 | Managed RAG, simplified infra |
| Phase 3: Knowledge Graph | 2 | Entity extraction, relationships |
| Phase 4: Intelligence | 2 | Graph-enhanced queries, visualizations |
| Phase 5: Production | Ongoing | Billing, email, jobs - ✅ Core complete |
| Phase 6A: Slack Query | 2 | @DocuMind bot, slash commands |
| Phase 6B: Slack Ingest | 2 | Channel indexing, file processing |

**Total New Development:** ~10 weeks remaining

### Infrastructure Requirements

| Component | Provider | Cost Estimate |
|-----------|----------|---------------|
| Cloud Run (API) | GCP | $50-200/mo |
| Cloud SQL (Postgres) | GCP | $50-100/mo |
| Cloud Storage | GCP | $10-50/mo |
| Gemini API | Google | Pay per use |
| Redis (BullMQ) | Upstash/GCP | $10-30/mo |
| Resend | Resend | Free tier to $20/mo |
| Stripe | Stripe | 2.9% + 30¢ per transaction |

---

## Why This Architecture Wins

### Slack + Graph RAG = Complementary Layers

| Layer | Purpose | Without It |
|-------|---------|------------|
| **Slack Data** | Team conversations, decisions, context | Miss 80% of organizational knowledge |
| **Graph RAG** | Entity understanding, complex queries | Can't answer "What did X say about Y?" |
| **Gemini Search** | Semantic search, grounded answers | No document search capability |

### The Full Stack
1. **Documents** provide formal knowledge (policies, reports)
2. **Slack** provides informal knowledge (decisions, discussions)
3. **Graph** connects entities across both
4. **Gemini** provides grounded search

### Competitive Moat
- **Slack AI** only searches Slack
- **Google Drive** only searches documents
- **DocuMind** searches both with entity intelligence

---

## Environment Variables

### Required for Production

```bash
# Core
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
CORS_ORIGIN=https://app.documind.com

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Stripe (Complete)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...

# Email (Complete)
RESEND_API_KEY=re_...
EMAIL_FROM=DocuMind <noreply@documind.app>

# GCP
GCP_PROJECT_ID=...
GCS_BUCKET=...

# Gemini (Phase 2)
GOOGLE_AI_API_KEY=...

# Slack (Phase 6)
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
SLACK_BOT_TOKEN=xoxb-...
```

---

## Success Metrics

### Product Metrics
- **Query Accuracy**: 90%+ for complex entity queries
- **Time to Answer**: <5s for typical queries
- **User Adoption**: 80% of team members active weekly

### Business Metrics
- **Conversion**: Free → Paid within 30 days
- **Retention**: 90% monthly retention
- **NPS**: >50

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-01-16 | Initial strategic roadmap created | Claude |
| 2024-01-16 | Added Slack integration phases | Claude |
| 2024-01-16 | Phase 1 & 5 marked complete | Claude |
