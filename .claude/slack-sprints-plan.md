# DocuMind Slack Integration - Strategic Implementation Plan

## Executive Summary

Implementing a two-phase Slack integration:
- **Sprint 5**: Query Interface - Ask DocuMind questions directly from Slack
- **Sprint 6**: Ingestion Pipeline - Index Slack messages as searchable documents

---

## Research Findings & Best Practices

### Slack Bolt.js (Source: [Slack Docs](https://docs.slack.dev/tools/bolt-js/getting-started/))
- Use `@slack/bolt` framework - handles complexity of Slack API
- Socket Mode for development (no public URL needed)
- HTTP endpoint for production (faster, more reliable)
- Legacy bots stopped working March 2025 - must use new app format

### Socket Mode (Source: [Socket Mode Docs](https://api.slack.com/apis/socket-mode))
- Supports slash commands, Block Kit, modals, App Home
- Requires App-Level Token with `connections:write` scope
- WebSocket connection - no firewall/proxy issues

### Message Ingestion for RAG (Source: [Paragon Guide](https://www.useparagon.com/learn/guide-ingesting-slack-messages-for-rag/))
- Treat threads as documents, not individual messages
- Chunk thread conversations together for context
- Enforce Slack permissions at query-time
- Use `conversations.history` for historical data
- Use Events API for real-time ingestion

### Rate Limits (Source: [Slack API Docs](https://api.slack.com/methods/conversations.history))
- `conversations.history`: Tier 3 for Marketplace apps
- New non-Marketplace apps: 1 request/minute (as of May 2025)
- Critical: Implement backoff and queueing

---

## Sprint 5: Slack Query Interface

### Goal
Enable users to query their DocuMind knowledge base directly from Slack using slash commands and receive AI-powered answers with source citations.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Slack Workspace                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ /ask command │  │ App Home Tab │  │ @DocuMind mentions   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
└─────────┼─────────────────┼─────────────────────┼───────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Slack Bolt.js Server                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Socket Mode (dev) / HTTP Events API (prod)              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────────┐  │
│  │                    Event Handlers                          │  │
│  │  • handleSlashCommand    • handleAppHome                  │  │
│  │  • handleModalSubmit     • handleAppMention               │  │
│  └───────────────────────────┼───────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DocuMind API                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ search.query    │  │ entities.search │  │ Integration DB  │  │
│  │ (existing tRPC) │  │ (existing tRPC) │  │ (org mapping)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### 5.1 Database Schema Updates
```prisma
// Add to schema.prisma

model SlackWorkspace {
  id               String    @id @default(uuid()) @db.Uuid
  orgId            String    @map("org_id") @db.Uuid
  teamId           String    @unique @map("team_id") @db.VarChar(20)  // Slack team ID
  teamName         String    @map("team_name") @db.VarChar(255)
  botUserId        String    @map("bot_user_id") @db.VarChar(20)
  accessToken      String    @map("access_token")  // Encrypted

  // Scopes granted
  scopes           String[]  @default([])

  // Tracking
  installerId      String?   @map("installer_id") @db.VarChar(20)
  installedAt      DateTime  @default(now()) @map("installed_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  org              Organization @relation(fields: [orgId], references: [id])

  @@map("slack_workspaces")
}

model SlackUserMapping {
  id              String    @id @default(uuid()) @db.Uuid
  slackWorkspaceId String   @map("slack_workspace_id") @db.Uuid
  slackUserId     String    @map("slack_user_id") @db.VarChar(20)
  userId          String?   @map("user_id") @db.Uuid  // DocuMind user if linked

  // Cache user info
  slackUsername   String?   @map("slack_username") @db.VarChar(255)
  slackEmail      String?   @map("slack_email") @db.VarChar(255)

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  workspace       SlackWorkspace @relation(fields: [slackWorkspaceId], references: [id])
  user            User? @relation(fields: [userId], references: [id])

  @@unique([slackWorkspaceId, slackUserId])
  @@map("slack_user_mappings")
}
```

#### 5.2 Slack Service (`/apps/api/src/lib/slack/index.ts`)
- Initialize Bolt app with Socket Mode (dev) or HTTP (prod)
- Export handlers for slash commands, modals, events
- Implement `isSlackConfigured()` pattern

#### 5.3 Slash Command Handler
```typescript
// /ask [question]
app.command('/ask', async ({ command, ack, respond }) => {
  await ack();  // Must respond within 3 seconds

  // 1. Map Slack team to DocuMind org
  // 2. Verify user has access (via SlackUserMapping)
  // 3. Call existing search.query mutation
  // 4. Format response with Block Kit
  // 5. Send response via respond()
});
```

#### 5.4 Response Formatting (Block Kit)
```typescript
// Format RAG response with source citations
function formatSearchResponse(result: SearchResult): KnownBlock[] {
  return [
    { type: "section", text: { type: "mrkdwn", text: result.answer } },
    { type: "divider" },
    { type: "context", elements: [
      { type: "mrkdwn", text: `*Sources:* ${result.sources.map(s => s.filename).join(", ")}` }
    ]},
    { type: "actions", elements: [
      { type: "button", text: { type: "plain_text", text: "View in DocuMind" }, url: "..." }
    ]}
  ];
}
```

#### 5.5 OAuth Installation Flow
- Implement `/api/slack/install` endpoint
- Handle OAuth callback, store tokens
- Map Slack workspace to DocuMind organization

#### 5.6 tRPC Router for Slack Settings
```typescript
// /apps/api/src/trpc/routers/slack.ts
export const slackRouter = router({
  getWorkspace: protectedProcedure...
  disconnect: protectedProcedure...
  getStats: protectedProcedure...
});
```

### Sprint 5 Deliverables
1. `/ask [question]` slash command with RAG responses
2. OAuth installation flow
3. Settings page to manage Slack connection
4. Block Kit formatted responses with sources
5. Error handling for unlinked users

### Required Scopes
- `commands` - Slash commands
- `chat:write` - Send messages
- `users:read` - Get user info for mapping
- `users:read.email` - Email for user matching

---

## Sprint 6: Slack Ingestion Pipeline

### Goal
Index Slack messages and threads as searchable documents in DocuMind, enabling knowledge discovery across both uploaded documents and team conversations.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Slack Workspace                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ #channel-1   │  │ #channel-2   │  │ DMs (if permitted)   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
└─────────┼─────────────────┼─────────────────────┼───────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Events API / Socket Mode                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  message.channels | message.groups | message.im              ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BullMQ Job Queue                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  SLACK_MESSAGE_INDEXING queue                               │  │
│  │  • Debounce thread updates (5s window)                      │  │
│  │  • Rate limit: 10 jobs/minute                               │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Thread Indexing Worker                          │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐  │
│  │ 1. Fetch full thread     │  │ 2. Create document record    │  │
│  │    (conversations.replies)│  │    (source: "slack")        │  │
│  └──────────────────────────┘  └──────────────────────────────┘  │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐  │
│  │ 3. Chunk thread content  │  │ 4. Generate embeddings       │  │
│  │    (preserve context)    │  │    (existing indexer)        │  │
│  └──────────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### 6.1 Schema Updates for Slack Documents
```prisma
// Extend Document model
model Document {
  // ... existing fields ...

  // Slack-specific fields
  slackChannelId    String?   @map("slack_channel_id") @db.VarChar(20)
  slackThreadTs     String?   @map("slack_thread_ts") @db.VarChar(30)
  slackMessageCount Int?      @map("slack_message_count")
  slackParticipants String[]  @default([]) @map("slack_participants")

  @@index([slackChannelId, slackThreadTs])
}

// Track indexed channels
model SlackChannelConfig {
  id              String    @id @default(uuid()) @db.Uuid
  slackWorkspaceId String   @map("slack_workspace_id") @db.Uuid
  channelId       String    @map("channel_id") @db.VarChar(20)
  channelName     String    @map("channel_name") @db.VarChar(255)

  // Settings
  isEnabled       Boolean   @default(true) @map("is_enabled")
  indexRepliesOnly Boolean  @default(true) @map("index_replies_only")  // Only threads, not single messages
  minThreadLength Int       @default(2) @map("min_thread_length")      // Min messages to index

  // Sync tracking
  lastSyncAt      DateTime? @map("last_sync_at")
  lastMessageTs   String?   @map("last_message_ts")

  workspace       SlackWorkspace @relation(fields: [slackWorkspaceId], references: [id])

  @@unique([slackWorkspaceId, channelId])
  @@map("slack_channel_configs")
}
```

#### 6.2 Events API Handlers
```typescript
// Handle new messages
app.event('message', async ({ event, client }) => {
  // Skip if not in indexed channel
  // Queue job to check/update thread
  await addSlackMessageIndexingJob({
    channelId: event.channel,
    threadTs: event.thread_ts || event.ts,
    workspaceId: workspace.id,
  });
});
```

#### 6.3 Thread Indexing Worker
```typescript
async function processSlackThread(job: Job<SlackThreadJobData>) {
  const { channelId, threadTs, workspaceId } = job.data;

  // 1. Fetch thread messages
  const replies = await client.conversations.replies({
    channel: channelId,
    ts: threadTs,
    limit: 100,
  });

  // 2. Format as document content
  const content = formatThreadAsDocument(replies.messages);

  // 3. Upsert document record
  const doc = await prisma.document.upsert({
    where: {
      orgId_slackChannelId_slackThreadTs: { orgId, channelId, threadTs }
    },
    create: {
      filename: `slack-thread-${channelId}-${threadTs}`,
      fileType: 'slack',
      source: 'slack',
      content,
      // ...
    },
    update: { content, updatedAt: new Date() },
  });

  // 4. Re-index with existing indexer
  await indexDocument(prisma, doc.id, { enableEntityExtraction: true });
}
```

#### 6.4 Backfill Historical Threads
```typescript
// Admin action: backfill channel history
async function backfillChannel(channelId: string) {
  let cursor: string | undefined;

  do {
    const history = await client.conversations.history({
      channel: channelId,
      cursor,
      limit: 100,
    });

    // Find messages that are thread parents
    for (const msg of history.messages || []) {
      if (msg.reply_count && msg.reply_count >= minThreadLength) {
        await addSlackMessageIndexingJob({
          channelId,
          threadTs: msg.ts!,
          workspaceId,
          priority: 'low',
        });
      }
    }

    cursor = history.response_metadata?.next_cursor;

    // Rate limit: wait between pages
    await sleep(1000);
  } while (cursor);
}
```

#### 6.5 Permission-Aware Search
```typescript
// Extend search to filter by Slack permissions
async function searchWithPermissions(query: string, user: User) {
  // Get user's Slack channels (cached or fetched)
  const accessibleChannels = await getUserSlackChannels(user);

  // Add filter to search
  const results = await search.query({
    query,
    orgId: user.orgId,
    // Filter Slack docs by accessible channels
    slackChannelIds: accessibleChannels,
  });
}
```

### Sprint 6 Deliverables
1. Events API subscription for message events
2. Thread-as-document indexing pipeline
3. Channel configuration UI (enable/disable indexing)
4. Historical backfill capability
5. Permission-aware search (respect Slack channel access)
6. Admin dashboard showing sync status

### Required Additional Scopes
- `channels:history` - Read public channel messages
- `channels:read` - List channels
- `groups:history` - Read private channel messages (if enabled)
- `groups:read` - List private channels
- `im:history` - Read DMs (if enabled)

---

## Environment Variables

```bash
# Slack App Configuration
SLACK_BOT_TOKEN=xoxb-...              # Bot User OAuth Token
SLACK_SIGNING_SECRET=...              # Request verification
SLACK_APP_TOKEN=xapp-...              # Socket Mode token (dev)
SLACK_CLIENT_ID=...                   # OAuth client ID
SLACK_CLIENT_SECRET=...               # OAuth client secret

# Feature Flags
SLACK_SOCKET_MODE=true                # Use Socket Mode (dev) vs HTTP (prod)
SLACK_ENABLE_DM_INDEXING=false        # Index DMs (privacy consideration)
```

---

## Risk Mitigation

### Rate Limits
- Implement exponential backoff in queue workers
- Use cursor-based pagination
- Cache channel membership

### Data Privacy
- Clear labeling of Slack sources in search results
- Respect channel-level permissions
- Audit logging for all Slack data access

### Scale Considerations
- Debounce thread updates (don't re-index on every message)
- Use incremental sync (lastMessageTs cursor)
- Consider message TTL for older threads

---

## Success Metrics

### Sprint 5
- Slash command response time < 5s
- OAuth installation completion rate > 90%
- User satisfaction (thumbs up/down on responses)

### Sprint 6
- Thread indexing latency < 30s from message
- Search results include relevant Slack content
- No permission leaks (audit verified)

---

## Timeline

| Sprint | Phase | Duration |
|--------|-------|----------|
| 5.1 | Schema + Slack service setup | Day 1 |
| 5.2 | Slash command + response formatting | Day 1-2 |
| 5.3 | OAuth flow + settings UI | Day 2 |
| 5.4 | Testing + polish | Day 2 |
| 6.1 | Events API + queue setup | Day 3 |
| 6.2 | Thread indexing worker | Day 3-4 |
| 6.3 | Channel config UI + backfill | Day 4 |
| 6.4 | Permission filtering + testing | Day 4 |

---

## Sources

- [Slack Bolt.js Getting Started](https://docs.slack.dev/tools/bolt-js/getting-started/)
- [Socket Mode Documentation](https://api.slack.com/apis/socket-mode)
- [Slack Modals](https://docs.slack.dev/surfaces/modals/)
- [conversations.history API](https://api.slack.com/methods/conversations.history)
- [Slack Events API](https://api.slack.com/events-api)
- [Ingesting Slack Messages for RAG](https://www.useparagon.com/learn/guide-ingesting-slack-messages-for-rag/)
