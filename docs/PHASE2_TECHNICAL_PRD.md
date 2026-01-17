# DocuMind Phase 2: Organizational Intelligence Platform

## Technical Product Requirements Document

**Version:** 2.0
**Date:** January 2025
**Status:** Strategic Pivot Approved - Ready for Implementation

---

## Strategic Context: Managed RAG + Knowledge Graph

### The Pivot

Following Google's November 2025 launch of **Gemini File Search**, we are pivoting our Phase 2 approach:

| Before (Custom RAG) | After (Managed + Graph) |
|---------------------|-------------------------|
| Build chunking, embeddings, vector search | Use Google File Search (managed) |
| Maintain infrastructure | Focus on differentiation |
| 6-8 weeks to production | 4-6 weeks to production |
| $300/mo @ 10K docs | $180/mo @ 10K docs |

### What Google File Search Provides (We Don't Build)

```
✅ Document storage (FREE)
✅ Automatic chunking
✅ Embedding generation (FREE at query time)
✅ Vector indexing and search
✅ RAG answer generation with citations
✅ Multi-format support (PDF, DOCX, XLSX, code)
✅ Up to 100MB per file
```

### What We Build (Our Moat)

```
✅ Knowledge Graph (entities, relationships)
✅ Entity Extraction Pipeline
✅ Cross-Document Intelligence
✅ Graph-Enhanced Queries
✅ Document Quality Scoring
✅ Proactive Alerts & Digests (Phase 3)
✅ Beautiful UI/UX
```

### Code Changes

**Remove:**
- `chunker.ts` - Google handles
- `embeddings.ts` - Google handles
- `vector-search.ts` - Google handles
- `DocumentChunk` model - Not needed
- pgvector migration - Not needed

**Add:**
- Gemini File Search client
- Entity extraction pipeline
- Knowledge Graph schema
- Graph-enhanced query logic

---

## Executive Summary

Phase 2 transforms DocuMind from a RAG-based document search tool into a comprehensive **Organizational Intelligence Platform**. By leveraging Google's managed RAG infrastructure, we focus engineering effort on differentiation:

**Core Capabilities (Phase 2):**
1. **Gemini File Search Integration** - Managed RAG infrastructure
2. **Knowledge Graph** - Entity-relationship mapping
3. **Entity Extraction** - LLM-powered named entity recognition
4. **Document Intelligence** - Quality scoring & staleness detection

**Future Capabilities (Phase 3+):**
5. **AI Agents** - Multi-tool autonomous workflows
6. **Proactive Intelligence** - Automated digests & alerts
7. **Smart Data Extraction** - Tables, figures, structured data

---

## 0. Gemini File Search Integration (Foundation)

### 0.1 Overview

[Gemini File Search](https://ai.google.dev/gemini-api/docs/file-search) is Google's fully managed RAG system that eliminates our need to build chunking, embedding, and vector search infrastructure.

### 0.2 How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Gemini File Search Flow                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. UPLOAD                                                          │
│     User uploads PDF → We send to File Search API                   │
│     Google: chunks, embeds, indexes (one-time $0.15/1M tokens)     │
│                                                                      │
│  2. STORE                                                           │
│     Documents persist in "File Search Store" (FREE storage)        │
│     One store per organization                                      │
│                                                                      │
│  3. SEARCH                                                          │
│     User query → File Search API                                    │
│     Google: embeds query (FREE), finds similar chunks              │
│     Returns: relevant passages with citations                       │
│                                                                      │
│  4. GENERATE                                                        │
│     Passages + query → Gemini LLM                                   │
│     Returns: AI answer with source citations                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 0.3 Implementation

```typescript
// File Search Store Management
interface FileSearchStore {
  id: string;
  name: string;
  orgId: string;
  documentCount: number;
  createdAt: Date;
}

// Create store per organization
async function createFileSearchStore(orgId: string): Promise<FileSearchStore> {
  const response = await genai.fileSearchStores.create({
    displayName: `documind-${orgId}`,
  });
  return {
    id: response.name,
    name: response.displayName,
    orgId,
    documentCount: 0,
    createdAt: new Date(),
  };
}

// Upload document to File Search
async function uploadToFileSearch(
  file: Buffer,
  fileName: string,
  storeId: string
): Promise<string> {
  // Upload file
  const uploadedFile = await genai.files.upload({
    file: new Blob([file]),
    config: { displayName: fileName },
  });

  // Import to store for indexing
  await genai.fileSearchStores.importFile({
    name: storeId,
    file: uploadedFile.name,
  });

  return uploadedFile.name; // Google's file ID
}

// Search with File Search
async function searchWithFileSearch(
  query: string,
  storeId: string
): Promise<SearchResult[]> {
  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [{ fileSearch: { store: storeId } }],
  });

  const result = await model.generateContent(query);

  // Extract answer and citations
  return {
    answer: result.response.text(),
    sources: result.response.citations.map(c => ({
      fileId: c.fileId,
      passage: c.content,
      startIndex: c.startIndex,
      endIndex: c.endIndex,
    })),
  };
}
```

### 0.4 Database Schema (Simplified)

```sql
-- Documents (lightweight - Google stores content)
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),

  -- Google File Search IDs
  google_file_id VARCHAR(255),      -- File API ID
  google_store_id VARCHAR(255),     -- File Search Store ID

  -- Metadata (we store)
  name VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,

  -- Status tracking
  upload_status VARCHAR(20) DEFAULT 'pending',  -- pending, uploaded, indexed, failed
  entity_extraction_status VARCHAR(20) DEFAULT 'pending',

  -- Timestamps
  uploaded_at TIMESTAMP DEFAULT NOW(),
  indexed_at TIMESTAMP,
  entity_extracted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- File Search Stores (one per org)
CREATE TABLE file_search_stores (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) UNIQUE,
  google_store_id VARCHAR(255) NOT NULL,
  document_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- NOTE: No DocumentChunk table needed!
-- NOTE: No embedding storage needed!
-- NOTE: No pgvector needed!
```

### 0.5 Migration Steps

1. **Create File Search client** - New `lib/file-search.ts`
2. **Add store management** - Create store on org creation
3. **Update document upload** - Send to File Search API
4. **Update search** - Use File Search instead of custom vector search
5. **Remove old code** - Delete chunker, embeddings, vector-search
6. **Simplify schema** - Remove DocumentChunk model

---

## 1. Knowledge Graph Architecture

### 1.1 Research Findings

Based on extensive research into [Microsoft's GraphRAG](https://microsoft.github.io/graphrag/) and [Neo4j RAG implementations](https://neo4j.com/blog/developer/rag-tutorial/), the GraphRAG approach provides significant advantages over traditional vector-only RAG:

| Capability | Traditional RAG | GraphRAG |
|------------|-----------------|----------|
| Hallucination Rate | 15-30% | 5-10% |
| Multi-hop Reasoning | Limited | Strong |
| Relationship Context | None | Full |
| Explainability | Low | High |
| Global Queries | Poor | Excellent |

**Key Insight:** "Baseline RAG struggles to connect the dots when answering a question requires traversing disparate pieces of information through their shared attributes" - [Microsoft Research](https://www.microsoft.com/en-us/research/project/graphrag/)

### 1.2 Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DocuMind Knowledge Graph                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   PERSON    │────│   WORKS_AT  │────│   COMPANY   │             │
│  │ John Smith  │    │  since 2023 │    │  Acme Corp  │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│        │                                      │                      │
│        │ AUTHORED                             │ SIGNED                │
│        ▼                                      ▼                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  DOCUMENT   │────│  MENTIONS   │────│   PROJECT   │             │
│  │ Q4 Report   │    │  $2.5M deal │    │   Alpha     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│        │                                      │                      │
│        │ CONTAINS                             │ DEADLINE              │
│        ▼                                      ▼                      │
│  ┌─────────────┐                       ┌─────────────┐             │
│  │    TABLE    │                       │    DATE     │             │
│  │ Revenue Q4  │                       │  2025-03-15 │             │
│  └─────────────┘                       └─────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Entity Types (Priority Order)

| Entity Type | Examples | Extraction Method |
|------------|----------|-------------------|
| **PERSON** | Names, titles, roles | LLM + NER |
| **ORGANIZATION** | Companies, departments, teams | LLM + NER |
| **PROJECT** | Project names, codenames | LLM context |
| **MONEY** | Amounts, currencies, deals | Regex + LLM |
| **DATE** | Deadlines, milestones, events | Regex + NER |
| **DOCUMENT** | References to other docs | Link detection |
| **LOCATION** | Offices, regions, addresses | NER |
| **PRODUCT** | Product names, versions | Domain-specific |

### 1.4 Relationship Types

```typescript
type RelationshipType =
  | "AUTHORED"       // Person -> Document
  | "WORKS_AT"       // Person -> Organization
  | "MENTIONS"       // Document -> Entity
  | "REFERENCES"     // Document -> Document
  | "SIGNED"         // Organization -> Document
  | "DEADLINE"       // Project -> Date
  | "BUDGET"         // Project -> Money
  | "LOCATED_IN"     // Organization -> Location
  | "REPORTS_TO"     // Person -> Person
  | "PART_OF";       // Entity -> Entity (hierarchical)
```

### 1.5 Database Strategy: Hybrid Approach

**Research Conclusion:** Based on [comprehensive comparison analysis](https://zilliz.com/blog/pgvector-vs-neo4j-a-comprehensive-vector-database-comparison), we recommend a **hybrid approach**:

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Vector Search | PostgreSQL + pgvector | Already in stack, simpler ops |
| Knowledge Graph | PostgreSQL + Custom Schema | Avoid new db, sufficient for MVP |
| Future Scale | Neo4j Migration Path | When graph complexity warrants |

**Phase 2a Schema (PostgreSQL):**

```sql
-- Entity storage
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(500) NOT NULL,
  normalized_name VARCHAR(500), -- lowercase, deduped
  metadata JSONB,
  first_seen_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  mention_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Relationship storage
CREATE TABLE entity_relationships (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  source_entity_id UUID REFERENCES entities(id),
  target_entity_id UUID REFERENCES entities(id),
  relationship_type VARCHAR(50) NOT NULL,
  properties JSONB, -- confidence, extracted_from, etc.
  document_id UUID REFERENCES documents(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document-entity links
CREATE TABLE document_entities (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  entity_id UUID REFERENCES entities(id),
  chunk_id UUID, -- which chunk contains this mention
  confidence FLOAT,
  context TEXT, -- surrounding text snippet
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for graph traversal
CREATE INDEX idx_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX idx_entities_type_org ON entities(org_id, type);
CREATE INDEX idx_entities_normalized ON entities(org_id, normalized_name);
```

---

## 2. Entity Extraction Pipeline

### 2.1 Research Findings

Based on [GPT-NER research (NAACL 2025)](https://aclanthology.org/2025.findings-naacl.239/) and [AWS Bedrock NER patterns](https://aws.amazon.com/blogs/machine-learning/use-zero-shot-large-language-models-on-amazon-bedrock-for-custom-named-entity-recognition/):

**Key Approaches:**
1. **Zero-shot LLM extraction** - No training data needed, ~85% accuracy
2. **Few-shot with examples** - 5-10 examples, ~92% accuracy
3. **Chain-of-Thought prompting** - Reduces hallucination, ~73% F1 → better than basic
4. **Self-verification** - LLM validates its own extractions, reduces false positives

**Performance Benchmarks:**
- GPT-4o with prompt ensemble: F1 = 0.95, Recall = 0.98
- Chain-of-Thought prompting: 20% improvement over basic prompting
- Few-shot GPT-4: Matches fine-tuned BERT models without training data

### 2.2 Extraction Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Entity Extraction Pipeline                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Document Upload                                                     │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. Chunking (existing)                                      │   │
│  │     - Split into ~500 token chunks                          │   │
│  │     - Preserve paragraph boundaries                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  2. Entity Extraction (NEW)                                  │   │
│  │     - LLM prompt with entity schema                          │   │
│  │     - Structured JSON output                                 │   │
│  │     - Confidence scores per entity                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  3. Entity Resolution (NEW)                                  │   │
│  │     - Normalize names ("John Smith" = "J. Smith")           │   │
│  │     - Merge duplicates across chunks                        │   │
│  │     - Link to existing entities in org                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  4. Relationship Extraction (NEW)                            │   │
│  │     - Identify relationships between entities               │   │
│  │     - Extract relationship properties                       │   │
│  │     - Store in graph structure                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  5. Embedding + Indexing (existing, enhanced)               │   │
│  │     - Generate embeddings with entity context               │   │
│  │     - Index for hybrid search (vector + graph)              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 LLM Prompt Design

```typescript
const ENTITY_EXTRACTION_PROMPT = `
You are an expert entity extraction system. Extract all named entities from the text.

## Entity Types to Extract:
- PERSON: Names of individuals (include titles if present)
- ORGANIZATION: Companies, departments, teams, institutions
- PROJECT: Project names, initiatives, codenames
- MONEY: Financial amounts with currency
- DATE: Specific dates, deadlines, time periods
- LOCATION: Physical locations, addresses, regions
- PRODUCT: Product names, versions, SKUs

## Output Format (JSON):
{
  "entities": [
    {
      "text": "exact text from document",
      "type": "ENTITY_TYPE",
      "normalized": "canonical form",
      "confidence": 0.0-1.0,
      "context": "surrounding sentence"
    }
  ],
  "relationships": [
    {
      "source": "entity text",
      "target": "entity text",
      "type": "RELATIONSHIP_TYPE",
      "confidence": 0.0-1.0
    }
  ]
}

## Guidelines:
1. Only extract entities explicitly mentioned in the text
2. Use the exact text as it appears for the "text" field
3. Normalize names: "Dr. John Smith" → "John Smith"
4. Include confidence scores (0.9+ for clear mentions, lower for ambiguous)
5. Extract relationships only when clearly stated

## Text to Process:
{chunk_text}
`;
```

### 2.4 Entity Resolution Strategy

```typescript
interface EntityResolver {
  // Step 1: Normalize entity text
  normalize(entity: ExtractedEntity): string;

  // Step 2: Find potential matches in existing entities
  findCandidates(normalized: string, orgId: string): Entity[];

  // Step 3: Score match confidence
  scoreMatch(extracted: ExtractedEntity, candidate: Entity): number;

  // Step 4: Merge or create
  resolveEntity(extracted: ExtractedEntity, orgId: string): Entity;
}

// Normalization rules
const normalizationRules = {
  PERSON: [
    "lowercase",
    "remove_titles",       // Dr., Mr., Ms., etc.
    "remove_suffixes",     // Jr., III, PhD, etc.
    "standardize_initials" // J. Smith → j smith
  ],
  ORGANIZATION: [
    "lowercase",
    "remove_legal_suffixes", // Inc., LLC, Ltd., etc.
    "expand_abbreviations"   // IBM → international business machines
  ],
  // ... other entity types
};
```

---

## 3. Document Intelligence

### 3.1 Research Findings

According to [enterprise RAG research](https://ragaboutit.com/why-enterprise-rag-systems-need-continuous-learning-a-technical-guide-to-dynamic-knowledge-updates/):

> "73% of organizations report accuracy degradation in their RAG systems within 90 days of deployment, primarily due to knowledge staleness."

**Key Metrics to Track:**
1. **Freshness Score** - How recently was this document updated?
2. **Quality Score** - Is this document well-structured and complete?
3. **Relevance Score** - How often is this document accessed/cited?
4. **Entropy Score** - How volatile is this content type?

### 3.2 Document Quality Scoring Model

```typescript
interface DocumentQualityScore {
  overall: number;        // 0-100 composite score
  freshness: number;      // Based on last modified date
  completeness: number;   // Missing sections, TODOs, etc.
  structure: number;      // Headings, formatting, organization
  readability: number;    // Flesch-Kincaid or similar
  entityDensity: number;  // Rich in extractable entities
  citationCount: number;  // Referenced by other docs
}

// Quality calculation
function calculateQualityScore(doc: Document): DocumentQualityScore {
  return {
    overall: weighted_average([
      { score: freshness, weight: 0.25 },
      { score: completeness, weight: 0.20 },
      { score: structure, weight: 0.15 },
      { score: readability, weight: 0.15 },
      { score: entityDensity, weight: 0.10 },
      { score: citationCount, weight: 0.15 }
    ]),
    // ... individual scores
  };
}
```

### 3.3 Staleness Detection System

```typescript
interface StalenessConfig {
  // Content type volatility (days until considered stale)
  volatilityMap: {
    "pricing": 30,
    "policy": 90,
    "process": 180,
    "reference": 365,
    "archive": null  // Never stale
  };

  // Signals that indicate staleness
  stalenessSignals: [
    "contains_outdated_dates",     // References past deadlines
    "broken_internal_links",        // Links to deleted docs
    "conflicting_information",      // Contradicts newer docs
    "low_access_frequency",         // Not being used
    "author_departed",              // Author no longer with org
    "superseded_by_newer"           // Newer version exists
  ];
}

// Staleness score (0 = fresh, 100 = definitely stale)
interface StalenessAssessment {
  score: number;
  signals: string[];
  lastReviewed: Date | null;
  suggestedAction: "none" | "review" | "update" | "archive";
  assignedReviewer?: string;
}
```

### 3.4 Quality Dashboard Schema

```sql
-- Document quality metrics
CREATE TABLE document_quality (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id) UNIQUE,
  overall_score INTEGER, -- 0-100
  freshness_score INTEGER,
  completeness_score INTEGER,
  structure_score INTEGER,
  readability_score INTEGER,
  entity_density_score INTEGER,
  citation_count INTEGER,
  staleness_score INTEGER,
  staleness_signals JSONB,
  last_calculated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality history for trending
CREATE TABLE document_quality_history (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  overall_score INTEGER,
  calculated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. AI Agents Framework

### 4.1 Research Findings

Based on comprehensive [2025 AI agent framework analysis](https://www.getmaxim.ai/articles/top-5-ai-agent-frameworks-in-2025-a-practical-guide-for-ai-builders/):

| Framework | Adoption | Best For | Learning Curve |
|-----------|----------|----------|----------------|
| **LangGraph** | LinkedIn, Uber, 400+ companies | Complex workflows, cycles, state | Medium |
| **CrewAI** | 60% of Fortune 500 | Role-based teams, rapid deployment | Low |
| **AutoGen** | Microsoft research | Prototyping, flexibility | Medium |

**Recommendation:** Start with **custom lightweight implementation**, migrate to LangGraph if complexity warrants.

**Rationale:**
1. Avoid framework lock-in during early exploration
2. DocuMind's initial agents are relatively simple
3. Can adopt LangGraph patterns without full dependency
4. CrewAI's role-based approach influences our agent design

### 4.2 DocuMind Agent Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DocuMind Agent System                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Query: "What were Q4 results and who was responsible?"        │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Orchestrator Agent                                          │   │
│  │  - Analyzes query intent                                     │   │
│  │  - Plans tool sequence                                       │   │
│  │  - Delegates to specialized agents                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ├──────────────────┬──────────────────┐                       │
│       ▼                  ▼                  ▼                       │
│  ┌──────────┐     ┌──────────┐      ┌──────────┐                   │
│  │ Search   │     │  Graph   │      │ Analysis │                   │
│  │  Agent   │     │  Agent   │      │  Agent   │                   │
│  ├──────────┤     ├──────────┤      ├──────────┤                   │
│  │ Tools:   │     │ Tools:   │      │ Tools:   │                   │
│  │ -Vector  │     │ -Entity  │      │ -Summarize│                   │
│  │  search  │     │  lookup  │      │ -Compare  │                   │
│  │ -Keyword │     │ -Graph   │      │ -Calculate│                   │
│  │  search  │     │  traverse│      │ -Extract  │                   │
│  └──────────┘     └──────────┘      └──────────┘                   │
│       │                  │                  │                       │
│       └──────────────────┴──────────────────┘                       │
│                          │                                          │
│                          ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Response Synthesizer                                        │   │
│  │  - Combines results from all agents                         │   │
│  │  - Generates coherent response                              │   │
│  │  - Includes source citations                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Agent Tool Definitions

```typescript
// Tool interface
interface AgentTool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any, context: AgentContext) => Promise<ToolResult>;
}

// Core tools for DocuMind agents
const AGENT_TOOLS: AgentTool[] = [
  {
    name: "vector_search",
    description: "Search documents using semantic similarity",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", default: 10 },
        filters: { type: "object" }
      },
      required: ["query"]
    },
    execute: async (params, ctx) => { /* existing search */ }
  },
  {
    name: "entity_lookup",
    description: "Find all information about a specific entity (person, company, project)",
    parameters: {
      type: "object",
      properties: {
        entityName: { type: "string" },
        entityType: { type: "string", enum: ["PERSON", "ORGANIZATION", "PROJECT"] }
      },
      required: ["entityName"]
    },
    execute: async (params, ctx) => { /* graph lookup */ }
  },
  {
    name: "graph_traverse",
    description: "Find relationships between entities",
    parameters: {
      type: "object",
      properties: {
        startEntity: { type: "string" },
        endEntity: { type: "string" },
        maxHops: { type: "number", default: 3 }
      },
      required: ["startEntity"]
    },
    execute: async (params, ctx) => { /* graph traversal */ }
  },
  {
    name: "document_summarize",
    description: "Generate a summary of a document or section",
    parameters: {
      type: "object",
      properties: {
        documentId: { type: "string" },
        section: { type: "string", description: "Optional section to summarize" }
      },
      required: ["documentId"]
    },
    execute: async (params, ctx) => { /* LLM summarization */ }
  },
  {
    name: "compare_documents",
    description: "Compare two documents and highlight differences",
    parameters: {
      type: "object",
      properties: {
        documentId1: { type: "string" },
        documentId2: { type: "string" },
        aspect: { type: "string", description: "What aspect to compare" }
      },
      required: ["documentId1", "documentId2"]
    },
    execute: async (params, ctx) => { /* comparison logic */ }
  },
  {
    name: "extract_data",
    description: "Extract specific data points from documents",
    parameters: {
      type: "object",
      properties: {
        documentId: { type: "string" },
        dataType: { type: "string", enum: ["table", "dates", "amounts", "contacts"] }
      },
      required: ["documentId", "dataType"]
    },
    execute: async (params, ctx) => { /* extraction logic */ }
  }
];
```

### 4.4 Agent Execution Loop

```typescript
interface AgentState {
  messages: Message[];
  tools_called: ToolCall[];
  current_plan: string[];
  iteration: number;
  max_iterations: number;
}

async function runAgent(
  query: string,
  context: AgentContext
): Promise<AgentResponse> {
  const state: AgentState = {
    messages: [{ role: "user", content: query }],
    tools_called: [],
    current_plan: [],
    iteration: 0,
    max_iterations: 10
  };

  while (state.iteration < state.max_iterations) {
    // 1. Ask LLM what to do next
    const response = await llm.chat({
      messages: state.messages,
      tools: AGENT_TOOLS,
      system: ORCHESTRATOR_PROMPT
    });

    // 2. Check if done
    if (response.finish_reason === "stop") {
      return {
        answer: response.content,
        sources: extractSources(state),
        tools_used: state.tools_called
      };
    }

    // 3. Execute tool calls
    if (response.tool_calls) {
      for (const call of response.tool_calls) {
        const tool = AGENT_TOOLS.find(t => t.name === call.name);
        const result = await tool.execute(call.parameters, context);

        state.tools_called.push({ ...call, result });
        state.messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result)
        });
      }
    }

    state.iteration++;
  }

  return { answer: "Max iterations reached", sources: [], tools_used: state.tools_called };
}
```

---

## 5. Proactive Intelligence System

### 5.1 Research Findings

From [enterprise alerting research](https://www.workgrid.com/platform/notifications):

> "Workgrid's AI Assistant increases efficiency by integrating with business applications to surface real-time notifications, tasks, and alerts right in the flow of work."

**Key Capabilities:**
1. **Digest Summaries** - Regular rollups to reduce alert fatigue
2. **Smart Prioritization** - AI ranks alerts by relevance
3. **Channel Integration** - Slack, Teams, Email delivery
4. **Threshold Alerts** - Trigger on specific conditions

### 5.2 Proactive Intelligence Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Proactive Intelligence Engine                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Event Sources                                                │   │
│  │  • Document uploads          • Entity changes               │   │
│  │  • Search patterns           • Quality score changes         │   │
│  │  • User activity             • Deadline approaching         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Event Processor                                             │   │
│  │  • Aggregate events by type and time window                 │   │
│  │  • Apply user subscription filters                          │   │
│  │  • Calculate relevance scores                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ├──────────────────┬──────────────────┐                       │
│       ▼                  ▼                  ▼                       │
│  ┌──────────┐     ┌──────────┐      ┌──────────┐                   │
│  │ Instant  │     │  Daily   │      │  Weekly  │                   │
│  │  Alerts  │     │  Digest  │      │  Report  │                   │
│  ├──────────┤     ├──────────┤      ├──────────┤                   │
│  │ High-pri │     │ Summary  │      │ AI-gen   │                   │
│  │ events   │     │ of day's │      │ insights │                   │
│  │ only     │     │ activity │      │ & trends │                   │
│  └──────────┘     └──────────┘      └──────────┘                   │
│       │                  │                  │                       │
│       └──────────────────┴──────────────────┘                       │
│                          │                                          │
│                          ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Delivery Channels                                           │   │
│  │  • Email           • Slack           • In-app               │   │
│  │  • Teams           • Webhook         • Push notification    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Subscription & Alert Schema

```sql
-- User notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),

  -- Digest settings
  digest_frequency VARCHAR(20), -- 'daily', 'weekly', 'none'
  digest_day INTEGER,           -- 0-6 for weekly (0=Sunday)
  digest_time TIME,             -- Preferred delivery time

  -- Instant alert settings
  instant_alerts_enabled BOOLEAN DEFAULT true,
  instant_alert_channels JSONB, -- ['email', 'slack', 'in_app']

  -- Subscription filters
  subscribed_entities JSONB,    -- Entity IDs to watch
  subscribed_document_types JSONB,
  subscribed_tags JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Alert rules (org-level)
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  name VARCHAR(200),
  description TEXT,

  -- Rule definition
  trigger_type VARCHAR(50),    -- 'document_upload', 'entity_mention', 'deadline', etc.
  conditions JSONB,            -- Filter conditions

  -- Action
  action_type VARCHAR(50),     -- 'notify', 'email', 'webhook'
  action_config JSONB,

  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alert history
CREATE TABLE alerts_sent (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  alert_rule_id UUID REFERENCES alert_rules(id),
  alert_type VARCHAR(50),
  title VARCHAR(500),
  content TEXT,
  metadata JSONB,
  read_at TIMESTAMP,
  clicked_at TIMESTAMP,
  sent_at TIMESTAMP DEFAULT NOW()
);
```

### 5.4 Weekly Digest Generation

```typescript
interface WeeklyDigest {
  period: { start: Date; end: Date };
  summary: string;  // AI-generated executive summary

  sections: {
    newDocuments: {
      count: number;
      highlights: DocumentSummary[];
    };

    entityActivity: {
      newEntities: number;
      mostMentioned: EntityMention[];
      newRelationships: Relationship[];
    };

    searchInsights: {
      topQueries: string[];
      unansweredQuestions: string[];
      trendingTopics: string[];
    };

    qualityAlerts: {
      staleDocuments: Document[];
      lowQualityDocuments: Document[];
      upcomingDeadlines: Deadline[];
    };

    recommendations: string[];  // AI-generated suggestions
  };
}

async function generateWeeklyDigest(
  orgId: string,
  userId: string
): Promise<WeeklyDigest> {
  // 1. Gather data from past week
  const newDocs = await getNewDocuments(orgId, 7);
  const entityChanges = await getEntityChanges(orgId, 7);
  const searchPatterns = await getSearchPatterns(orgId, userId, 7);
  const qualityIssues = await getQualityIssues(orgId);

  // 2. Generate AI summary
  const summary = await llm.generate({
    prompt: DIGEST_SUMMARY_PROMPT,
    context: { newDocs, entityChanges, searchPatterns, qualityIssues }
  });

  // 3. Compile digest
  return {
    period: { start: subDays(new Date(), 7), end: new Date() },
    summary,
    sections: {
      newDocuments: { count: newDocs.length, highlights: top5(newDocs) },
      entityActivity: formatEntityActivity(entityChanges),
      searchInsights: formatSearchInsights(searchPatterns),
      qualityAlerts: formatQualityAlerts(qualityIssues),
      recommendations: await generateRecommendations(orgId, userId)
    }
  };
}
```

---

## 6. Smart Data Extraction

### 6.1 Research Findings

From [Nanonets table extraction research](https://nanonets.com/blog/table-extraction-using-llms-unlocking-structured-data-from-documents/):

> "LLMs offer contextual understanding of tables including surrounding text, allowing for more accurate interpretation. These models can recognize and adapt to various table structures including complex, unpredictable, and non-standard layouts."

**Key Approaches:**
1. **Vision Language Models (VLMs)** - Best for complex layouts
2. **PDF parsing + LLM** - Good for well-structured PDFs
3. **OCR + LLM** - Required for scanned documents

### 6.2 Table Extraction Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Table Extraction Pipeline                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PDF Document                                                        │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. Table Detection                                          │   │
│  │     - Identify table regions in document                    │   │
│  │     - Classify table type (data, comparison, schedule)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  2. Structure Recognition                                    │   │
│  │     - Identify headers, rows, columns                       │   │
│  │     - Handle merged cells, nested tables                    │   │
│  │     - Extract cell boundaries                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  3. Content Extraction                                       │   │
│  │     - OCR for scanned content                               │   │
│  │     - Text extraction for digital PDFs                      │   │
│  │     - Number/date parsing                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  4. Semantic Understanding                                   │   │
│  │     - LLM interprets table meaning                          │   │
│  │     - Generates natural language description                │   │
│  │     - Links to entities in knowledge graph                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  5. Output Generation                                        │   │
│  │     - JSON structured data                                  │   │
│  │     - CSV/Excel export option                               │   │
│  │     - Markdown for display                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Table Schema

```sql
-- Extracted tables
CREATE TABLE extracted_tables (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  org_id UUID REFERENCES organizations(id),

  -- Location in document
  page_number INTEGER,
  bounding_box JSONB,  -- {x, y, width, height}

  -- Table structure
  headers JSONB,       -- ["Column1", "Column2", ...]
  rows JSONB,          -- [[cell1, cell2], [cell3, cell4], ...]
  row_count INTEGER,
  column_count INTEGER,

  -- Semantic understanding
  table_type VARCHAR(50),    -- 'financial', 'schedule', 'comparison', etc.
  description TEXT,          -- AI-generated description
  entities_referenced JSONB, -- Entity IDs mentioned in table

  -- Export formats cached
  markdown TEXT,
  csv TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Table cells with entity links
CREATE TABLE table_cells (
  id UUID PRIMARY KEY,
  table_id UUID REFERENCES extracted_tables(id),
  row_index INTEGER,
  column_index INTEGER,
  value TEXT,
  value_type VARCHAR(20),  -- 'text', 'number', 'date', 'currency'
  parsed_value JSONB,      -- Structured parsed value
  entity_id UUID REFERENCES entities(id),  -- If cell references an entity
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Implementation Roadmap (Updated for Managed RAG)

### Phase 1 Completion (Weeks 1-2) - Prerequisites

**Week 1: Fix Critical Issues**
- [ ] Fix tRPC auth context (extract session from Better Auth)
- [ ] Add organization membership checks
- [ ] Test OAuth flow end-to-end
- [ ] Verify current search flow works

**Week 2: MVP Polish**
- [ ] Build dashboard page with stats
- [ ] Complete onboarding flow
- [ ] Deploy to production (GCP)
- [ ] Document current architecture

### 7.1 Phase 2a: Infrastructure Migration (Weeks 3-4)

**Week 3: Gemini File Search Integration**
- [ ] Create Gemini File Search API client (`lib/file-search.ts`)
- [ ] Implement File Search Store management per organization
- [ ] Update document upload to use File Search API
- [ ] Add store ID tracking to documents table

**Week 4: Migration & Cleanup**
- [ ] Migrate search to use File Search API
- [ ] Verify search quality parity with current implementation
- [ ] Remove `chunker.ts`, `embeddings.ts`, `vector-search.ts`
- [ ] Remove DocumentChunk model from schema
- [ ] Update tests and documentation

### 7.2 Phase 2b: Knowledge Graph (Weeks 5-6)

**Week 5: Entity Extraction**
- [ ] Design entity extraction LLM prompt
- [ ] Create entities and relationships tables
- [ ] Implement extraction function (async after File Search indexing)
- [ ] Build entity resolution and normalization logic

**Week 6: Graph Integration**
- [ ] Integrate entity extraction into document upload flow
- [ ] Create entity API endpoints (list, get, search)
- [ ] Add entity display in search results
- [ ] Build basic entity detail page

### 7.3 Phase 2c: Intelligence Layer (Weeks 7-8)

**Week 7: Graph-Enhanced Features**
- [ ] Implement graph-enhanced queries (add entity context)
- [ ] Build relationship visualization component
- [ ] Add "Related Documents" based on shared entities
- [ ] Create cross-document connection display

**Week 8: Quality & Polish**
- [ ] Implement document quality scoring
- [ ] Add staleness detection (based on document age, access patterns)
- [ ] Polish entity detail pages
- [ ] UI refinements and bug fixes
- [ ] **Beta Launch**

### Future Phases (After Beta)

**Phase 3: Proactive Intelligence (Q2 2025)**
- Weekly digest generation
- Alert rules engine
- Email notifications (Resend)
- Slack integration

**Phase 4: Advanced Features (Q3-Q4 2025)**
- AI Agents with multi-tool workflows
- Table extraction from PDFs
- Google Drive sync
- API access for integrations

---

## 8. Technical Decisions Summary (Updated)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **RAG Infrastructure** | Gemini File Search | 40% cost reduction, managed scaling, focus on differentiation |
| Knowledge Graph DB | PostgreSQL | Sufficient for MVP, no additional ops burden |
| Entity Extraction | Gemini 2.5 Flash | Same provider as File Search, good accuracy |
| LLM for Answers | Gemini 2.5 Flash/Pro | Native integration with File Search |
| Notifications | Resend (future) | Simple, reliable email delivery |
| Background Jobs | Defer to Phase 3 | Not needed for initial File Search integration |

### Code to Remove

```
REMOVE (Google handles):
├── apps/api/src/lib/chunker.ts
├── apps/api/src/lib/embeddings.ts
├── apps/api/src/lib/vector-search.ts
├── apps/api/src/lib/indexer.ts (simplify)
└── packages/db/prisma/schema.prisma (DocumentChunk model)
```

### Code to Add

```
ADD (Our differentiation):
├── apps/api/src/lib/file-search.ts          # Gemini File Search client
├── apps/api/src/lib/entity-extraction.ts    # LLM-based NER
├── apps/api/src/lib/entity-resolution.ts    # Normalize & dedupe
├── apps/api/src/trpc/routers/entities.ts    # Entity API
└── apps/web/src/routes/_authenticated/entities/ # Entity UI
```

---

## 9. Success Metrics

| Metric | Current | Phase 2 Target |
|--------|---------|----------------|
| Entities Extracted | 0 | 10+ per doc average |
| Graph Relationships | 0 | 5+ per doc average |
| Quality Score Coverage | 0% | 100% of docs |
| Agent Query Success | N/A | 80%+ satisfaction |
| Digest Open Rate | N/A | 40%+ |
| Table Extraction Accuracy | N/A | 90%+ |

---

## 10. Research Sources

### Knowledge Graphs & GraphRAG
- [Microsoft GraphRAG](https://microsoft.github.io/graphrag/)
- [Microsoft Research - GraphRAG Project](https://www.microsoft.com/en-us/research/project/graphrag/)
- [Neo4j RAG Tutorial](https://neo4j.com/blog/developer/rag-tutorial/)
- [GraphRAG Explained - Zilliz](https://medium.com/@zilliz_learn/graphrag-explained-enhancing-rag-with-knowledge-graphs-3312065f99e1)
- [IBM - What is GraphRAG](https://www.ibm.com/think/topics/graphrag)

### Entity Extraction
- [GPT-NER - NAACL 2025](https://aclanthology.org/2025.findings-naacl.239/)
- [AWS Bedrock NER](https://aws.amazon.com/blogs/machine-learning/use-zero-shot-large-language-models-on-amazon-bedrock-for-custom-named-entity-recognition/)
- [Databricks Structured Extraction](https://community.databricks.com/t5/technical-blog/end-to-end-structured-extraction-with-llm-part-1-batch-entity/ba-p/98396)
- [LLMs to Knowledge Graphs - Medium](https://medium.com/@claudiubranzan/from-llms-to-knowledge-graphs-building-production-ready-graph-systems-in-2025-2b4aff1ec99a)

### AI Agent Frameworks
- [Top AI Agent Frameworks 2025 - Codecademy](https://www.codecademy.com/article/top-ai-agent-frameworks-in-2025)
- [LangGraph vs AutoGen vs CrewAI - Latenode](https://latenode.com/blog/langgraph-vs-autogen-vs-crewai-complete-ai-agent-framework-comparison-architecture-analysis-2025)
- [AI Agent Framework Comparison - Turing](https://www.turing.com/resources/ai-agent-frameworks)
- [Best AI Agent Frameworks - Langwatch](https://langwatch.ai/blog/best-ai-agent-frameworks-in-2025-comparing-langgraph-dspy-crewai-agno-and-more)

### Document Quality & Staleness
- [Enterprise RAG Continuous Learning - RAGaboutit](https://ragaboutit.com/why-enterprise-rag-systems-need-continuous-learning-a-technical-guide-to-dynamic-knowledge-updates/)
- [IBM Data Quality Management](https://www.ibm.com/think/topics/data-quality-management)
- [Bloomfire Knowledge Management](https://www.siit.io/blog/tools-for-knowledge-management)

### Proactive Intelligence
- [Workgrid AI Notifications](https://www.workgrid.com/platform/notifications)
- [Proactive Monitoring - Datadog](https://www.datadoghq.com/monitoring/proactive-monitoring/)
- [AI-Powered Business Alerts - TurnTwo](https://turntwo.com/article/get-notified-and-be-proactive-ai-powered-business-alerts)

### Table Extraction
- [Table Extraction with LLMs - Nanonets](https://nanonets.com/blog/table-extraction-using-llms-unlocking-structured-data-from-documents/)
- [Reducto - AI Document Parsing](https://reducto.ai/)
- [PDFs to Structured Data - Explosion AI](https://explosion.ai/blog/pdfs-nlp-structured-data)
- [Smallpdf Table Extraction](https://smallpdf.com/blog/extract-structure-tables-scanned-pdfs-using-ai)

### Database Comparison
- [pgvector vs Neo4j - Zilliz](https://zilliz.com/blog/pgvector-vs-neo4j-a-comprehensive-vector-database-comparison)
- [Neo4j vs PostgreSQL - Medium](https://medium.com/self-study-notes/exploring-graph-database-capabilities-neo4j-vs-postgresql-105c9e85bb5d)

---

*Document Version: 1.0*
*Created: January 2025*
*Status: Research Complete, Ready for Review*
