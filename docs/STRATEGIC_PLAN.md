# DocuMind Strategic Business Plan

## Executive Summary

DocuMind is an **Organizational Intelligence Platform** that combines Google's managed RAG infrastructure with a proprietary Knowledge Graph layer to help organizations not just search their documents, but understand the relationships, entities, and insights within them.

**Strategic Pivot (January 2025):** Following Google's November 2025 launch of Gemini File Search, we are pivoting from building custom RAG infrastructure to leveraging managed services with a differentiated Knowledge Graph layer on top.

**Market Opportunity**: The global RAG market is valued at $1.92B in 2025 and projected to reach $10.2B by 2030 (CAGR 39.66%). Knowledge Graph RAG is emerging as the next evolution, with Microsoft's GraphRAG demonstrating 70-90% reduction in hallucinations.

**Our Moat**: While RAG infrastructure becomes commoditized, Knowledge Graphs representing organizational intelligence become increasingly valuable and harder to replicate over time.

---

## Market Analysis

### Market Size & Growth

| Metric | 2024-2025 | 2030 Projection |
|--------|-----------|-----------------|
| RAG Market Size | $1.2B - $1.92B | $10.2B - $32.6B |
| CAGR | - | 39% - 49% |
| Enterprise Adoption | 73% in large orgs | 85%+ expected |
| AI Use Cases Using RAG | 30-60% | 70%+ expected |

### Key Market Drivers

1. **Accuracy Requirements**: RAG reduces AI hallucinations by 70-90%
2. **Information Overload**: Organizations need 40% faster information discovery
3. **Cost Pressure**: 25-30% operational cost reduction reported
4. **Compliance Needs**: Audit trails and source attribution mandatory in regulated industries

---

## Competitive Landscape

### Direct Competitors

| Competitor | Pricing | Strengths | Weaknesses |
|------------|---------|-----------|------------|
| **Glean** | Custom enterprise | 100+ integrations, ex-Google team | No free trial, expensive |
| **Guru** | $25/user/month | Knowledge creation, verification | Less focus on search |
| **Coveo** | Custom | E-commerce strength, ML | Complex, enterprise-only |
| **Elastic** | Usage-based | Open source, customizable | Technical setup required |
| **Algolia** | $30+/month | Speed, developer-friendly | Limited AI features |

### Our Differentiation Strategy

1. **Knowledge Graph Layer**: Entity extraction, relationship mapping, cross-document intelligence
2. **Managed Infrastructure**: Google File Search handles RAG complexity, we focus on value
3. **Organizational Intelligence**: Not just search - understand who, what, when, and how things connect
4. **Neobrutalism Design**: Distinctive, memorable UI that stands out
5. **Transparent Pricing**: No hidden costs, usage visible in dashboard
6. **Graph-Enhanced Queries**: "Show me all contracts involving Company X" - impossible with basic RAG

### Why Knowledge Graph is Our Moat

> "Companies are increasingly seeing knowledge graphs as their long-term moat, since they can act as a scalable structured representation of domain expertise."

| Capability | Basic RAG (Competitors) | DocuMind (Graph + RAG) |
|------------|-------------------------|------------------------|
| Find documents | ✅ | ✅ |
| Answer questions | ✅ | ✅ |
| Entity visibility | ❌ | ✅ "Who is mentioned?" |
| Relationship mapping | ❌ | ✅ "How are they connected?" |
| Cross-doc intelligence | ❌ | ✅ "What else involves this?" |
| Proactive insights | ❌ | ✅ "Deadlines approaching" |

---

## Target Customer Segments

### Tier 1: SMB (5-50 employees) - Land

| Attribute | Value |
|-----------|-------|
| Target Industries | Law firms, consulting, agencies, tech startups |
| Pain Points | Manual document search, knowledge silos |
| Decision Maker | CEO, Operations Manager |
| Deal Size | $99-299/month |
| Sales Motion | Self-serve + product-led growth |

### Tier 2: Mid-Market (50-500 employees) - Expand

| Attribute | Value |
|-----------|-------|
| Target Industries | Healthcare, Finance, Manufacturing |
| Pain Points | Compliance, training, customer support |
| Decision Maker | CTO, VP of Operations |
| Deal Size | $499-1,999/month |
| Sales Motion | Inside sales + demo |

### Tier 3: Enterprise (500+ employees) - Strategic

| Attribute | Value |
|-----------|-------|
| Target Industries | Banking, Insurance, Government |
| Pain Points | Security, audit trails, scale |
| Decision Maker | CIO, CISO |
| Deal Size | $5,000-50,000+/month |
| Sales Motion | Enterprise sales + POC |

---

## Pricing Strategy

### Model: Hybrid (Base + Usage)

Based on 2025 trends, we'll use a **credits-based hybrid model** that combines predictable base pricing with usage flexibility.

### Proposed Tiers

#### Starter - $0/month (Freemium)
- 3 users
- 100 documents
- 500 searches/month
- 50 AI questions/month
- Community support
- **Purpose**: Land, activate, convert

#### Professional - $99/month
- 10 users
- 1,000 documents
- 5,000 searches/month
- 500 AI questions/month
- Google Drive integration
- Email support
- **Purpose**: SMB growth segment

#### Business - $299/month
- 25 users
- 10,000 documents
- 25,000 searches/month
- 2,500 AI questions/month
- All integrations
- SSO (Google)
- Priority support
- **Purpose**: Growing teams

#### Enterprise - Custom
- Unlimited users
- Unlimited documents
- Custom limits
- SAML/OIDC SSO
- Audit logs
- SLA guarantee
- Dedicated support
- On-prem option
- **Purpose**: Strategic accounts

### Add-ons (Usage Credits)
- Additional AI Questions: $20/1,000
- Additional Storage: $10/10GB
- Additional Users: $10/user/month
- API Access: $49/month + usage

---

## Feature Roadmap

### Phase 1: MVP Foundation (Current)
- [x] Document upload (PDF, DOCX, TXT, MD)
- [x] Semantic vector search (custom implementation)
- [x] RAG answer generation
- [x] Multi-org support
- [x] Basic usage tracking
- [x] Google OAuth
- [ ] **Fix auth context** - Complete session handling
- [ ] **Complete dashboard UI** - Stats, activity
- [ ] **Production deployment** - GCP setup

### Phase 2: Managed RAG + Knowledge Graph (Q1-Q2 2025)

**Infrastructure Pivot:**
- [ ] **Migrate to Gemini File Search** - Replace custom chunking/embedding/vector search
- [ ] **Remove custom RAG code** - Simplify codebase significantly

**Knowledge Graph Layer (Our Differentiation):**
- [ ] **Entity Extraction Pipeline** - LLM-based NER for people, companies, projects, dates, money
- [ ] **Entity Resolution** - Normalize "John Smith" = "J. Smith", deduplicate
- [ ] **Relationship Mapping** - WORKS_AT, AUTHORED, MENTIONS, SIGNED, etc.
- [ ] **Graph Storage** - PostgreSQL schema for entities + relationships
- [ ] **Graph-Enhanced Queries** - Add entity context to searches
- [ ] **Entity Detail Pages** - View all docs mentioning an entity
- [ ] **Relationship Visualization** - See how things connect

**Document Intelligence:**
- [ ] **Quality Scoring** - Freshness, completeness, structure
- [ ] **Staleness Detection** - Flag outdated documents
- [ ] **Cross-Document Links** - "This doc references that doc"

### Phase 3: Proactive Intelligence (Q2 2025)
- [ ] **Weekly Digests** - AI-generated summary of changes
- [ ] **Alert Rules** - "Notify me when X is mentioned"
- [ ] **Deadline Tracking** - Extract and monitor dates
- [ ] **Email Integration** - Resend for notifications
- [ ] **Slack Integration** - Alerts and search

### Phase 4: Advanced Features (Q3-Q4 2025)
- [ ] **AI Agents** - Multi-tool autonomous workflows
- [ ] **Table Extraction** - Structured data from PDFs
- [ ] **Google Drive Sync** - Automatic document ingestion
- [ ] **API Access** - Embed search in other apps
- [ ] **SAML/OIDC SSO** - Enterprise identity
- [ ] **Audit Logs** - Complete activity trail

### Phase 5: Platform (2026)
- [ ] **Marketplace** - Third-party integrations
- [ ] **Self-Hosted** - On-premise deployment
- [ ] **Mobile Apps** - iOS/Android
- [ ] **Custom Models** - Fine-tuned for customer data

---

## Go-to-Market Strategy

### Phase 1: Product-Led Growth (Months 1-6)

**Tactics:**
1. Launch on Product Hunt
2. SEO content: "How to search documents with AI"
3. YouTube tutorials
4. Free tier for virality
5. Integration with Google Workspace Marketplace

**Metrics:**
- 1,000 free signups
- 100 paid conversions
- $10K MRR

### Phase 2: Inside Sales (Months 6-12)

**Tactics:**
1. Hire 2 SDRs
2. LinkedIn outreach to legal/consulting firms
3. Partner with consultants
4. Case studies from Phase 1 customers
5. Webinars on "Document AI for [Industry]"

**Metrics:**
- 500 paying customers
- 20 mid-market deals
- $50K MRR

### Phase 3: Enterprise Sales (Months 12-24)

**Tactics:**
1. Hire enterprise AE
2. SOC 2 Type II certification
3. Partner with system integrators
4. Attend industry conferences
5. Enterprise POC program

**Metrics:**
- 5 enterprise contracts
- $200K MRR
- $2.4M ARR

---

## Technical Architecture

### Target Architecture (Post-Pivot)

```
┌─────────────────────────────────────────────────────────────────┐
│  OUR LAYER (Differentiation)                                    │
│                                                                 │
│  Frontend: React + TanStack Router (Neobrutalism UI)           │
│  Backend: Fastify + tRPC                                       │
│  Database: PostgreSQL + Prisma (entities, relationships only)  │
│  Auth: Better Auth                                             │
│  Email: Resend                                                 │
│                                                                 │
│  NEW: Entity Extraction (LLM calls)                            │
│  NEW: Knowledge Graph queries                                  │
│  NEW: Graph-enhanced search                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GOOGLE LAYER (Managed - Pay per use)                          │
│                                                                 │
│  Gemini File Search: Storage, chunking, embeddings, search     │
│  Gemini LLM: Answer generation with citations                  │
│  (Optional) Vertex AI Search: Google Drive connector           │
└─────────────────────────────────────────────────────────────────┘
```

### What Google Handles (We Don't Build)
- Document storage (FREE)
- Automatic chunking
- Embedding generation (FREE at query time)
- Vector indexing
- Semantic search
- RAG answer generation
- Source citations

### What We Build (Our Value)
- Entity extraction pipeline
- Entity resolution and normalization
- Knowledge Graph storage
- Graph-enhanced queries
- Cross-document intelligence
- Proactive alerts and digests
- Beautiful UI/UX

### Code Removal (Phase 2)
```
REMOVE:
- chunker.ts (Google handles)
- embeddings.ts (Google handles)
- vector-search.ts (Google handles)
- indexer.ts → simplify to entity extraction only
- DocumentChunk model (not needed)
- pgvector migration (not needed)

KEEP:
- Better Auth integration
- Multi-tenant organization model
- tRPC API structure
- UI components
- Usage tracking
```

### Cost Comparison

| Component | Custom RAG (Before) | Managed + Graph (After) |
|-----------|---------------------|-------------------------|
| Storage | GCS + PostgreSQL | Google File Search (FREE) |
| Embeddings | Vertex AI calls | Google (FREE at query) |
| Vector DB | pgvector (ops burden) | Google (managed) |
| Search | Custom code | Google API |
| Infrastructure | $300/mo @ 10K docs | $180/mo @ 10K docs |

**Savings: ~40% + reduced engineering complexity**

---

## Key Metrics & KPIs

### Product Metrics
- **Activation Rate**: % of signups who upload first document
- **Search Quality**: Click-through on results
- **Answer Accuracy**: Thumbs up/down on AI answers
- **Time to Value**: Minutes from signup to first answer

### Business Metrics
- **MRR/ARR**: Monthly/Annual recurring revenue
- **CAC**: Customer acquisition cost
- **LTV**: Lifetime value per customer
- **Churn Rate**: Monthly cancellation rate
- **NPS**: Net promoter score

### Target Unit Economics
- **CAC Payback**: < 12 months
- **LTV:CAC Ratio**: > 3:1
- **Gross Margin**: > 70% (after AI costs)
- **Logo Churn**: < 5% monthly

---

## Investment Requirements

### Phase 1: Bootstrap (Months 1-6)
- **Investment**: $0 (self-funded)
- **Focus**: Product-market fit
- **Team**: 1-2 founders

### Phase 2: Seed (Months 6-12)
- **Investment**: $500K-1M
- **Focus**: Growth + team
- **Team**: 5-8 people

### Phase 3: Series A (Months 18-24)
- **Investment**: $3-5M
- **Focus**: Scale + enterprise
- **Team**: 15-25 people

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI costs spike | Usage limits, model optimization, caching |
| Large competitors copy | Speed to market, niche focus, relationships |
| Data security breach | SOC 2, encryption, regular audits |
| LLM provider changes | Multi-provider support, abstraction layer |
| Customer churn | Strong onboarding, customer success |

---

## Immediate Next Steps (8 Weeks)

### Phase 1 Completion (Weeks 1-2)
1. Fix tRPC auth context (session extraction from Better Auth)
2. Complete dashboard UI with stats
3. Test current MVP end-to-end
4. Deploy to production (GCP)

### Phase 2a: Infrastructure Pivot (Weeks 3-4)
1. Integrate Gemini File Search API
2. Remove custom chunking/embedding/vector code
3. Migrate document upload flow
4. Verify search quality parity

### Phase 2b: Knowledge Graph (Weeks 5-6)
1. Implement entity extraction pipeline
2. Create graph schema (entities, relationships)
3. Build entity resolution logic
4. Add entity display to search results

### Phase 2c: Intelligence Layer (Weeks 7-8)
1. Graph-enhanced queries
2. Entity detail pages
3. Document quality scoring
4. Polish UI and launch beta

---

## Appendix: Research Sources

### Market & Business
- [Enterprise RAG Guide 2025](https://www.glean.com/blog/the-definitive-guide-to-ai-based-enterprise-search-for-2025)
- [RAG Business Value](https://www.uptech.team/blog/rag-use-cases)
- [AI Pricing Models 2025](https://pilot.com/blog/ai-pricing-economics-2025)
- [Enterprise Knowledge Systems 2026-2030](https://nstarxinc.com/blog/the-next-frontier-of-rag-how-enterprise-knowledge-systems-will-evolve-2026-2030/)
- [Knowledge Graph RAG Opportunity](https://medium.com/enterprise-rag/understanding-the-knowledge-graph-rag-opportunity-694b61261a9c)

### Google Services (Strategic Pivot)
- [Gemini File Search Announcement](https://blog.google/technology/developers/file-search-gemini-api/)
- [File Search Documentation](https://ai.google.dev/gemini-api/docs/file-search)
- [Vertex AI RAG Engine](https://cloud.google.com/blog/products/ai-machine-learning/introducing-vertex-ai-rag-engine)
- [RAG Pipeline Simplification](https://jduncan.io/blog/2025-11-08-google-file-search-rag-simplification/)

### Knowledge Graphs
- [Microsoft GraphRAG](https://microsoft.github.io/graphrag/)
- [DeepLearning.AI - Knowledge Graphs for RAG](https://www.deeplearning.ai/short-courses/knowledge-graphs-rag/)
- [Neo4j RAG Tutorial](https://neo4j.com/blog/developer/rag-tutorial/)
- [GPT-NER Entity Extraction](https://aclanthology.org/2025.findings-naacl.239/)

---

*Document created: January 2025*
*Last updated: Strategic Pivot to Managed RAG + Knowledge Graph*
