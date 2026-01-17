# DocuMind Changelog

All notable changes to this project are documented in this file.

---

## [Unreleased] - 2026-01-17

### Sprint 5 & 6: Slack Integration - COMPLETED

Complete Slack integration enabling both query interface and message ingestion pipeline.

---

## Sprint 5: Slack Query Interface

**Goal:** Enable users to query DocuMind directly from Slack using slash commands.

### 5.1 Database Schema (COMPLETED)

Added Prisma models for Slack workspace management:

- `SlackWorkspace` - Stores workspace connection details, OAuth tokens, and scopes
- `SlackUserMapping` - Maps Slack users to DocuMind users for permission enforcement

**Files:**
- `packages/db/prisma/schema.prisma` - Extended with Slack models

### 5.2 Slack Service Core (COMPLETED)

Implemented Slack Bolt.js integration with support for:

- **Socket Mode** (development) - No public URL required
- **HTTP Mode** (production) - OAuth-only routes via Fastify

**Files:**
- `apps/api/src/lib/slack/index.ts` - Core Slack service with Bolt app initialization
- `apps/api/src/lib/slack/handlers.ts` - Slash command and event handlers
- `apps/api/src/lib/slack/oauth.ts` - OAuth installation flow

**Key Functions:**
- `isSlackConfigured()` - Check if Slack environment is ready
- `isSlackOAuthConfigured()` - Check OAuth credentials
- `getSlackApp()` - Get/create Bolt app instance
- `formatSearchResultBlocks()` - Block Kit formatting for RAG responses

### 5.3 Slash Command Handler (COMPLETED)

Implemented `/documind [question]` slash command:

1. Maps Slack team to DocuMind organization
2. Verifies user permissions via workspace mapping
3. Calls existing search/RAG pipeline
4. Formats response with Block Kit (answer + sources)

**Response Format:**
- Section block with AI answer
- Divider
- Context block with source citations
- Action button to "View in DocuMind"

### 5.4 OAuth Installation Flow (COMPLETED)

Full OAuth 2.0 implementation:

- `/slack/install` - Initiates OAuth flow with state parameter
- `/slack/oauth_redirect` - Handles callback, stores tokens
- State management with secure token generation
- Workspace-to-organization mapping

**Scopes Requested:**
- `commands` - Slash commands
- `chat:write` - Send messages
- `users:read` - Get user info
- `users:read.email` - Email for user matching

### 5.5 tRPC Router (COMPLETED)

Added `slackRouter` with endpoints:

- `getStatus` - Integration status for an org
- `getInstallUrl` - Generate OAuth install URL
- `disconnect` - Remove workspace connection
- `getUserMappings` - List Slack-to-DocuMind user mappings
- `linkUser` - Manually link users

**File:** `apps/api/src/trpc/routers/slack.ts`

### 5.6 Settings UI (COMPLETED)

Added Slack integration section to Settings > Integrations page:

- Connection status display
- Connect/Disconnect buttons
- Workspace info (team name, scopes)
- Usage stats
- Error handling for OAuth failures

**File:** `apps/web/src/routes/_authenticated/settings.integrations.tsx`

---

## Sprint 6: Slack Ingestion Pipeline

**Goal:** Index Slack messages as searchable documents with entity extraction.

### 6.1 Extended Schema (COMPLETED)

Added Slack-specific entity and relationship types to knowledge graph:

**Entity Types Added:**
- `SLACK_WORKSPACE` - Slack workspace entities
- `SLACK_USER` - Slack user entities
- `SLACK_CHANNEL` - Channel entities
- `SLACK_THREAD` - Thread entities
- `SLACK_MESSAGE` - Message entities
- `SLACK_BOT` - Bot entities
- `SLACK_FILE` - Shared file entities
- `SLACK_REACTION` - Reaction/emoji entities

**Relationship Types Added:**
- `MEMBER_OF` - User is member of channel/workspace
- `CONTAINS` - Workspace/channel contains entities
- `PART_OF` - Entity is part of larger entity
- `AUTHORED_BY` - Message authored by user
- `POSTED_IN` - Message posted in channel
- `REPLIED_TO` - Reply relationship
- `MENTIONED_IN` - User/entity mentioned
- `COLLABORATED_IN` - Collaboration relationship
- `ACTIVE_IN` - User active in channel
- `REFERENCES` - Entity references another
- `SHARES` - File sharing relationship
- `REACTED_WITH` - User reacted with emoji
- `REACTED_TO` - Reaction to message
- `PINNED_IN` - Pinned message in channel

**New Models:**
- `SlackChannelConfig` - Per-channel indexing configuration
- `SlackIndexedThread` - Tracking for indexed threads

**Files:**
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260117_add_slack_channel_indexing/migration.sql`
- `apps/api/src/trpc/routers/entities.ts` - Updated type definitions

### 6.2 Events API Handlers (COMPLETED)

Implemented real-time message event processing:

**Event Handlers:**
- `message` - New messages trigger thread indexing
- `reaction_added` - Reactions boost thread priority
- `reaction_removed` - Logged (no re-index)
- `channel_created` - Auto-discover new channels
- `channel_rename` - Update channel names
- `member_joined_channel` - Track user mappings

**In-Memory Queue:**
- Thread indexing queue with priority
- Deduplication for same-thread events
- `getNextThreadFromQueue()` / `getQueueSize()` exports

**File:** `apps/api/src/lib/slack/events.ts`

### 6.3 Thread Indexing Worker (COMPLETED)

Full thread-to-document pipeline:

1. **Fetch Thread** - Uses `conversations.replies` API
2. **Format Content** - Converts messages to readable document
3. **Create Document** - Upserts to Document table with `source: "slack"`
4. **Extract Entities** - Slack-specific entity extraction
5. **Create Relationships** - Graph relationships between entities

**Entity Extraction:**
- Thread participants → `SLACK_USER` entities
- Channel → `SLACK_CHANNEL` entity
- Thread → `SLACK_THREAD` entity
- Cross-entity relationships (POSTED_IN, REPLIED_TO, etc.)

**File:** `apps/api/src/lib/slack/thread-indexer.ts`

### 6.4 Channel Configuration UI (COMPLETED)

Added `SlackChannelConfig` component:

- Toggle channels on/off for indexing
- Configure `indexRepliesOnly` - Only index threaded conversations
- Set `minThreadLength` - Minimum messages to trigger indexing
- View thread stats (indexed/pending/failed counts)
- Expand to see recent threads with status

**tRPC Endpoints Added:**
- `getChannels` - List channel configs with stats
- `updateChannel` - Update channel settings
- `getIndexedThreads` - List threads for a channel
- `retryThread` - Retry failed thread indexing

**File:** `apps/web/src/routes/_authenticated/settings.integrations.tsx`

### 6.5 Permission-Aware Search (COMPLETED)

Implemented channel-based access control:

- `getUserChannelPermissions()` - Fetch user's accessible channels from Slack API
- `filterDocumentsBySlackPermissions()` - Filter search results by channel access
- `buildSlackSearchContext()` - Build context for permission-aware queries
- 5-minute cache for permission lookups
- Fail-secure: empty permissions on error

**File:** `apps/api/src/lib/slack/permissions.ts`

---

## Technical Notes

### Dependencies Added
- `@slack/bolt@^4.6.0` - Slack Bolt.js framework
- `@slack/types@^2.19.0` - Slack type definitions
- `@slack/web-api@^7.13.0` - Slack Web API client

### Environment Variables Required
```bash
SLACK_BOT_TOKEN=xoxb-...           # Bot User OAuth Token
SLACK_SIGNING_SECRET=...           # Request verification
SLACK_APP_TOKEN=xapp-...           # Socket Mode token (dev only)
SLACK_CLIENT_ID=...                # OAuth client ID
SLACK_CLIENT_SECRET=...            # OAuth client secret
SLACK_SOCKET_MODE=true             # Use Socket Mode vs HTTP
```

### Breaking Changes
- `@slack/bolt` v4 removed `ExpressReceiver` - updated to use simpler HTTP approach
- Socket Mode is now recommended for development

### Known Limitations
- Message indexing uses in-memory queue (should use Redis for production)
- Historical backfill not yet exposed in UI
- DM indexing not implemented (privacy consideration)

---

## Previous Releases

### Phase 2b: Knowledge Graph Foundation

- Entity extraction with Gemini
- Relationship mapping
- Graph-enhanced search
- Entity visualization UI

### Phase 2a: Infrastructure

- Gemini File Search integration
- Managed RAG migration
- Cost optimization (40% reduction)

### Phase 1: MVP

- Document upload (PDF, DOCX, TXT, MD, PPTX, XLSX)
- Custom chunking and embeddings
- Vector search
- RAG answers with citations
- Better Auth (email + Google OAuth)
- Multi-tenant organizations
- Search UI
- Documents UI

---

## File Summary

### New Files (Sprint 5 & 6)

| File | Description |
|------|-------------|
| `apps/api/src/lib/slack/index.ts` | Core Slack service |
| `apps/api/src/lib/slack/handlers.ts` | Command handlers |
| `apps/api/src/lib/slack/oauth.ts` | OAuth flow |
| `apps/api/src/lib/slack/events.ts` | Events API handlers |
| `apps/api/src/lib/slack/thread-indexer.ts` | Thread indexing worker |
| `apps/api/src/lib/slack/permissions.ts` | Permission filtering |
| `apps/api/src/trpc/routers/slack.ts` | tRPC endpoints |

### Modified Files

| File | Changes |
|------|---------|
| `packages/db/prisma/schema.prisma` | Slack models, entity types |
| `apps/api/src/trpc/router.ts` | Added slackRouter |
| `apps/api/src/trpc/routers/entities.ts` | Slack entity types |
| `apps/web/src/routes/_authenticated/settings.integrations.tsx` | Slack UI |
| `apps/web/src/routes/_authenticated/settings.tsx` | Integrations link |

---

*Last Updated: January 17, 2026*
