# DocuMind Product Roadmap

**Last Updated:** January 2025
**Status:** Phase 1 MVP → Phase 2 Knowledge Graph

---

## Overview

DocuMind is evolving from a basic RAG document search tool into an **Organizational Intelligence Platform** by:

1. **Phase 1:** Complete MVP with current custom RAG implementation
2. **Phase 2:** Migrate to Google's managed RAG (Gemini File Search) + build Knowledge Graph differentiation layer

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DocuMind Evolution                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Phase 1 (Now)              Phase 2 (Next)                         │
│   ─────────────              ──────────────                         │
│   Custom RAG                 Managed RAG + Knowledge Graph          │
│   • Our chunking             • Google File Search                   │
│   • Our embeddings           • Entity Extraction                    │
│   • Our vector search        • Relationship Mapping                 │
│   • Basic search UI          • Cross-Doc Intelligence               │
│                                                                      │
│   "Find documents"     →     "Understand your organization"         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: MVP Completion

**Timeline:** Weeks 1-2
**Goal:** Ship working product with current architecture

### Status

| Component | Status | Notes |
|-----------|--------|-------|
| Document upload | ✅ Complete | PDF, DOCX, TXT, MD, PPTX, XLSX |
| Text extraction | ✅ Complete | Multi-format support |
| Chunking | ✅ Complete | Configurable size/overlap |
| Embeddings | ✅ Complete | Vertex AI, OpenAI, mock |
| Vector search | ✅ Complete | In-memory (needs optimization) |
| RAG answers | ✅ Complete | With citations |
| Auth (Better Auth) | ✅ Complete | Email + Google OAuth |
| Multi-tenant | ✅ Complete | Organizations model |
| Search UI | ✅ Complete | Search + Ask AI modes |
| Documents UI | ✅ Complete | Upload, list, view |
| **tRPC auth context** | ❌ Broken | Session not extracted |
| **Dashboard UI** | ❌ Missing | Stats page needed |
| **Production deploy** | ❌ Pending | GCP setup needed |

### Week 1 Tasks

- [ ] Fix tRPC context to extract session from Better Auth
- [ ] Add organization membership checks to protected routes
- [ ] Test OAuth flow end-to-end (Google login)
- [ ] Verify document upload → indexing → search flow

### Week 2 Tasks

- [ ] Build dashboard page (document stats, search stats)
- [ ] Add basic analytics (searches per day, popular queries)
- [ ] Set up production environment on GCP
- [ ] Deploy and test in production
- [ ] Create basic onboarding flow

### Phase 1 Deliverable

A working document search application where users can:
1. Sign up / log in (email or Google)
2. Upload documents (PDF, DOCX, etc.)
3. Search documents semantically
4. Get AI-powered answers with citations

---

## Phase 2: Managed RAG + Knowledge Graph

**Timeline:** Weeks 3-8
**Goal:** Differentiated product with organizational intelligence

### Phase 2a: Infrastructure Migration (Weeks 3-4)

**Migrate from custom RAG to Google File Search**

| Remove | Add |
|--------|-----|
| `chunker.ts` | Gemini File Search client |
| `embeddings.ts` | File Search Store management |
| `vector-search.ts` | Search API integration |
| `indexer.ts` (most of it) | Simplified upload flow |
| DocumentChunk model | - |

**Benefits:**
- 40% cost reduction
- No pgvector migration needed
- Google handles scaling
- Focus on differentiation

#### Week 3 Tasks

- [ ] Create Gemini File Search API client
- [ ] Implement File Search Store per organization
- [ ] Migrate document upload to use File Search
- [ ] Update search to use File Search API
- [ ] Verify search quality matches current implementation

#### Week 4 Tasks

- [ ] Remove custom chunking code
- [ ] Remove custom embedding code
- [ ] Remove custom vector search code
- [ ] Simplify database schema (remove DocumentChunk)
- [ ] Update tests and documentation

### Phase 2b: Knowledge Graph Foundation (Weeks 5-6)

**Build entity extraction and graph storage**

```
┌─────────────────────────────────────────────────────────────────┐
│  Entity Types                                                    │
├─────────────────────────────────────────────────────────────────┤
│  PERSON       │ Names, titles, roles                            │
│  ORGANIZATION │ Companies, departments, teams                   │
│  PROJECT      │ Project names, initiatives                      │
│  MONEY        │ Amounts, budgets, deals                         │
│  DATE         │ Deadlines, milestones, events                   │
│  LOCATION     │ Offices, regions, addresses                     │
│  DOCUMENT     │ References to other documents                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Relationship Types                                             │
├─────────────────────────────────────────────────────────────────┤
│  AUTHORED     │ Person → Document                               │
│  WORKS_AT     │ Person → Organization                           │
│  MENTIONS     │ Document → Entity                               │
│  REFERENCES   │ Document → Document                             │
│  DEADLINE     │ Project → Date                                  │
│  BUDGET       │ Project → Money                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Week 5 Tasks

- [ ] Design entity extraction LLM prompt
- [ ] Implement extraction function (call Gemini)
- [ ] Create database schema for entities
- [ ] Create database schema for relationships
- [ ] Integrate extraction into document upload flow

#### Week 6 Tasks

- [ ] Implement entity resolution (normalize names)
- [ ] Build deduplication logic across documents
- [ ] Create entity API endpoints
- [ ] Add entity display in search results
- [ ] Build basic entity detail page

### Phase 2c: Intelligence Layer (Weeks 7-8)

**Add graph-enhanced features**

#### Week 7 Tasks

- [ ] Implement graph-enhanced queries
  - Extract entities from user query
  - Look up related entities in graph
  - Enrich search with entity context
- [ ] Build relationship visualization component
- [ ] Add "Related Documents" based on shared entities
- [ ] Create document quality scoring

#### Week 8 Tasks

- [ ] Polish entity detail pages
- [ ] Add cross-document connection display
- [ ] Implement staleness detection
- [ ] UI refinements and bug fixes
- [ ] Beta launch preparation

### Phase 2 Deliverables

An organizational intelligence platform where users can:
1. Search documents with AI answers (via Google File Search)
2. See entities extracted from their documents
3. Understand relationships between entities
4. Discover connections across documents
5. Get quality scores for document freshness

---

## Phase 3: Proactive Intelligence (Future)

**Timeline:** Q2 2025
**Goal:** Automated insights and notifications

### Features

- [ ] **Weekly Digests** - AI-generated summary of document changes
- [ ] **Alert Rules** - "Notify me when Company X is mentioned"
- [ ] **Deadline Tracking** - Extract and monitor dates from documents
- [ ] **Email Notifications** - Resend integration
- [ ] **Slack Integration** - Search and alerts in Slack

### Requirements

- Background job queue (BullMQ + Redis)
- Email service integration (Resend)
- Cron scheduler for digests

---

## Phase 4: Advanced Features (Future)

**Timeline:** Q3-Q4 2025
**Goal:** Enterprise-ready platform

### Features

- [ ] **AI Agents** - Multi-tool autonomous workflows
- [ ] **Table Extraction** - Structured data from PDFs
- [ ] **Google Drive Sync** - Automatic document ingestion
- [ ] **API Access** - Public API for integrations
- [ ] **SAML/OIDC SSO** - Enterprise identity
- [ ] **Audit Logs** - Complete activity trail
- [ ] **Admin Console** - User and org management

---

## Architecture Comparison

### Before (Phase 1 - Custom RAG)

```
User → Our API → Our Chunker → Our Embeddings → Our Vector DB → Our Search → LLM
                     ↓              ↓                ↓
              [Code to maintain] [Cost to pay] [Ops burden]
```

### After (Phase 2 - Managed + Graph)

```
User → Our API → Google File Search → LLM
           ↓
    Our Knowledge Graph
           ↓
    [Entity Extraction]
    [Graph Queries]
    [Intelligence Layer]
```

**Result:** We focus engineering on differentiation, not plumbing.

---

## Success Metrics

### Phase 1

| Metric | Target |
|--------|--------|
| Documents indexed | 100+ test docs |
| Search latency | < 2 seconds |
| Auth working | Email + OAuth |
| Deploy to prod | ✅ |

### Phase 2

| Metric | Target |
|--------|--------|
| Entities extracted | 10+ per doc average |
| Entity accuracy | > 85% precision |
| Search quality | Parity with Phase 1 |
| Infrastructure cost | 40% reduction |

### Phase 3+

| Metric | Target |
|--------|--------|
| Digest open rate | > 40% |
| Alert engagement | > 20% click rate |
| User retention | > 80% monthly |

---

## Risk Mitigation

| Risk | Phase | Mitigation |
|------|-------|------------|
| Auth bypass | 1 | Fix context immediately |
| Google API changes | 2 | Abstract API layer |
| Entity extraction accuracy | 2 | Confidence thresholds, human review |
| Search quality regression | 2 | A/B test before full migration |
| Scope creep | All | Strict phase boundaries |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jan 2025 | Pivot to Gemini File Search | 40% cost reduction, focus on differentiation |
| Jan 2025 | Knowledge Graph as moat | Competitors don't have this, compounds over time |
| Jan 2025 | PostgreSQL for graph (not Neo4j) | Simpler ops, sufficient for MVP scale |
| Jan 2025 | Defer AI agents to Phase 4 | High complexity, core graph more valuable first |

---

*Document Version: 1.0*
*Created: January 2025*
