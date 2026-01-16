# Product Requirements Document & Technical Specification
## AI Document Search Platform

**Version:** 0.2
**Last Updated:** January 15, 2026
**Status:** Draft
**Author:** Base Analytics Corporation

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [User Personas & Use Cases](#3-user-personas--use-cases)
4. [Functional Requirements](#4-functional-requirements)
5. [Technical Architecture](#5-technical-architecture)
6. [Data Model & Schema](#6-data-model--schema)
7. [API Specification](#7-api-specification)
8. [Security & Compliance](#8-security--compliance)
9. [Infrastructure & DevOps](#9-infrastructure--devops)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Development Roadmap](#11-development-roadmap)
12. [Appendices](#12-appendices)

---

# 1. Executive Summary

## 1.1 Product Overview

The AI Document Search Platform (working name: **DocuMind**) is a SaaS application that enables businesses to search, query, and extract insights from their document repositories using natural language. The platform combines semantic search with generative AI to provide accurate answers grounded in the customer's own documents.

## 1.2 Problem Statement

Organizations struggle to find information within their document repositories:
- Native search tools rely on keyword matching, missing semantic intent
- Employees waste 2-5 hours weekly searching for documents
- Institutional knowledge is trapped in unstructured files
- Existing enterprise solutions (Glean, Coveo) are prohibitively expensive for SMBs

## 1.3 Solution

DocuMind provides:
- **Dual ingestion modes**: Connect Google Drive or upload documents directly
- **Semantic search**: Find documents by meaning, not just keywords
- **AI-powered answers**: Get direct answers with cited sources
- **Professional-grade security**: SOC 2 Type I compliant, customer-isolated storage

## 1.4 Target Market

- Primary: Agencies, consultancies, and professional services firms (10-100 employees)
- Secondary: Startups and scale-ups with distributed documentation
- Tertiary: Small legal, accounting, and real estate firms

## 1.5 Business Model

| Tier | Users | Storage | Price |
|------|-------|---------|-------|
| Starter | Up to 10 | 25 GB | $99/month |
| Growth | Up to 25 | 100 GB | $199/month |
| Professional | Up to 50 | 500 GB | $399/month |
| Enterprise | Unlimited | Custom | Custom |

---

# 2. Product Vision & Strategy

## 2.1 Vision Statement

"Make every organization's documents instantly accessible and actionable through AI."

## 2.2 Strategic Objectives

| Objective | Metric | Target (Year 1) |
|-----------|--------|-----------------|
| Product-Market Fit | NPS | > 40 |
| Customer Acquisition | Paying customers | 100 |
| Revenue | ARR | $200,000 |
| Retention | Monthly churn | < 5% |

## 2.3 Competitive Positioning

**Position:** The affordable, simple AI document search for growing teams.

| Attribute | DocuMind | Glean | Google Cloud Search |
|-----------|----------|-------|---------------------|
| Price (25 users) | $199/mo | $1,250+/mo | $250/mo |
| Setup time | 5 minutes | Days-weeks | Hours |
| AI answers | ✅ | ✅ | Limited |
| Direct upload | ✅ | ❌ | ❌ |
| SMB-focused | ✅ | ❌ | ❌ |

## 2.4 Key Differentiators

1. **Simplicity**: 5-minute setup, no IT team required
2. **Flexibility**: Connect Drive OR upload directly OR both
3. **Affordability**: 80% cheaper than enterprise alternatives
4. **Focus**: Purpose-built for document search, not trying to do everything

---

# 3. User Personas & Use Cases

## 3.1 Primary Personas

### Persona 1: Operations Manager (Primary Buyer)

**Name:** Sarah Chen  
**Role:** Director of Operations at a 35-person marketing agency  
**Age:** 34  
**Technical Skill:** Moderate

**Goals:**
- Reduce time employees spend searching for files
- Improve onboarding efficiency for new hires
- Maintain organized access to client deliverables

**Pain Points:**
- Google Drive is a mess with 7 years of accumulated files
- New hires take weeks to find relevant past work
- Constantly fielding "where is X?" questions

**Quote:** "I know we've done this before, but nobody can find the original files."

---

### Persona 2: Consultant/Knowledge Worker (Primary User)

**Name:** Marcus Johnson  
**Role:** Senior Consultant at a management consulting firm  
**Age:** 29  
**Technical Skill:** High

**Goals:**
- Quickly find relevant past work for new proposals
- Reference methodology documents and frameworks
- Stop recreating deliverables that already exist

**Pain Points:**
- Wastes hours searching for past proposals
- Can't remember which folder has what
- Keyword search fails when he doesn't know exact terminology

**Quote:** "I know we built a similar model for another client, but I can't find it anywhere."

---

### Persona 3: Firm Principal (Economic Buyer)

**Name:** David Park  
**Role:** Managing Partner at a 20-person architecture firm  
**Age:** 52  
**Technical Skill:** Low

**Goals:**
- Improve team productivity and utilization
- Protect sensitive client documents
- Avoid expensive enterprise software

**Pain Points:**
- Paying for inefficiency (billable hours lost to searching)
- Concerned about data security with new tools
- Previous "AI tools" were overhyped and underdelivered

**Quote:** "Show me it actually works and that our client data is secure."

---

## 3.2 Core Use Cases

### UC-001: Natural Language Document Search

**Actor:** Knowledge Worker  
**Precondition:** User has authenticated and documents are indexed  
**Trigger:** User needs to find a document

**Main Flow:**
1. User enters natural language query (e.g., "proposal for tech startup Series A fundraising")
2. System performs semantic search across all indexed documents
3. System returns ranked list of relevant documents with relevance scores
4. User clicks document to preview or download
5. System logs search query and result interaction

**Alternate Flows:**
- 3a. No relevant documents found → System suggests refined queries
- 4a. Document no longer exists in source → System shows cached metadata with "unavailable" status

**Postcondition:** User finds relevant document(s)

---

### UC-002: AI-Powered Question Answering

**Actor:** Knowledge Worker  
**Precondition:** User has authenticated and documents are indexed  
**Trigger:** User needs specific information from documents

**Main Flow:**
1. User enters question (e.g., "What was our pricing for the Johnson proposal?")
2. System retrieves relevant document chunks
3. System generates answer using LLM with retrieved context
4. System displays answer with inline citations
5. User clicks citation to view source document
6. System logs query, answer, and user feedback

**Alternate Flows:**
- 3a. Insufficient context in documents → System responds "I couldn't find enough information to answer this. Here are related documents..."
- 5a. User marks answer as unhelpful → System logs negative feedback for improvement

**Postcondition:** User receives accurate, cited answer

---

### UC-003: Document Upload (Direct)

**Actor:** Operations Manager  
**Precondition:** User has authenticated with upload permissions  
**Trigger:** User wants to add documents to searchable index

**Main Flow:**
1. User navigates to Upload interface
2. User drags files or clicks to select (supports batch)
3. System validates file types and sizes
4. System uploads files to customer-isolated GCS bucket
5. System displays upload progress
6. System queues documents for indexing
7. System notifies user when indexing complete

**Alternate Flows:**
- 3a. Invalid file type → System rejects with supported types list
- 3b. File exceeds size limit → System rejects with size limit message
- 4a. Upload fails → System retries 3x, then shows error with retry option

**Postcondition:** Documents uploaded and indexed

---

### UC-004: Google Drive Connection

**Actor:** Operations Manager  
**Precondition:** User has authenticated, organization uses Google Workspace  
**Trigger:** User wants to sync Drive folders

**Main Flow:**
1. User navigates to Integrations settings
2. User clicks "Connect Google Drive"
3. System initiates OAuth 2.0 flow with Google
4. User authenticates and grants permissions
5. User selects folders to sync
6. System begins initial sync and indexing
7. System displays sync progress and estimated completion
8. System configures periodic sync (default: every 6 hours)

**Alternate Flows:**
- 4a. User denies permissions → System explains required permissions and offers retry
- 6a. Folder contains 10,000+ files → System warns of extended indexing time

**Postcondition:** Drive folders synced and indexed

---

### UC-005: Team Member Management

**Actor:** Operations Manager (Admin)  
**Precondition:** User has admin role  
**Trigger:** Need to add/remove team members

**Main Flow:**
1. Admin navigates to Team Settings
2. Admin clicks "Invite Member"
3. Admin enters email address(es) and selects role
4. System sends invitation email
5. Invitee clicks link and creates account
6. System provisions access based on assigned role

**Alternate Flows:**
- 4a. Email domain not in allowed list → System rejects (if domain restriction enabled)
- 5a. Invitation expires (7 days) → Invitee requests new invitation

**Postcondition:** New team member has appropriate access

---

### UC-006: Data Export

**Actor:** Admin  
**Precondition:** User has admin role  
**Trigger:** Organization needs to export their data

**Main Flow:**
1. Admin navigates to Settings → Data Management
2. Admin clicks "Export All Data"
3. System confirms action and estimated time
4. System generates export package (all documents + metadata)
5. System stores export in temporary secure location
6. System emails admin with secure download link
7. Admin downloads export within 72 hours

**Postcondition:** Organization has complete copy of their data

---

# 4. Functional Requirements

## 4.1 Requirements Overview

| Category | Priority | Requirements Count |
|----------|----------|-------------------|
| Authentication & Authorization | P0 | 8 |
| Document Management | P0 | 12 |
| Search & Retrieval | P0 | 10 |
| AI Features | P0 | 6 |
| Team Management | P1 | 7 |
| Integrations | P1 | 5 |
| Analytics & Reporting | P2 | 6 |
| Admin & Settings | P1 | 9 |

**Priority Definitions:**
- P0: Must have for MVP launch
- P1: Required within 60 days of launch
- P2: Nice to have, roadmap items

---

## 4.2 Authentication & Authorization

### FR-AUTH-001: User Registration
**Priority:** P0  
**Description:** New users can create accounts via email invitation or self-signup (if enabled)

**Acceptance Criteria:**
- [ ] User can register with email and password
- [ ] Password must meet complexity requirements (8+ chars, mixed case, number, symbol)
- [ ] Email verification required before account activation
- [ ] User must accept Terms of Service and Privacy Policy

---

### FR-AUTH-002: User Login
**Priority:** P0  
**Description:** Registered users can authenticate to access the platform

**Acceptance Criteria:**
- [ ] User can login with email and password
- [ ] Failed login attempts are rate-limited (5 attempts, then 15-minute lockout)
- [ ] Session tokens expire after 24 hours of inactivity
- [ ] User can request password reset via email

---

### FR-AUTH-003: Google OAuth Login
**Priority:** P0  
**Description:** Users can authenticate using Google Workspace credentials

**Acceptance Criteria:**
- [ ] "Sign in with Google" button on login page
- [ ] OAuth flow requests minimal permissions (email, profile)
- [ ] Auto-links to existing account if email matches
- [ ] Creates new account if no match (when self-signup enabled)

---

### FR-AUTH-004: Role-Based Access Control
**Priority:** P0  
**Description:** Users are assigned roles that determine their permissions

**Acceptance Criteria:**
- [ ] Three roles: Admin, Member, Viewer
- [ ] Admins can manage team, billing, settings, and all documents
- [ ] Members can search, upload, and manage their uploads
- [ ] Viewers can search and view only
- [ ] Role permissions enforced on all API endpoints

---

### FR-AUTH-005: Multi-Factor Authentication
**Priority:** P1  
**Description:** Users can enable MFA for additional security

**Acceptance Criteria:**
- [ ] Users can enable TOTP-based MFA (Google Authenticator, Authy)
- [ ] Admins can require MFA for all team members
- [ ] Recovery codes provided during MFA setup
- [ ] MFA can be reset by admin

---

### FR-AUTH-006: Session Management
**Priority:** P0  
**Description:** Users can view and manage active sessions

**Acceptance Criteria:**
- [ ] User can view list of active sessions (device, location, last active)
- [ ] User can revoke individual sessions
- [ ] User can "Sign out everywhere"
- [ ] Sessions automatically expire after configurable period

---

### FR-AUTH-007: API Key Management
**Priority:** P1  
**Description:** Admins can generate API keys for programmatic access

**Acceptance Criteria:**
- [ ] Admins can create named API keys
- [ ] API keys can have limited scopes (read-only, full access)
- [ ] API keys can be revoked
- [ ] API key usage is logged

---

### FR-AUTH-008: Audit Logging for Auth Events
**Priority:** P1  
**Description:** All authentication events are logged for security audit

**Acceptance Criteria:**
- [ ] Log successful and failed login attempts
- [ ] Log password changes and resets
- [ ] Log MFA enable/disable events
- [ ] Log session creation and revocation
- [ ] Logs retained for 1 year

---

## 4.3 Document Management

### FR-DOC-001: Direct Document Upload
**Priority:** P0  
**Description:** Users can upload documents directly to the platform

**Acceptance Criteria:**
- [ ] Drag-and-drop upload interface
- [ ] Click-to-browse file selector
- [ ] Batch upload support (up to 100 files)
- [ ] Progress indicator for each file
- [ ] Supported formats: PDF, DOCX, PPTX, XLSX, TXT, MD, HTML
- [ ] Maximum file size: 100 MB per file

---

### FR-DOC-002: Upload Validation
**Priority:** P0  
**Description:** System validates uploads before processing

**Acceptance Criteria:**
- [ ] Reject unsupported file types with clear error
- [ ] Reject files exceeding size limit
- [ ] Reject if upload would exceed storage quota
- [ ] Scan for malware before storage (ClamAV or GCP DLP)
- [ ] Validate file is not corrupted/readable

---

### FR-DOC-003: Document Indexing
**Priority:** P0  
**Description:** Uploaded documents are processed and indexed for search

**Acceptance Criteria:**
- [ ] Documents queued for indexing immediately after upload
- [ ] Text extracted from all supported formats
- [ ] Documents chunked appropriately for retrieval
- [ ] Embeddings generated for semantic search
- [ ] Indexing status visible to user (pending, processing, complete, failed)
- [ ] Failed indexing triggers notification with reason

---

### FR-DOC-004: Google Drive Sync
**Priority:** P0  
**Description:** Users can connect and sync Google Drive folders

**Acceptance Criteria:**
- [ ] OAuth connection to Google Drive
- [ ] User can select specific folders to sync
- [ ] Initial sync processes all files in selected folders
- [ ] Incremental sync runs on configurable schedule (default: 6 hours)
- [ ] New/modified files automatically indexed
- [ ] Deleted files removed from index
- [ ] Sync status dashboard showing last sync time and any errors

---

### FR-DOC-005: Document Organization
**Priority:** P1  
**Description:** Users can organize documents with folders and tags

**Acceptance Criteria:**
- [ ] Users can create folders/collections
- [ ] Users can move documents between folders
- [ ] Users can add tags to documents
- [ ] Users can filter by folder or tag
- [ ] Bulk operations (move, tag, delete) supported

---

### FR-DOC-006: Document Preview
**Priority:** P0  
**Description:** Users can preview documents without downloading

**Acceptance Criteria:**
- [ ] In-browser preview for PDF, images
- [ ] Text preview for DOCX, PPTX, TXT, MD
- [ ] Preview loads within 3 seconds
- [ ] Preview shows document metadata (name, size, upload date, source)

---

### FR-DOC-007: Document Download
**Priority:** P0  
**Description:** Users can download original documents

**Acceptance Criteria:**
- [ ] Download original file in source format
- [ ] Secure signed URLs (expire in 15 minutes)
- [ ] Download tracked in audit log

---

### FR-DOC-008: Document Deletion
**Priority:** P0  
**Description:** Users can delete documents they own

**Acceptance Criteria:**
- [ ] User can delete individual documents
- [ ] Confirmation required before deletion
- [ ] Document removed from search index immediately
- [ ] Document marked for deletion in storage (soft delete)
- [ ] Hard deletion after retention period (30 days)
- [ ] Admins can delete any document

---

### FR-DOC-009: Storage Quota Management
**Priority:** P0  
**Description:** System enforces storage quotas per plan tier

**Acceptance Criteria:**
- [ ] Display current storage usage and quota
- [ ] Warning at 80% quota usage
- [ ] Block uploads at 100% quota
- [ ] Recommend upgrade when near quota

---

### FR-DOC-010: Document Versioning
**Priority:** P2  
**Description:** System maintains version history for updated documents

**Acceptance Criteria:**
- [ ] New upload of same filename creates new version
- [ ] Previous versions accessible
- [ ] Version comparison view
- [ ] Configurable version retention (default: 10 versions)

---

### FR-DOC-011: Bulk Import
**Priority:** P1  
**Description:** Users can import documents in bulk via ZIP upload

**Acceptance Criteria:**
- [ ] Accept ZIP files up to 1 GB
- [ ] Extract and process all valid documents
- [ ] Skip invalid files with error report
- [ ] Maintain folder structure from ZIP

---

### FR-DOC-012: Document Metadata
**Priority:** P0  
**Description:** System extracts and stores document metadata

**Acceptance Criteria:**
- [ ] Extract: filename, file type, size, page count, created date, modified date
- [ ] Extract: author (if available in document properties)
- [ ] User can add custom metadata (title, description)
- [ ] Metadata searchable

---

## 4.4 Search & Retrieval

### FR-SEARCH-001: Natural Language Search
**Priority:** P0  
**Description:** Users can search documents using natural language queries

**Acceptance Criteria:**
- [ ] Search bar prominently displayed on main interface
- [ ] Accepts natural language queries (e.g., "marketing proposal for tech startup")
- [ ] Returns results within 2 seconds
- [ ] No minimum query length

---

### FR-SEARCH-002: Semantic Search
**Priority:** P0  
**Description:** Search understands meaning, not just keywords

**Acceptance Criteria:**
- [ ] Finds documents without exact keyword match
- [ ] Understands synonyms and related concepts
- [ ] Handles typos and misspellings
- [ ] Relevance scoring based on semantic similarity

---

### FR-SEARCH-003: Search Results Display
**Priority:** P0  
**Description:** Search results displayed in ranked, actionable format

**Acceptance Criteria:**
- [ ] Results ranked by relevance score
- [ ] Each result shows: title, snippet, source, date, relevance indicator
- [ ] Snippet highlights relevant text passages
- [ ] Pagination or infinite scroll for large result sets
- [ ] Results count displayed

---

### FR-SEARCH-004: Search Filters
**Priority:** P1  
**Description:** Users can filter search results

**Acceptance Criteria:**
- [ ] Filter by document type (PDF, DOCX, etc.)
- [ ] Filter by date range (uploaded, modified)
- [ ] Filter by source (uploaded, Google Drive)
- [ ] Filter by folder/tag
- [ ] Filters combinable (AND logic)

---

### FR-SEARCH-005: Search History
**Priority:** P1  
**Description:** Users can view their search history

**Acceptance Criteria:**
- [ ] Recent searches shown in dropdown on focus
- [ ] Full search history page (last 100 searches)
- [ ] Click to re-run past search
- [ ] Option to clear search history

---

### FR-SEARCH-006: Saved Searches
**Priority:** P2  
**Description:** Users can save frequently used searches

**Acceptance Criteria:**
- [ ] Save search with custom name
- [ ] Access saved searches from sidebar/menu
- [ ] Edit/delete saved searches
- [ ] Optional: email alerts when new documents match

---

### FR-SEARCH-007: Search Suggestions
**Priority:** P2  
**Description:** System suggests queries as user types

**Acceptance Criteria:**
- [ ] Autocomplete based on document content
- [ ] Suggest from user's search history
- [ ] Suggestions appear within 200ms

---

### FR-SEARCH-008: No Results Handling
**Priority:** P0  
**Description:** Helpful guidance when no results found

**Acceptance Criteria:**
- [ ] Clear message when no results
- [ ] Suggest query refinements
- [ ] Offer to expand search (if filters applied)
- [ ] Link to upload documents (if empty index)

---

### FR-SEARCH-009: Search Analytics
**Priority:** P2  
**Description:** Track and display search usage patterns

**Acceptance Criteria:**
- [ ] Log all search queries (anonymized option for privacy)
- [ ] Admin dashboard: top searches, failed searches
- [ ] Identify content gaps (frequent searches with no results)

---

### FR-SEARCH-010: Cross-Source Search
**Priority:** P0  
**Description:** Single search queries both uploaded and Drive documents

**Acceptance Criteria:**
- [ ] Results from all connected sources in single list
- [ ] Source indicated on each result
- [ ] Consistent ranking across sources
- [ ] User can filter by source if desired

---

## 4.5 AI Features

### FR-AI-001: Question Answering
**Priority:** P0  
**Description:** AI generates answers from document content

**Acceptance Criteria:**
- [ ] User can ask questions in natural language
- [ ] AI generates concise, accurate answers
- [ ] Answers grounded in actual document content
- [ ] Clear indication when AI lacks information to answer

---

### FR-AI-002: Answer Citations
**Priority:** P0  
**Description:** AI answers include citations to source documents

**Acceptance Criteria:**
- [ ] Each factual claim linked to source document(s)
- [ ] Citation shows document name and relevant passage
- [ ] Click citation to navigate to source
- [ ] Multiple citations supported per answer

---

### FR-AI-003: Conversational Follow-up
**Priority:** P1  
**Description:** Users can ask follow-up questions with context

**Acceptance Criteria:**
- [ ] Follow-up questions understand previous context
- [ ] "Ask follow-up" button after initial answer
- [ ] Conversation history maintained within session
- [ ] Option to start new conversation

---

### FR-AI-004: Answer Feedback
**Priority:** P0  
**Description:** Users can provide feedback on AI answers

**Acceptance Criteria:**
- [ ] Thumbs up/down on each answer
- [ ] Optional text feedback for negative ratings
- [ ] Feedback logged for quality improvement
- [ ] Thank user for feedback

---

### FR-AI-005: Document Summarization
**Priority:** P1  
**Description:** AI generates summaries of documents

**Acceptance Criteria:**
- [ ] "Summarize" button on document preview
- [ ] Generates concise summary (100-300 words)
- [ ] Highlights key points/sections
- [ ] Summary can be copied

---

### FR-AI-006: Query Understanding
**Priority:** P0  
**Description:** AI interprets user intent to improve results

**Acceptance Criteria:**
- [ ] Handles ambiguous queries with clarifying questions
- [ ] Expands queries with relevant terms
- [ ] Understands question vs. search intent
- [ ] Routes appropriately (search results vs. direct answer)

---

## 4.6 Team Management

### FR-TEAM-001: Team Member Invitation
**Priority:** P0  
**Description:** Admins can invite new team members

**Acceptance Criteria:**
- [ ] Invite by email address
- [ ] Bulk invite (comma-separated or CSV)
- [ ] Assign role on invitation
- [ ] Invitation expires after 7 days
- [ ] Resend invitation option

---

### FR-TEAM-002: Team Member Listing
**Priority:** P0  
**Description:** View all team members and their status

**Acceptance Criteria:**
- [ ] List all members with: name, email, role, status, last active
- [ ] Filter by role or status
- [ ] Search by name or email

---

### FR-TEAM-003: Role Management
**Priority:** P0  
**Description:** Admins can change member roles

**Acceptance Criteria:**
- [ ] Change role via member settings
- [ ] Cannot demote last admin
- [ ] Role change effective immediately
- [ ] Notification sent to affected user

---

### FR-TEAM-004: Member Removal
**Priority:** P0  
**Description:** Admins can remove team members

**Acceptance Criteria:**
- [ ] Remove member from team
- [ ] Confirmation required
- [ ] User's sessions immediately invalidated
- [ ] User's uploaded documents remain (ownership transferred to admin)
- [ ] Removed user can be re-invited

---

### FR-TEAM-005: Domain Restriction
**Priority:** P1  
**Description:** Restrict team membership to specific email domains

**Acceptance Criteria:**
- [ ] Admin can specify allowed email domains
- [ ] Only matching domains can accept invitations
- [ ] Existing members grandfathered if domain restricted after joining

---

### FR-TEAM-006: Activity Dashboard
**Priority:** P2  
**Description:** View team activity and usage

**Acceptance Criteria:**
- [ ] Dashboard showing: searches, uploads, AI queries per member
- [ ] Date range selector
- [ ] Export activity report (CSV)

---

### FR-TEAM-007: Transfer Ownership
**Priority:** P1  
**Description:** Transfer organization ownership to another admin

**Acceptance Criteria:**
- [ ] Current owner can transfer to another admin
- [ ] Confirmation required (email verification)
- [ ] New owner receives notification
- [ ] Previous owner demoted to admin (not removed)

---

## 4.7 Integrations

### FR-INT-001: Google Drive Integration
**Priority:** P0  
**Description:** Connect and sync Google Drive
(See FR-DOC-004 for detailed requirements)

---

### FR-INT-002: Slack Integration
**Priority:** P2  
**Description:** Search from within Slack

**Acceptance Criteria:**
- [ ] Slack app installable via OAuth
- [ ] /search command triggers search
- [ ] Results displayed in Slack message
- [ ] Click through to full app for details
- [ ] Respects user permissions

---

### FR-INT-003: Webhook Notifications
**Priority:** P2  
**Description:** Send webhooks on key events

**Acceptance Criteria:**
- [ ] Admin can configure webhook URLs
- [ ] Events: document indexed, sync complete, error occurred
- [ ] Standard webhook payload format
- [ ] Retry on failure

---

### FR-INT-004: Zapier Integration
**Priority:** P2  
**Description:** Connect to thousands of apps via Zapier

**Acceptance Criteria:**
- [ ] Triggers: new document indexed, search performed
- [ ] Actions: upload document, perform search
- [ ] Zapier app published in marketplace

---

### FR-INT-005: API Access
**Priority:** P1  
**Description:** RESTful API for programmatic access
(See Section 7 for full API specification)

---

## 4.8 Analytics & Reporting

### FR-ANALYTICS-001: Usage Dashboard
**Priority:** P1  
**Description:** Display organization usage metrics

**Acceptance Criteria:**
- [ ] Total searches, AI queries, documents
- [ ] Usage over time (daily/weekly/monthly charts)
- [ ] Top users by activity
- [ ] Plan usage (queries vs. limit, storage vs. quota)

---

### FR-ANALYTICS-002: Search Analytics
**Priority:** P2  
**Description:** Insights into search behavior

**Acceptance Criteria:**
- [ ] Top search queries
- [ ] Searches with no results
- [ ] Average results per search
- [ ] Click-through rate on results

---

### FR-ANALYTICS-003: Content Analytics
**Priority:** P2  
**Description:** Insights into document content

**Acceptance Criteria:**
- [ ] Document count by type
- [ ] Most accessed documents
- [ ] Documents never accessed
- [ ] Storage usage by folder/source

---

### FR-ANALYTICS-004: AI Analytics
**Priority:** P2  
**Description:** Insights into AI feature usage

**Acceptance Criteria:**
- [ ] Total AI queries
- [ ] Answer satisfaction rate (from feedback)
- [ ] Common question topics
- [ ] Unanswered questions (content gap analysis)

---

### FR-ANALYTICS-005: Export Reports
**Priority:** P2  
**Description:** Export analytics data

**Acceptance Criteria:**
- [ ] Export usage report (CSV/PDF)
- [ ] Scheduled report delivery (weekly/monthly email)
- [ ] Custom date range selection

---

### FR-ANALYTICS-006: Audit Log Viewer
**Priority:** P1  
**Description:** View detailed audit logs

**Acceptance Criteria:**
- [ ] Searchable audit log interface
- [ ] Filter by event type, user, date
- [ ] Export audit logs
- [ ] Retained for 1 year minimum

---

## 4.9 Admin & Settings

### FR-ADMIN-001: Organization Settings
**Priority:** P0  
**Description:** Configure organization-level settings

**Acceptance Criteria:**
- [ ] Organization name and logo
- [ ] Default user role for new members
- [ ] Domain restrictions
- [ ] Data retention settings

---

### FR-ADMIN-002: Billing Management
**Priority:** P0  
**Description:** Manage subscription and billing

**Acceptance Criteria:**
- [ ] View current plan and usage
- [ ] Upgrade/downgrade plan
- [ ] Update payment method
- [ ] View billing history and invoices
- [ ] Cancel subscription (with data export option)

---

### FR-ADMIN-003: Security Settings
**Priority:** P1  
**Description:** Configure security options

**Acceptance Criteria:**
- [ ] Require MFA for all users toggle
- [ ] Session timeout configuration
- [ ] Password policy settings
- [ ] IP allowlist (optional)

---

### FR-ADMIN-004: Data Export
**Priority:** P0  
**Description:** Export all organization data
(See UC-006 for detailed requirements)

---

### FR-ADMIN-005: Data Deletion
**Priority:** P0  
**Description:** Request deletion of all organization data

**Acceptance Criteria:**
- [ ] Admin can request full data deletion
- [ ] Confirmation required (email verification)
- [ ] 30-day grace period before deletion
- [ ] Deletion certificate provided upon completion

---

### FR-ADMIN-006: Integration Management
**Priority:** P0  
**Description:** Manage connected integrations

**Acceptance Criteria:**
- [ ] View all connected integrations
- [ ] Disconnect integrations
- [ ] View integration sync status and errors
- [ ] Re-authorize expired connections

---

### FR-ADMIN-007: Notification Preferences
**Priority:** P1  
**Description:** Configure notification settings

**Acceptance Criteria:**
- [ ] Email notifications on/off
- [ ] Notification types: sync errors, quota warnings, security alerts
- [ ] Per-user notification preferences

---

### FR-ADMIN-008: Custom Branding
**Priority:** P2  
**Description:** Customize platform appearance

**Acceptance Criteria:**
- [ ] Upload organization logo
- [ ] Set primary brand color
- [ ] Custom login page (Enterprise only)

---

### FR-ADMIN-009: Support Access
**Priority:** P1  
**Description:** Control support team access

**Acceptance Criteria:**
- [ ] Toggle to allow/deny support access
- [ ] Time-limited support access (auto-revoke after X days)
- [ ] Audit log of support access

---

# 5. Technical Architecture

## 5.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web App   │  │ Mobile Web  │  │  Slack App  │  │   REST API  │        │
│  │  (React)    │  │ (Responsive)│  │   (Bot)     │  │  (Clients)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE / CDN LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Cloud CDN / Cloudflare                           │   │
│  │              (Static assets, DDoS protection, WAF)                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOAD BALANCER                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Google Cloud Load Balancer                       │   │
│  │                   (SSL termination, routing)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Cloud Run                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  API Server  │  │  API Server  │  │  API Server  │   (Auto-     │   │
│  │  │  (Node.js)   │  │  (Node.js)   │  │  (Node.js)   │   scaling)   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Background Workers (Cloud Run Jobs)              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Indexing   │  │  Drive Sync  │  │  Analytics   │              │   │
│  │  │   Worker     │  │   Worker     │  │   Worker     │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                        │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Cloud SQL  │  │    Redis     │  │     GCS      │  │   Pub/Sub    │   │
│  │ (PostgreSQL) │  │ (Memorystore)│  │   Buckets    │  │   (Queue)    │   │
│  │              │  │              │  │              │  │              │   │
│  │  - Users     │  │  - Sessions  │  │  - Documents │  │  - Index     │   │
│  │  - Orgs      │  │  - Cache     │  │  - Exports   │  │    Jobs      │   │
│  │  - Documents │  │  - Rate      │  │              │  │  - Sync      │   │
│  │    metadata  │  │    Limits    │  │              │  │    Jobs      │   │
│  │  - Audit     │  │              │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GOOGLE AI SERVICES                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Vertex AI Search                               │   │
│  │                                                                     │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │   │
│  │   │  Data Store  │  │  Data Store  │  │  Data Store  │  (One per  │   │
│  │   │  (Org ABC)   │  │  (Org DEF)   │  │  (Org GHI)   │   org)     │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘            │   │
│  │                                                                     │   │
│  │   Features: Document parsing, chunking, embeddings, semantic        │   │
│  │             search, generative answers with citations               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Vertex AI (Gemini)                          │   │
│  │             (For custom summarization, complex queries)            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SECURITY & COMPLIANCE                                  │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Cloud KMS  │  │   Cloud     │  │   Secret    │  │    Cloud     │   │
│  │   (CMEK)     │  │   Armor     │  │   Manager   │  │   Logging    │   │
│  │              │  │   (WAF)     │  │             │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Monorepo Structure

The project uses a monorepo architecture with pnpm workspaces and Turborepo for build orchestration.

```
documind/
├── apps/
│   ├── api/                    # Fastify + tRPC backend
│   │   ├── src/
│   │   │   ├── index.ts        # Server entry point
│   │   │   ├── auth.ts         # Better Auth configuration
│   │   │   └── trpc/           # tRPC routers and context
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    # React + Vite frontend
│       ├── src/
│       │   ├── main.tsx        # App entry point
│       │   ├── routes/         # TanStack Router pages
│       │   ├── components/     # React components
│       │   └── lib/            # Utilities (trpc, auth-client)
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   ├── db/                     # Prisma schema and client
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   ├── src/
│   │   │   └── index.ts        # Prisma client export
│   │   └── package.json
│   │
│   ├── shared/                 # Shared types and schemas
│   │   ├── src/
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── schemas/        # Zod validation schemas
│   │   │   └── constants/      # Shared constants
│   │   └── package.json
│   │
│   ├── ui/                     # Shared UI components (shadcn/ui)
│   │   ├── src/
│   │   │   ├── components/     # Button, Card, Input, etc.
│   │   │   └── lib/
│   │   │       └── utils.ts    # cn() utility
│   │   └── package.json
│   │
│   └── tsconfig/               # Shared TypeScript configs
│       ├── base.json
│       ├── react.json
│       └── node.json
│
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # Workspace definition
├── package.json                # Root package.json
└── prd-technical-spec.md       # This document
```

**Package Dependencies:**
```
@documind/web     → @documind/ui, @documind/shared
@documind/api     → @documind/db, @documind/shared
@documind/db      → (standalone)
@documind/shared  → (standalone)
@documind/ui      → (standalone)
```

**Turborepo Tasks:**
```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all packages and apps
pnpm typecheck    # Type-check all packages
pnpm lint         # Lint all packages
pnpm format       # Format code with Prettier
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Prisma Studio
```

## 5.3 Component Details

### 5.3.1 Frontend Application

**Technology:** React 18+ with TypeScript
**Build Tool:** Vite 6
**UI Framework:** Tailwind CSS + shadcn/ui
**State Management:** TanStack Query v5 for server state
**Routing:** TanStack Router (file-based, type-safe routing)
**API Client:** tRPC React Query (type-safe end-to-end)
**Auth Client:** Better Auth React client
**Hosting:** Vercel or Cloud Run (static export)

**Key Components:**
```
apps/web/src/
├── components/
│   ├── auth/           # Login, register, MFA components
│   ├── search/         # Search bar, results, filters
│   ├── documents/      # Upload, list, preview
│   ├── chat/           # AI Q&A interface
│   ├── settings/       # Team, billing, security
│   ├── layout/         # Header, sidebar, navigation
│   └── ui/             # Re-exported shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/
│   ├── trpc.ts         # tRPC client configuration
│   └── auth-client.ts  # Better Auth client
├── routes/             # TanStack Router file-based routes
│   ├── __root.tsx      # Root layout
│   ├── index.tsx       # Home page
│   ├── login.tsx       # Login page
│   ├── signup.tsx      # Registration page
│   └── _authenticated/ # Protected route group
│       ├── dashboard.tsx
│       ├── documents/
│       ├── search.tsx
│       └── settings/
└── routeTree.gen.ts    # Auto-generated route tree
```

### 5.3.2 Backend API Server

**Technology:** Node.js 20 LTS with TypeScript
**Framework:** Fastify 5 (high performance)
**API Protocol:** tRPC (type-safe RPC, end-to-end TypeScript)
**Authentication:** Better Auth (session-based, OAuth providers)
**ORM:** Prisma 6
**Validation:** Zod (integrated with tRPC)
**Hosting:** Cloud Run (serverless containers)

**Key Modules:**
```
apps/api/src/
├── index.ts            # Fastify server entry point
├── auth.ts             # Better Auth configuration
├── trpc/
│   ├── index.ts        # tRPC initialization
│   ├── context.ts      # Request context (auth, prisma)
│   ├── router.ts       # Root router
│   └── routers/
│       ├── health.ts   # Health check procedures
│       ├── documents.ts # Document CRUD procedures
│       ├── search.ts   # Search & AI procedures
│       ├── team.ts     # Team management procedures
│       ├── settings.ts # Organization settings
│       └── integrations.ts # Google Drive, etc.
├── services/
│   ├── documents/      # Upload, storage, indexing logic
│   ├── search/         # Vertex AI Search client
│   ├── integrations/   # Google Drive, Slack connectors
│   └── billing/        # Stripe integration
├── middleware/
│   ├── rateLimit.ts    # Rate limiting (Fastify plugin)
│   ├── audit.ts        # Audit logging
│   └── errors.ts       # Error handling
├── jobs/               # Background job definitions
└── lib/                # Utilities, clients
```

**tRPC Procedure Types:**
- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires authenticated session
- `adminProcedure` - Requires admin role in organization
- `memberProcedure` - Requires member or admin role

**Authentication Flow:**
Better Auth handles all authentication via `/api/auth/*` endpoints:
- Email/password registration and login
- Google OAuth (Sign in with Google)
- Session management (database-backed)
- Password reset flow
- Email verification

### 5.3.3 Background Workers

**Technology:** Cloud Run Jobs (scheduled/triggered)  
**Queue:** Cloud Pub/Sub

**Workers:**

| Worker | Trigger | Function |
|--------|---------|----------|
| `indexing-worker` | Pub/Sub message | Process uploaded documents, send to Vertex AI |
| `drive-sync-worker` | Cloud Scheduler (6h) | Sync Google Drive changes |
| `cleanup-worker` | Cloud Scheduler (daily) | Delete expired data, old sessions |
| `export-worker` | Pub/Sub message | Generate data exports |
| `analytics-worker` | Cloud Scheduler (hourly) | Aggregate analytics data |

### 5.3.4 Database Schema Overview

**Primary Database:** Cloud SQL (PostgreSQL 15)

Core tables (detailed in Section 6):
- `organizations` - Customer accounts
- `users` - Individual users
- `memberships` - User-org relationships
- `documents` - Document metadata
- `search_logs` - Search history
- `audit_logs` - Security audit trail
- `integrations` - Connected services
- `api_keys` - API credentials

### 5.3.5 Storage Architecture

**Document Storage:** Google Cloud Storage

```
gs://documind-documents-{env}/
├── orgs/
│   ├── {org_id}/
│   │   ├── documents/
│   │   │   ├── {doc_id}/
│   │   │   │   ├── original.pdf
│   │   │   │   └── metadata.json
│   │   ├── exports/
│   │   │   └── {export_id}.zip
│   │   └── temp/
```

**Storage Classes:**
- Documents: Standard (frequently accessed)
- Exports: Nearline (accessed monthly)
- Old versions: Coldline (rarely accessed)

### 5.3.6 Vertex AI Search Configuration

**One Data Store per Organization:**

```javascript
// Data store naming convention
const dataStoreId = `org-${organizationId}`;

// Data store configuration
{
  displayName: `${organizationName} Documents`,
  industryVertical: "GENERIC",
  solutionTypes: ["SOLUTION_TYPE_SEARCH"],
  contentConfig: {
    mimeType: "application/pdf", // Supports multiple
    contentStructure: "UNSTRUCTURED"
  },
  documentProcessingConfig: {
    defaultParsingConfig: {
      layoutParsingConfig: {} // Enable layout parser
    },
    chunkingConfig: {
      layoutBasedChunkingConfig: {
        chunkSize: 500,
        includeAncestorHeadings: true
      }
    }
  }
}
```

**Search App Configuration:**
```javascript
{
  displayName: `${organizationName} Search App`,
  dataStoreIds: [dataStoreId],
  searchEngineConfig: {
    searchAddOns: ["SEARCH_ADD_ON_LLM"]
  },
  // Enterprise Edition for AI features
  solutionType: "SOLUTION_TYPE_SEARCH"
}
```

---

## 5.4 Data Flow Diagrams

### 5.4.1 Document Upload Flow

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  User  │     │  Frontend  │     │    API     │     │    GCS     │
└────┬───┘     └─────┬──────┘     └─────┬──────┘     └─────┬──────┘
     │               │                  │                  │
     │  Select file  │                  │                  │
     │──────────────>│                  │                  │
     │               │                  │                  │
     │               │  Request upload  │                  │
     │               │  URL             │                  │
     │               │─────────────────>│                  │
     │               │                  │                  │
     │               │                  │  Generate signed │
     │               │                  │  URL             │
     │               │                  │─────────────────>│
     │               │                  │                  │
     │               │                  │<─────────────────│
     │               │                  │  Signed URL      │
     │               │<─────────────────│                  │
     │               │  Signed URL      │                  │
     │               │                  │                  │
     │               │  Upload directly │                  │
     │               │  to GCS          │                  │
     │               │─────────────────────────────────────>
     │               │                  │                  │
     │               │<─────────────────────────────────────
     │               │  Upload complete │                  │
     │               │                  │                  │
     │               │  Confirm upload  │                  │
     │               │─────────────────>│                  │
     │               │                  │                  │
     │               │                  │  Create document │
     │               │                  │  record          │
     │               │                  │─────┐            │
     │               │                  │     │            │
     │               │                  │<────┘            │
     │               │                  │                  │
     │               │                  │  Queue indexing  │
     │               │                  │  job (Pub/Sub)   │
     │               │                  │─────────┐        │
     │               │                  │         │        │
     │               │                  │<────────┘        │
     │               │                  │                  │
     │               │<─────────────────│                  │
     │               │  Document created│                  │
     │<──────────────│                  │                  │
     │  Show success │                  │                  │
     │               │                  │                  │
```

### 5.4.2 Search Query Flow

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  User  │     │  Frontend  │     │    API     │     │Vertex AI   │
└────┬───┘     └─────┬──────┘     └─────┬──────┘     │  Search    │
     │               │                  │           └─────┬──────┘
     │  Enter query  │                  │                 │
     │──────────────>│                  │                 │
     │               │                  │                 │
     │               │  POST /search    │                 │
     │               │─────────────────>│                 │
     │               │                  │                 │
     │               │                  │  Validate auth  │
     │               │                  │─────┐           │
     │               │                  │     │           │
     │               │                  │<────┘           │
     │               │                  │                 │
     │               │                  │  Get org's data │
     │               │                  │  store ID       │
     │               │                  │─────┐           │
     │               │                  │     │           │
     │               │                  │<────┘           │
     │               │                  │                 │
     │               │                  │  Search request │
     │               │                  │────────────────>│
     │               │                  │                 │
     │               │                  │  (Semantic      │
     │               │                  │   search +      │
     │               │                  │   AI answer)    │
     │               │                  │                 │
     │               │                  │<────────────────│
     │               │                  │  Results +      │
     │               │                  │  answer         │
     │               │                  │                 │
     │               │                  │  Log query      │
     │               │                  │─────┐           │
     │               │                  │     │           │
     │               │                  │<────┘           │
     │               │                  │                 │
     │               │<─────────────────│                 │
     │               │  Results + answer│                 │
     │<──────────────│                  │                 │
     │  Display      │                  │                 │
     │               │                  │                 │
```

### 5.4.3 Google Drive Sync Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  Cloud     │     │   Sync     │     │  Google    │     │Vertex AI   │
│ Scheduler  │     │  Worker    │     │   Drive    │     │  Search    │
└─────┬──────┘     └─────┬──────┘     └─────┬──────┘     └─────┬──────┘
      │                  │                  │                  │
      │  Trigger sync    │                  │                  │
      │─────────────────>│                  │                  │
      │                  │                  │                  │
      │                  │  Get orgs with   │                  │
      │                  │  Drive connected │                  │
      │                  │─────┐            │                  │
      │                  │     │            │                  │
      │                  │<────┘            │                  │
      │                  │                  │                  │
      │                  │  For each org:   │                  │
      │                  │                  │                  │
      │                  │  List changes    │                  │
      │                  │  since last sync │                  │
      │                  │─────────────────>│                  │
      │                  │                  │                  │
      │                  │<─────────────────│                  │
      │                  │  Changed files   │                  │
      │                  │                  │                  │
      │                  │  For new/updated │                  │
      │                  │  files:          │                  │
      │                  │                  │                  │
      │                  │  Download file   │                  │
      │                  │─────────────────>│                  │
      │                  │                  │                  │
      │                  │<─────────────────│                  │
      │                  │  File content    │                  │
      │                  │                  │                  │
      │                  │  Upload to GCS   │                  │
      │                  │─────┐            │                  │
      │                  │     │            │                  │
      │                  │<────┘            │                  │
      │                  │                  │                  │
      │                  │  Import to       │                  │
      │                  │  Vertex Search   │                  │
      │                  │─────────────────────────────────────>
      │                  │                  │                  │
      │                  │  For deleted     │                  │
      │                  │  files:          │                  │
      │                  │                  │                  │
      │                  │  Delete from     │                  │
      │                  │  Vertex Search   │                  │
      │                  │─────────────────────────────────────>
      │                  │                  │                  │
      │                  │  Update last     │                  │
      │                  │  sync timestamp  │                  │
      │                  │─────┐            │                  │
      │                  │     │            │                  │
      │                  │<────┘            │                  │
      │                  │                  │                  │
```

---

## 5.5 Technology Stack Summary

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend** | React 18 + TypeScript + Vite 6 | Industry standard, fast HMR, large ecosystem |
| **Routing** | TanStack Router | Type-safe, file-based routing with code splitting |
| **State/Data** | TanStack Query v5 | Powerful server state management, caching |
| **UI Components** | Tailwind CSS + shadcn/ui | Fast development, consistent design, accessible |
| **API Protocol** | tRPC | End-to-end type safety, excellent DX |
| **API Server** | Node.js 20 + Fastify 5 | High performance, TypeScript support |
| **Authentication** | Better Auth | Simple setup, OAuth providers, session management |
| **ORM** | Prisma 6 | Type-safe database access, migrations |
| **Validation** | Zod | Runtime validation, TypeScript inference |
| **Database** | PostgreSQL 15 (Cloud SQL) | Reliable, JSON support, GCP managed |
| **Cache** | Redis (Memorystore) | Session storage, rate limiting |
| **Object Storage** | Google Cloud Storage | Native GCP, Vertex AI integration |
| **Queue** | Cloud Pub/Sub | Serverless, reliable delivery |
| **Search/AI** | Vertex AI Search | Core product functionality |
| **Serverless Compute** | Cloud Run | Auto-scaling, cost-effective |
| **CDN** | Cloud CDN / Cloudflare | Performance, DDoS protection |
| **Secrets** | Secret Manager | Secure credential storage |
| **Monitoring** | Cloud Monitoring + Logging | Native GCP observability |
| **Monorepo** | pnpm workspaces + Turborepo | Fast installs, incremental builds |
| **CI/CD** | GitHub Actions + Cloud Build | Automated deployments |

---

# 6. Data Model & Schema

## 6.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  organizations  │       │     users       │       │   memberships   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ name            │◄──────│ email           │       │ user_id (FK)    │───┐
│ slug            │       │ password_hash   │       │ org_id (FK)     │───┼──┐
│ plan_id         │       │ name            │       │ role            │   │  │
│ storage_quota   │       │ avatar_url      │       │ invited_by      │   │  │
│ storage_used    │       │ email_verified  │       │ joined_at       │   │  │
│ settings (JSON) │       │ mfa_enabled     │       │ status          │   │  │
│ created_at      │       │ mfa_secret      │       └────────┬────────┘   │  │
│ updated_at      │       │ created_at      │                │            │  │
└────────┬────────┘       │ updated_at      │                │            │  │
         │                └────────┬────────┘                │            │  │
         │                         │                         │            │  │
         │                         └─────────────────────────┼────────────┘  │
         │                                                   │               │
         │                                                   │               │
         ▼                                                   │               │
┌─────────────────┐       ┌─────────────────┐               │               │
│   documents     │       │  integrations   │               │               │
├─────────────────┤       ├─────────────────┤               │               │
│ id (PK)         │       │ id (PK)         │               │               │
│ org_id (FK)     │◄──────│ org_id (FK)     │◄──────────────┘               │
│ uploaded_by(FK) │───────│ type            │                               │
│ filename        │       │ credentials     │                               │
│ file_type       │       │ settings (JSON) │                               │
│ file_size       │       │ last_sync_at    │                               │
│ storage_path    │       │ sync_status     │                               │
│ source          │       │ error_message   │                               │
│ source_id       │       │ created_at      │                               │
│ index_status    │       │ updated_at      │                               │
│ metadata (JSON) │       └─────────────────┘                               │
│ created_at      │                                                         │
│ updated_at      │                                                         │
│ deleted_at      │       ┌─────────────────┐                               │
└────────┬────────┘       │   audit_logs    │                               │
         │                ├─────────────────┤                               │
         │                │ id (PK)         │                               │
         │                │ org_id (FK)     │◄──────────────────────────────┘
         │                │ user_id (FK)    │
         │                │ action          │
         │                │ resource_type   │
         │                │ resource_id     │
         │                │ details (JSON)  │
         │                │ ip_address      │
         │                │ user_agent      │
         │                │ created_at      │
         │                └─────────────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐
│  search_logs    │       │   api_keys      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ org_id (FK)     │       │ org_id (FK)     │
│ user_id (FK)    │       │ name            │
│ query           │       │ key_hash        │
│ query_type      │       │ key_prefix      │
│ results_count   │       │ scopes          │
│ answer_generated│       │ last_used_at    │
│ feedback        │       │ expires_at      │
│ latency_ms      │       │ created_at      │
│ created_at      │       │ revoked_at      │
└─────────────────┘       └─────────────────┘
```

## 6.2 Table Definitions

### 6.2.1 organizations

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_id VARCHAR(50) NOT NULL DEFAULT 'starter',
    
    -- Storage management
    storage_quota_bytes BIGINT NOT NULL DEFAULT 26843545600, -- 25 GB
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    
    -- Vertex AI Search references
    vertex_data_store_id VARCHAR(255),
    vertex_search_app_id VARCHAR(255),
    
    -- Settings (JSON for flexibility)
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    {
        "domain_restrictions": ["company.com"],
        "require_mfa": false,
        "session_timeout_hours": 24,
        "retention_days": 365,
        "branding": {
            "logo_url": null,
            "primary_color": "#0066FF"
        }
    }
    */
    
    -- Billing (Stripe references)
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_status VARCHAR(50),
    current_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT valid_plan CHECK (plan_id IN ('starter', 'growth', 'professional', 'enterprise'))
);

CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_stripe ON organizations(stripe_customer_id);
```

### 6.2.2 users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    
    -- Authentication
    password_hash VARCHAR(255), -- NULL if OAuth-only
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Profile
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    
    -- MFA
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255), -- Encrypted TOTP secret
    mfa_recovery_codes TEXT[], -- Encrypted codes
    
    -- OAuth connections
    google_id VARCHAR(255),
    
    -- Security
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
```

### 6.2.3 memberships

```sql
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Invitation tracking
    invited_by UUID REFERENCES users(id),
    invitation_token VARCHAR(255),
    invitation_expires TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_membership UNIQUE(user_id, org_id),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'member', 'viewer')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'suspended', 'removed'))
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(org_id);
CREATE INDEX idx_memberships_invitation ON memberships(invitation_token) WHERE status = 'pending';
```

### 6.2.4 documents

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    
    -- File information
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),
    page_count INTEGER,
    
    -- Storage location
    storage_bucket VARCHAR(255) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    
    -- Source tracking
    source VARCHAR(50) NOT NULL DEFAULT 'upload',
    source_id VARCHAR(500), -- External ID (Drive file ID, etc.)
    source_path VARCHAR(1000), -- Original path in source
    source_modified_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexing status
    index_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    index_error TEXT,
    indexed_at TIMESTAMP WITH TIME ZONE,
    vertex_document_id VARCHAR(255),
    
    -- Metadata (flexible JSON)
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    {
        "title": "Q4 Sales Report",
        "description": "Quarterly sales analysis",
        "author": "John Smith",
        "tags": ["sales", "quarterly"],
        "folder_id": "uuid",
        "custom": {}
    }
    */
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
    
    -- Constraints
    CONSTRAINT valid_source CHECK (source IN ('upload', 'google_drive', 'api')),
    CONSTRAINT valid_index_status CHECK (index_status IN ('pending', 'processing', 'indexed', 'failed'))
);

CREATE INDEX idx_documents_org ON documents(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_source ON documents(org_id, source, source_id);
CREATE INDEX idx_documents_index_status ON documents(index_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_metadata ON documents USING GIN(metadata);
```

### 6.2.5 integrations

```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255), -- User-provided name
    
    -- Credentials (encrypted)
    credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    Google Drive:
    {
        "access_token": "encrypted",
        "refresh_token": "encrypted",
        "token_expires_at": "2024-01-01T00:00:00Z",
        "scope": "...",
        "user_email": "user@company.com"
    }
    */
    
    -- Configuration
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    {
        "folder_ids": ["folder1", "folder2"],
        "sync_frequency_hours": 6,
        "include_shared_drives": true
    }
    */
    
    -- Sync status
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    sync_cursor TEXT, -- Pagination/delta token
    error_message TEXT,
    error_count INTEGER NOT NULL DEFAULT 0,
    
    -- Statistics
    documents_synced INTEGER NOT NULL DEFAULT 0,
    total_size_bytes BIGINT NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_type CHECK (type IN ('google_drive', 'slack', 'dropbox')),
    CONSTRAINT valid_sync_status CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error', 'disabled'))
);

CREATE INDEX idx_integrations_org ON integrations(org_id);
CREATE INDEX idx_integrations_sync ON integrations(next_sync_at) WHERE disconnected_at IS NULL;
```

### 6.2.6 search_logs

```sql
CREATE TABLE search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    -- Query details
    query TEXT NOT NULL,
    query_type VARCHAR(50) NOT NULL DEFAULT 'search',
    
    -- Results
    results_count INTEGER NOT NULL DEFAULT 0,
    answer_generated BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Performance
    latency_ms INTEGER,
    
    -- Feedback
    feedback VARCHAR(50),
    feedback_text TEXT,
    
    -- Context
    session_id VARCHAR(255),
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_query_type CHECK (query_type IN ('search', 'question', 'followup')),
    CONSTRAINT valid_feedback CHECK (feedback IS NULL OR feedback IN ('positive', 'negative'))
);

CREATE INDEX idx_search_logs_org ON search_logs(org_id, created_at DESC);
CREATE INDEX idx_search_logs_user ON search_logs(user_id, created_at DESC);

-- Partition by month for performance (optional for high volume)
-- CREATE TABLE search_logs (...) PARTITION BY RANGE (created_at);
```

### 6.2.7 audit_logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    
    -- Additional context
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    
    -- Timestamp (immutable)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_action CHECK (action ~ '^[a-z_]+\.[a-z_]+$')
);

CREATE INDEX idx_audit_logs_org ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Standard audit actions:
-- auth.login, auth.logout, auth.login_failed, auth.mfa_enabled
-- user.created, user.updated, user.deleted, user.password_changed
-- document.uploaded, document.deleted, document.downloaded
-- integration.connected, integration.disconnected
-- team.member_invited, team.member_removed, team.role_changed
-- settings.updated, billing.plan_changed
```

### 6.2.8 api_keys

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    
    name VARCHAR(255) NOT NULL,
    
    -- Key storage (only store hash, show prefix for identification)
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- e.g., "dm_live_abc"
    
    -- Permissions
    scopes TEXT[] NOT NULL DEFAULT ARRAY['read'],
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count BIGINT NOT NULL DEFAULT 0,
    
    -- Lifecycle
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_key_hash UNIQUE(key_hash)
);

CREATE INDEX idx_api_keys_org ON api_keys(org_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
```

### 6.2.9 sessions

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session token (hashed)
    token_hash VARCHAR(255) NOT NULL,
    
    -- Session metadata
    device_info JSONB,
    /*
    {
        "browser": "Chrome",
        "os": "macOS",
        "device": "Desktop"
    }
    */
    
    ip_address INET,
    location JSONB, -- GeoIP data
    
    -- Lifecycle
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_session_token UNIQUE(token_hash)
);

CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_token ON sessions(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE revoked_at IS NULL;
```

---

# 7. API Specification

## 7.1 API Overview

**Architecture:** tRPC (Type-safe RPC) + Better Auth

**Endpoints:**
- **tRPC:** `https://api.documind.ai/trpc/*` - All business logic
- **Auth:** `https://api.documind.ai/api/auth/*` - Authentication (Better Auth)
- **Health:** `https://api.documind.ai/health` - Health check

**Authentication:** Session-based (Better Auth cookies) or API Key header

**Rate Limits:**
- Standard: 100 requests/minute
- Search: 60 requests/minute
- Upload: 20 requests/minute

**Response Format:** JSON (tRPC envelope)

## 7.2 Authentication (Better Auth)

Authentication is handled by Better Auth, which provides a complete auth solution with session management.

### 7.2.1 Email/Password Sign Up

**Endpoint:** `POST /api/auth/sign-up/email`

**Request:**
```json
{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
}
```

**Response (200):**
```json
{
    "user": {
        "id": "usr_abc123",
        "email": "user@example.com",
        "name": "John Doe",
        "emailVerified": false,
        "createdAt": "2024-01-15T12:00:00Z",
        "updatedAt": "2024-01-15T12:00:00Z"
    },
    "session": {
        "id": "sess_xyz789",
        "userId": "usr_abc123",
        "expiresAt": "2024-01-22T12:00:00Z"
    }
}
```

### 7.2.2 Email/Password Sign In

**Endpoint:** `POST /api/auth/sign-in/email`

**Request:**
```json
{
    "email": "user@example.com",
    "password": "securepassword123"
}
```

### 7.2.3 Google OAuth

**Endpoint:** `GET /api/auth/sign-in/social`

**Query Parameters:**
- `provider=google`
- `callbackURL=/dashboard`

Redirects to Google OAuth flow, returns to callback URL with session cookie set.

### 7.2.4 Sign Out

**Endpoint:** `POST /api/auth/sign-out`

Clears session cookie and invalidates session in database.

### 7.2.5 Get Session

**Endpoint:** `GET /api/auth/get-session`

**Response (200):**
```json
{
    "user": {
        "id": "usr_abc123",
        "email": "user@example.com",
        "name": "John Doe",
        "emailVerified": true
    },
    "session": {
        "id": "sess_xyz789",
        "expiresAt": "2024-01-22T12:00:00Z"
    }
}
```

### 7.2.6 Client-Side Usage (React)

```typescript
import { authClient } from '@/lib/auth-client';

// Sign up
await authClient.signUp.email({
    email: 'user@example.com',
    password: 'securepassword123',
    name: 'John Doe'
});

// Sign in
await authClient.signIn.email({
    email: 'user@example.com',
    password: 'securepassword123'
});

// Sign in with Google
await authClient.signIn.social({ provider: 'google' });

// Get session (React hook)
const { data: session, isPending } = authClient.useSession();

// Sign out
await authClient.signOut();
```

---

## 7.3 Documents (tRPC Router)

### Router: `documents`

All document procedures are available under the `documents` router. Access via `trpc.documents.<procedure>`.

### 7.3.1 Get Upload URL

**Procedure:** `documents.getUploadUrl` (mutation, protected)

```typescript
// Input
const input = {
    filename: "report.pdf",
    contentType: "application/pdf",
    sizeBytes: 1048576
};

// Usage
const result = await trpc.documents.getUploadUrl.mutate(input);

// Output
{
    uploadUrl: "https://storage.googleapis.com/...",
    documentId: "doc_abc123",
    expiresAt: "2024-01-15T12:30:00Z",
    method: "PUT",
    headers: {
        "Content-Type": "application/pdf"
    }
}
```

### 7.3.2 Confirm Upload

**Procedure:** `documents.confirmUpload` (mutation, protected)

```typescript
// Input
const input = { documentId: "doc_abc123" };

// Output
{
    id: "doc_abc123",
    filename: "report.pdf",
    fileType: "pdf",
    fileSizeBytes: 1048576,
    indexStatus: "pending",
    createdAt: "2024-01-15T12:00:00Z"
}
```

### 7.3.3 List Documents

**Procedure:** `documents.list` (query, protected)

```typescript
// Input
const input = {
    page: 1,
    perPage: 20,
    source: "upload",           // optional: "upload" | "google_drive"
    fileType: "pdf",            // optional
    indexStatus: "indexed",     // optional
    folderId: "folder_123",     // optional
    sort: "createdAt",          // optional: "createdAt" | "filename" | "fileSize"
    order: "desc"               // optional: "asc" | "desc"
};

// Output
{
    data: [
        {
            id: "doc_abc123",
            filename: "report.pdf",
            fileType: "pdf",
            fileSizeBytes: 1048576,
            source: "upload",
            indexStatus: "indexed",
            metadata: {
                title: "Q4 Report",
                tags: ["quarterly", "sales"]
            },
            createdAt: "2024-01-15T12:00:00Z",
            updatedAt: "2024-01-15T12:05:00Z"
        }
    ],
    pagination: {
        page: 1,
        perPage: 20,
        totalPages: 5,
        totalCount: 95
    }
}
```

### 7.3.4 Get Document

**Procedure:** `documents.getById` (query, protected)

```typescript
// Input
const input = { id: "doc_abc123" };

// Output
{
    id: "doc_abc123",
    filename: "report.pdf",
    fileType: "pdf",
    fileSizeBytes: 1048576,
    mimeType: "application/pdf",
    pageCount: 15,
    source: "upload",
    sourcePath: null,
    indexStatus: "indexed",
    indexedAt: "2024-01-15T12:05:00Z",
    metadata: {
        title: "Q4 Report",
        description: "Quarterly sales analysis",
        author: "John Smith",
        tags: ["quarterly", "sales"],
        folderId: null
    },
    uploadedBy: {
        id: "usr_xyz789",
        name: "John Doe"
    },
    createdAt: "2024-01-15T12:00:00Z",
    updatedAt: "2024-01-15T12:05:00Z"
}
```

### 7.3.5 Update Document Metadata

**Procedure:** `documents.updateMetadata` (mutation, protected)

```typescript
// Input
const input = {
    id: "doc_abc123",
    metadata: {
        title: "Q4 2024 Sales Report",
        description: "Updated quarterly analysis",
        tags: ["quarterly", "sales", "2024"]
    }
};
```

### 7.3.6 Delete Document

**Procedure:** `documents.delete` (mutation, protected)

```typescript
// Input
const input = { id: "doc_abc123" };

// Output
{ success: true }
```

### 7.3.7 Get Download URL

**Procedure:** `documents.getDownloadUrl` (query, protected)

```typescript
// Input
const input = { id: "doc_abc123" };

// Output
{
    downloadUrl: "https://storage.googleapis.com/...",
    expiresAt: "2024-01-15T12:30:00Z",
    filename: "report.pdf"
}
```

---

## 7.4 Search (tRPC Router)

### Router: `search`

All search procedures are available under the `search` router. Access via `trpc.search.<procedure>`.

### 7.4.1 Search Documents

**Procedure:** `search.query` (mutation, protected)

```typescript
// Input
const input = {
    query: "quarterly sales report 2024",
    options: {
        page: 1,
        perPage: 10,
        filters: {
            fileTypes: ["pdf", "docx"],
            sources: ["upload", "google_drive"],
            dateRange: {
                field: "createdAt",
                start: "2024-01-01",
                end: "2024-12-31"
            }
        },
        includeAnswer: true
    }
};

// Usage
const result = await trpc.search.query.mutate(input);

// Output
{
    answer: {
        text: "Based on the Q4 2024 Sales Report, total revenue increased by 23% compared to the previous quarter, reaching $4.2M. Key drivers included the new enterprise tier launch and expansion into European markets.",
        citations: [
            {
                documentId: "doc_abc123",
                filename: "Q4-2024-Sales-Report.pdf",
                passage: "Total revenue for Q4 2024 reached $4.2 million, representing a 23% increase...",
                page: 3
            }
        ],
        confidence: 0.92
    },
    results: [
        {
            documentId: "doc_abc123",
            filename: "Q4-2024-Sales-Report.pdf",
            fileType: "pdf",
            relevanceScore: 0.95,
            snippet: "...quarterly sales analysis showing strong growth in Q4 2024 with total revenue...",
            highlights: [
                { text: "quarterly sales", start: 3, end: 19 }
            ],
            source: "upload",
            createdAt: "2024-01-10T10:00:00Z"
        }
    ],
    pagination: {
        page: 1,
        perPage: 10,
        totalResults: 23
    },
    queryId: "qry_xyz789",
    latencyMs: 450
}
```

### 7.4.2 Ask Question (Conversational)

**Procedure:** `search.ask` (mutation, protected)

```typescript
// Input
const input = {
    question: "What were the main factors driving sales growth?",
    conversationId: "conv_abc123",  // optional, for follow-ups
    options: {
        maxSources: 5
    }
};

// Output
{
    answer: {
        text: "According to the sales reports, the main factors driving growth were:\n\n1. **Enterprise tier launch** - Added 15 new enterprise customers\n2. **European expansion** - 40% of new revenue from EU markets\n3. **Product improvements** - Reduced churn by 25%",
        citations: [
            {
                documentId: "doc_abc123",
                filename: "Q4-2024-Sales-Report.pdf",
                passage: "Enterprise tier launch contributed 15 new customers...",
                page: 5
            },
            {
                documentId: "doc_def456",
                filename: "Growth-Analysis.docx",
                passage: "European market expansion accounted for 40% of new revenue...",
                page: 2
            }
        ]
    },
    conversationId: "conv_abc123",
    queryId: "qry_xyz790",
    suggestedFollowups: [
        "How does this compare to Q3?",
        "Which enterprise customers were added?",
        "What products drove the most growth?"
    ]
}
```

### 7.4.3 Submit Feedback

**Procedure:** `search.submitFeedback` (mutation, protected)

```typescript
// Input
const input = {
    queryId: "qry_xyz789",
    rating: "positive",  // "positive" | "negative"
    comment: "Very helpful answer"  // optional
};

// Output
{ success: true }
```

### 7.4.4 Get Search History

**Procedure:** `search.getHistory` (query, protected)

```typescript
// Input
const input = {
    limit: 20,
    offset: 0
};

// Output
{
    searches: [
        {
            id: "qry_xyz789",
            query: "quarterly sales report 2024",
            queryType: "search",
            resultsCount: 23,
            answerGenerated: true,
            createdAt: "2024-01-15T12:00:00Z"
        }
    ],
    total: 150
}
```

---

## 7.5 Integrations (tRPC Router)

### Router: `integrations`

All integration procedures are available under the `integrations` router. Access via `trpc.integrations.<procedure>`.

### 7.5.1 Connect Google Drive

**Procedure:** `integrations.googleDrive.getAuthUrl` (mutation, admin)

```typescript
// Output
{
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?...",
    state: "oauth_state_xyz"
}
```

### 7.5.2 Google Drive Callback

**Procedure:** `integrations.googleDrive.handleCallback` (mutation, admin)

```typescript
// Input
const input = {
    code: "google_oauth_code",
    state: "oauth_state_xyz"
};

// Output
{
    integrationId: "int_abc123",
    success: true
}
```

### 7.5.3 List Integrations

**Procedure:** `integrations.list` (query, protected)

```typescript
// Output
{
    data: [
        {
            id: "int_abc123",
            type: "google_drive",
            name: "Company Drive",
            status: "connected",
            syncStatus: "synced",
            lastSyncAt: "2024-01-15T10:00:00Z",
            nextSyncAt: "2024-01-15T16:00:00Z",
            documentsSynced: 1250,
            totalSizeBytes: 5368709120,
            settings: {
                folderIds: ["folder1", "folder2"],
                syncFrequencyHours: 6
            },
            createdAt: "2024-01-01T00:00:00Z"
        }
    ]
}
```

### 7.5.4 Update Integration Settings

**Procedure:** `integrations.updateSettings` (mutation, admin)

```typescript
// Input
const input = {
    id: "int_abc123",
    settings: {
        folderIds: ["folder1", "folder2", "folder3"],
        syncFrequencyHours: 12
    }
};
```

### 7.5.5 Trigger Sync

**Procedure:** `integrations.triggerSync` (mutation, admin)

```typescript
// Input
const input = { id: "int_abc123" };

// Output
{
    success: true,
    message: "Sync started"
}
```

### 7.5.6 Disconnect Integration

**Procedure:** `integrations.disconnect` (mutation, admin)

```typescript
// Input
const input = { id: "int_abc123" };

// Output
{ success: true }
```

### 7.5.7 List Drive Folders

**Procedure:** `integrations.googleDrive.listFolders` (query, admin)

```typescript
// Input (optional parent folder)
const input = { parentId: "folder_123" };

// Output
{
    folders: [
        {
            id: "folder_abc",
            name: "Marketing",
            path: "/Shared Drives/Company/Marketing"
        }
    ]
}
```

---

## 7.6 Team Management (tRPC Router)

### Router: `team`

All team procedures are available under the `team` router. Access via `trpc.team.<procedure>`.

### 7.6.1 List Members

**Procedure:** `team.listMembers` (query, protected)

```typescript
// Input (optional filters)
const input = {
    status: "active",  // optional: "active" | "pending" | "suspended"
    role: "member"     // optional: "admin" | "member" | "viewer"
};

// Output
{
    members: [
        {
            id: "mem_abc123",
            userId: "usr_xyz789",
            email: "john@example.com",
            name: "John Doe",
            role: "member",
            status: "active",
            lastActiveAt: "2024-01-15T10:00:00Z",
            joinedAt: "2024-01-01T00:00:00Z"
        }
    ],
    total: 15
}
```

### 7.6.2 Invite Member

**Procedure:** `team.invite` (mutation, admin)

```typescript
// Input
const input = {
    email: "newuser@example.com",
    role: "member"  // "admin" | "member" | "viewer"
};

// Output
{
    invitationId: "inv_abc123",
    email: "newuser@example.com",
    expiresAt: "2024-01-22T12:00:00Z"
}
```

### 7.6.3 Bulk Invite Members

**Procedure:** `team.bulkInvite` (mutation, admin)

```typescript
// Input
const input = {
    emails: ["user1@example.com", "user2@example.com"],
    role: "member"
};

// Output
{
    sent: 2,
    failed: 0,
    invitations: [
        { email: "user1@example.com", status: "sent" },
        { email: "user2@example.com", status: "sent" }
    ]
}
```

### 7.6.4 Update Member Role

**Procedure:** `team.updateRole` (mutation, admin)

```typescript
// Input
const input = {
    memberId: "mem_abc123",
    role: "admin"
};

// Output
{ success: true }
```

### 7.6.5 Remove Member

**Procedure:** `team.removeMember` (mutation, admin)

```typescript
// Input
const input = { memberId: "mem_abc123" };

// Output
{ success: true }
```

### 7.6.6 Resend Invitation

**Procedure:** `team.resendInvitation` (mutation, admin)

```typescript
// Input
const input = { invitationId: "inv_abc123" };

// Output
{
    success: true,
    newExpiresAt: "2024-01-29T12:00:00Z"
}
```

### 7.6.7 Cancel Invitation

**Procedure:** `team.cancelInvitation` (mutation, admin)

```typescript
// Input
const input = { invitationId: "inv_abc123" };

// Output
{ success: true }
```

---

## 7.7 Settings & Organization (tRPC Router)

### Router: `settings`

All settings procedures are available under the `settings` router. Access via `trpc.settings.<procedure>`.

### 7.7.1 Get Organization

**Procedure:** `settings.getOrganization` (query, protected)

```typescript
// Output
{
    id: "org_xyz789",
    name: "Acme Corp",
    slug: "acme-corp",
    plan: "growth",
    storageQuotaBytes: 107374182400,  // 100 GB
    storageUsedBytes: 5368709120,      // 5 GB
    settings: {
        domainRestrictions: ["acme.com"],
        requireMfa: false,
        sessionTimeoutHours: 24
    },
    createdAt: "2024-01-01T00:00:00Z"
}
```

### 7.7.2 Update Organization

**Procedure:** `settings.updateOrganization` (mutation, admin)

```typescript
// Input
const input = {
    name: "Acme Corporation",
    settings: {
        domainRestrictions: ["acme.com", "acme.co"],
        requireMfa: true
    }
};
```

### 7.7.3 Get Usage Stats

**Procedure:** `settings.getUsageStats` (query, protected)

```typescript
// Output
{
    storage: {
        usedBytes: 5368709120,
        quotaBytes: 107374182400,
        percentUsed: 5
    },
    documents: {
        total: 1250,
        byType: {
            pdf: 800,
            docx: 300,
            xlsx: 150
        },
        bySource: {
            upload: 500,
            google_drive: 750
        }
    },
    searches: {
        thisMonth: 2500,
        lastMonth: 2100
    },
    team: {
        totalMembers: 15,
        activeMembers: 12
    }
}
```

### 7.7.4 Get Billing Info

**Procedure:** `settings.getBillingInfo` (query, admin)

```typescript
// Output
{
    plan: "growth",
    status: "active",
    currentPeriodEnd: "2024-02-15T00:00:00Z",
    cancelAtPeriodEnd: false,
    paymentMethod: {
        type: "card",
        last4: "4242",
        brand: "visa",
        expiryMonth: 12,
        expiryYear: 2025
    }
}
```

### 7.7.5 Create Billing Portal Session

**Procedure:** `settings.createBillingPortalSession` (mutation, admin)

```typescript
// Output
{
    url: "https://billing.stripe.com/session/..."
}
```

### 7.7.6 Export Organization Data

**Procedure:** `settings.requestDataExport` (mutation, admin)

```typescript
// Output
{
    exportId: "exp_abc123",
    status: "processing",
    estimatedCompletionAt: "2024-01-15T14:00:00Z"
}
```

### 7.7.7 Get API Keys

**Procedure:** `settings.listApiKeys` (query, admin)

```typescript
// Output
{
    keys: [
        {
            id: "key_abc123",
            name: "Production API",
            prefix: "dm_live_abc",
            scopes: ["read", "write"],
            lastUsedAt: "2024-01-15T10:00:00Z",
            createdAt: "2024-01-01T00:00:00Z"
        }
    ]
}
```

### 7.7.8 Create API Key

**Procedure:** `settings.createApiKey` (mutation, admin)

```typescript
// Input
const input = {
    name: "CI/CD Integration",
    scopes: ["read"]  // "read" | "write" | "admin"
};

// Output (key only shown once!)
{
    id: "key_xyz789",
    name: "CI/CD Integration",
    key: "dm_live_xyz789_fullkeyonlyshownonce",
    prefix: "dm_live_xyz",
    scopes: ["read"],
    createdAt: "2024-01-15T12:00:00Z"
}
```

### 7.7.9 Revoke API Key

**Procedure:** `settings.revokeApiKey` (mutation, admin)

```typescript
// Input
const input = { keyId: "key_abc123" };

// Output
{ success: true }
```

---

## 7.8 Error Handling

### tRPC Error Format

tRPC uses `TRPCError` for all errors. Errors are automatically serialized and typed.

**Error Response Structure:**
```typescript
{
    error: {
        message: "Invalid request parameters",
        code: "BAD_REQUEST",
        data: {
            code: "BAD_REQUEST",
            httpStatus: 400,
            path: "documents.getById",
            zodError: {  // If validation error
                issues: [
                    {
                        path: ["id"],
                        message: "Invalid uuid"
                    }
                ]
            }
        }
    }
}
```

### tRPC Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `PAYLOAD_TOO_LARGE` | 413 | Request body too large |
| `PRECONDITION_FAILED` | 412 | Quota exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |

### Custom Error Handling

```typescript
// Throwing errors in procedures
import { TRPCError } from '@trpc/server';

throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Document not found',
    cause: { documentId: input.id }
});

// Client-side error handling
try {
    await trpc.documents.getById.query({ id: 'invalid' });
} catch (error) {
    if (error instanceof TRPCClientError) {
        console.log(error.data?.code);  // "NOT_FOUND"
        console.log(error.message);      // "Document not found"
    }
}
```

### Zod Validation Errors

Input validation errors automatically include Zod error details:

```typescript
// If input fails Zod validation
{
    error: {
        code: "BAD_REQUEST",
        message: "Validation error",
        data: {
            zodError: {
                issues: [
                    {
                        code: "invalid_type",
                        expected: "string",
                        received: "undefined",
                        path: ["filename"],
                        message: "Required"
                    }
                ]
            }
        }
    }
}
```

---

# 8. Security & Compliance

## 8.1 Security Architecture

### 8.1.1 Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 1: EDGE                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Cloud Armor (WAF) - OWASP Top 10 protection                     │   │
│  │  • DDoS protection (automatic)                                      │   │
│  │  • SSL/TLS termination (TLS 1.3)                                   │   │
│  │  • Geographic restrictions (optional)                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LAYER 2: APPLICATION                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Authentication (JWT + refresh tokens)                            │   │
│  │  • Authorization (RBAC per endpoint)                                │   │
│  │  • Input validation (Zod schemas)                                   │   │
│  │  • Rate limiting (per user, per IP)                                │   │
│  │  • CSRF protection                                                  │   │
│  │  • Security headers (CSP, HSTS, X-Frame-Options)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LAYER 3: DATA                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Encryption at rest (AES-256-GCM)                                │   │
│  │  • Encryption in transit (TLS 1.3)                                 │   │
│  │  • Customer-managed encryption keys (CMEK) - optional             │   │
│  │  • Database encryption (Cloud SQL automatic)                       │   │
│  │  • Secrets management (Secret Manager)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LAYER 4: INFRASTRUCTURE                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • VPC with private subnets                                        │   │
│  │  • IAM least privilege                                             │   │
│  │  • Service accounts per component                                  │   │
│  │  • No public IPs on backend services                              │   │
│  │  • Cloud NAT for egress                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 8.2 Authentication Security

### 8.2.1 Password Requirements

| Requirement | Value |
|-------------|-------|
| Minimum length | 8 characters |
| Complexity | Uppercase, lowercase, number, symbol |
| Common password check | Yes (against known breached passwords) |
| Password history | Prevent reuse of last 5 passwords |
| Maximum age | Optional, default disabled |

### 8.2.2 Session Security

| Parameter | Value |
|-----------|-------|
| Token algorithm | JWT (RS256) |
| Access token lifetime | 1 hour |
| Refresh token lifetime | 7 days |
| Idle timeout | 24 hours |
| Concurrent sessions | Unlimited (trackable) |
| Secure cookie flags | HttpOnly, Secure, SameSite=Strict |

### 8.2.3 Multi-Factor Authentication

| Feature | Implementation |
|---------|----------------|
| Method | TOTP (RFC 6238) |
| Compatible apps | Google Authenticator, Authy, 1Password |
| Recovery codes | 10 single-use codes |
| Admin enforcement | Organization-wide toggle |

## 8.3 Data Security

### 8.3.1 Encryption

| Data State | Encryption Method | Key Management |
|------------|-------------------|----------------|
| At rest (GCS) | AES-256-GCM | Google-managed or CMEK |
| At rest (Cloud SQL) | AES-256 | Google-managed |
| In transit | TLS 1.3 | Automatic |
| Backups | AES-256-GCM | Google-managed |

### 8.3.2 Customer Data Isolation

**Logical Isolation:**
- Separate GCS prefix per organization
- All database queries filtered by `org_id`
- Separate Vertex AI Search data store per organization

**Technical Controls:**
```sql
-- Example: Row-level security policy
CREATE POLICY org_isolation ON documents
    USING (org_id = current_setting('app.current_org_id')::uuid);
```

### 8.3.3 Data Retention & Deletion

| Data Type | Default Retention | Deletion Method |
|-----------|-------------------|-----------------|
| Documents | Until user deletes | Soft delete → Hard delete after 30 days |
| Search logs | 90 days | Automatic purge |
| Audit logs | 1 year | Automatic archive |
| Sessions | Until expiry/revocation | Automatic cleanup |
| Account data | Until account closure | Full purge within 30 days |

## 8.4 SOC 2 Type I Compliance

### 8.4.1 Trust Service Criteria Coverage

| Criterion | Status | Key Controls |
|-----------|--------|--------------|
| **Security** | ✅ In scope | Access controls, encryption, logging |
| **Availability** | ✅ In scope | SLA, redundancy, incident response |
| **Processing Integrity** | ⚪ Out of scope | N/A for initial certification |
| **Confidentiality** | ✅ In scope | Data encryption, access controls |
| **Privacy** | ✅ In scope | Data handling, consent, deletion |

### 8.4.2 Required Policies & Procedures

| Policy | Status | Owner |
|--------|--------|-------|
| Information Security Policy | Required | CISO/Founder |
| Access Control Policy | Required | Engineering Lead |
| Data Classification Policy | Required | CISO/Founder |
| Incident Response Plan | Required | Engineering Lead |
| Business Continuity Plan | Required | Operations |
| Vendor Management Policy | Required | Operations |
| Change Management Policy | Required | Engineering Lead |
| Employee Security Policy | Required | HR/Founder |

### 8.4.3 Technical Controls for SOC 2

| Control | Implementation |
|---------|----------------|
| Unique user IDs | Email-based accounts |
| Password complexity | Enforced at signup/change |
| MFA availability | TOTP-based |
| Session timeout | Configurable, default 24h |
| Access reviews | Quarterly (documented) |
| Audit logging | All security events |
| Encryption at rest | AES-256 |
| Encryption in transit | TLS 1.3 |
| Vulnerability scanning | Weekly automated scans |
| Penetration testing | Annual third-party |
| Security training | Annual employee training |
| Incident response | Documented process |

## 8.5 Privacy & Data Handling

### 8.5.1 GDPR Considerations

| Requirement | Implementation |
|-------------|----------------|
| Lawful basis | Contract/consent |
| Data minimization | Collect only necessary data |
| Purpose limitation | Search/AI features only |
| Storage limitation | Configurable retention |
| Data subject rights | Export, deletion, access APIs |
| Data processing agreements | Standard DPA available |
| International transfers | GCP regions, SCCs |

### 8.5.2 Customer Data Processing

**What We Process:**
- Document content (for indexing and search)
- Document metadata (filenames, sizes, dates)
- Search queries (for functionality and improvement)
- Usage data (for billing and analytics)

**What We Don't Do:**
- Train AI models on customer data
- Share data between customers
- Sell or monetize customer data
- Access data without customer permission

## 8.6 Audit Logging

### 8.6.1 Logged Events

| Category | Events |
|----------|--------|
| Authentication | Login, logout, failed login, password change, MFA events |
| Authorization | Permission denied, role change |
| Data access | Document view, download, search queries |
| Data modification | Document upload, delete, metadata change |
| Admin actions | Settings change, member invite/remove, billing change |
| Integration | Connect, disconnect, sync events |
| Security | API key creation/revocation, session revocation |

### 8.6.2 Log Format

```json
{
    "id": "log_abc123",
    "timestamp": "2024-01-15T12:00:00.000Z",
    "org_id": "org_xyz789",
    "user_id": "usr_def456",
    "action": "document.downloaded",
    "resource_type": "document",
    "resource_id": "doc_ghi789",
    "details": {
        "filename": "report.pdf",
        "file_size": 1048576
    },
    "context": {
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "request_id": "req_jkl012"
    }
}
```

### 8.6.3 Log Retention & Access

| Aspect | Specification |
|--------|---------------|
| Retention period | 1 year minimum |
| Storage | Cloud Logging + BigQuery export |
| Access | Admin role only |
| Export | CSV/JSON download available |
| Immutability | Write-once, no modification |

---

# 9. Infrastructure & DevOps

## 9.1 GCP Resource Architecture

### 9.1.1 Project Structure

```
documind-platform/
├── documind-prod/           # Production environment
│   ├── Cloud Run services
│   ├── Cloud SQL (production)
│   ├── GCS buckets (customer data)
│   ├── Vertex AI Search resources
│   └── Monitoring & alerting
├── documind-staging/        # Staging environment
│   ├── Mirror of production
│   └── Synthetic test data
├── documind-dev/            # Development environment
│   └── Developer sandboxes
└── documind-shared/         # Shared resources
    ├── Artifact Registry
    ├── Secret Manager
    └── Cloud Build
```

### 9.1.2 Resource Naming Convention

```
{resource-type}-{project}-{environment}-{component}-{region}

Examples:
- cr-documind-prod-api-us-central1       (Cloud Run service)
- sql-documind-prod-main-us-central1     (Cloud SQL instance)
- gcs-documind-prod-documents-us         (GCS bucket)
- topic-documind-prod-indexing           (Pub/Sub topic)
```

## 9.2 Cloud Run Configuration

### 9.2.1 API Service

```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 60
      containers:
        - image: gcr.io/documind-prod/api:latest
          resources:
            limits:
              cpu: "2"
              memory: "2Gi"
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-url
                  key: latest
          ports:
            - containerPort: 8080
```

### 9.2.2 Worker Service

```yaml
# worker.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: indexing-worker
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "5"
    spec:
      containerConcurrency: 1  # Process one job at a time
      timeoutSeconds: 900      # 15 minutes max
      containers:
        - image: gcr.io/documind-prod/worker:latest
          resources:
            limits:
              cpu: "2"
              memory: "4Gi"
```

## 9.3 Database Configuration

### 9.3.1 Cloud SQL Instance

```
Instance: sql-documind-prod-main-us-central1
Type: PostgreSQL 15
Tier: db-custom-2-8192 (2 vCPU, 8 GB RAM)
Storage: 100 GB SSD (auto-increase enabled)
Availability: High availability (regional)
Backups: Daily, 7-day retention
Point-in-time recovery: Enabled
Maintenance window: Sunday 02:00-06:00 UTC
```

### 9.3.2 Connection Pooling

```
PgBouncer via Cloud SQL Auth Proxy
Max connections: 100
Pool mode: Transaction
```

## 9.4 Monitoring & Alerting

### 9.4.1 Key Metrics

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API latency (p95) | > 500ms | > 2s | Scale up, investigate |
| API error rate | > 1% | > 5% | Page on-call |
| CPU utilization | > 70% | > 90% | Auto-scale |
| Memory utilization | > 80% | > 95% | Investigate leaks |
| Database connections | > 80 | > 95 | Scale instance |
| Storage usage | > 80% | > 95% | Alert admin |
| Search latency | > 2s | > 5s | Investigate Vertex AI |

### 9.4.2 Alerting Channels

| Severity | Channel | Response Time |
|----------|---------|---------------|
| Critical | PagerDuty | 15 minutes |
| Warning | Slack #alerts | 1 hour |
| Info | Email digest | Daily |

## 9.5 CI/CD Pipeline

### 9.5.1 Pipeline Stages

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Commit    │───▶│    Build    │───▶│    Test     │───▶│   Deploy    │
│             │    │             │    │             │    │   Staging   │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                │
                   ┌─────────────┐    ┌─────────────┐           │
                   │   Deploy    │◀───│   Approve   │◀──────────┘
                   │ Production  │    │   (Manual)  │
                   └─────────────┘    └─────────────┘
```

### 9.5.2 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: api
          region: us-central1
          image: gcr.io/${{ env.PROJECT_ID }}/api:${{ github.sha }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: api
          region: us-central1
          image: gcr.io/${{ env.PROJECT_ID }}/api:${{ github.sha }}
```

## 9.6 Disaster Recovery

### 9.6.1 Backup Strategy

| Component | Backup Method | Frequency | Retention |
|-----------|---------------|-----------|-----------|
| Database | Cloud SQL automated | Daily | 7 days |
| Database | Manual snapshot | Weekly | 30 days |
| Documents (GCS) | Cross-region replication | Real-time | N/A |
| Secrets | Secret Manager versioning | On change | 10 versions |
| Configuration | Git repository | On change | Unlimited |

### 9.6.2 Recovery Objectives

| Metric | Target | Notes |
|--------|--------|-------|
| RPO (Recovery Point Objective) | 1 hour | Maximum data loss |
| RTO (Recovery Time Objective) | 4 hours | Maximum downtime |

### 9.6.3 Recovery Procedures

| Scenario | Procedure | Estimated Time |
|----------|-----------|----------------|
| Database failure | Failover to replica | Automatic (< 1 min) |
| Region outage | Deploy to secondary region | 2-4 hours |
| Data corruption | Restore from backup | 1-2 hours |
| Security breach | Rotate credentials, audit | 2-4 hours |

---

# 10. Non-Functional Requirements

## 10.1 Performance Requirements

| Metric | Requirement | Measurement |
|--------|-------------|-------------|
| Page load time | < 2 seconds | 95th percentile |
| API response time | < 500ms | 95th percentile (non-search) |
| Search response time | < 3 seconds | 95th percentile |
| Upload throughput | 10 MB/s minimum | Per user |
| Concurrent users | 100 per organization | Without degradation |

## 10.2 Availability Requirements

| Metric | Requirement |
|--------|-------------|
| Uptime SLA | 99.9% (43.8 min downtime/month) |
| Planned maintenance window | Sunday 02:00-06:00 UTC |
| Maintenance notification | 72 hours advance notice |
| Status page | https://status.documind.ai |

## 10.3 Scalability Requirements

| Dimension | Current | 1 Year Target |
|-----------|---------|---------------|
| Organizations | 10 | 500 |
| Total users | 100 | 10,000 |
| Documents indexed | 10,000 | 5,000,000 |
| Storage | 100 GB | 10 TB |
| Searches/day | 1,000 | 500,000 |

## 10.4 Compatibility Requirements

### 10.4.1 Browser Support

| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | Last 2 versions | Full |
| Firefox | Last 2 versions | Full |
| Safari | Last 2 versions | Full |
| Edge | Last 2 versions | Full |
| Mobile Safari | iOS 14+ | Full |
| Mobile Chrome | Android 10+ | Full |

### 10.4.2 File Format Support

| Format | Extension | Max Size | Notes |
|--------|-----------|----------|-------|
| PDF | .pdf | 100 MB | Searchable and scanned |
| Word | .docx | 50 MB | 2007+ format |
| PowerPoint | .pptx | 100 MB | 2007+ format |
| Excel | .xlsx | 50 MB | 2007+ format |
| Text | .txt | 10 MB | UTF-8 encoding |
| Markdown | .md | 10 MB | CommonMark |
| HTML | .html | 10 MB | Standard HTML5 |

## 10.5 Accessibility Requirements

| Standard | Target | Notes |
|----------|--------|-------|
| WCAG | 2.1 AA | Minimum compliance |
| Keyboard navigation | Full | All features accessible |
| Screen reader | Compatible | ARIA labels throughout |
| Color contrast | 4.5:1 minimum | Text and UI elements |

## 10.6 Localization Requirements

| Aspect | Initial Scope | Future |
|--------|---------------|--------|
| UI language | English only | Spanish, French, German |
| Date format | ISO 8601 / locale | Auto-detect |
| Number format | Locale-aware | Auto-detect |
| Currency | USD | Multi-currency |
| Time zone | UTC + user preference | Auto-detect |

---

# 11. Development Roadmap

## 11.1 Phase Overview

```
Phase 1: MVP (Weeks 1-6)
├── Core authentication
├── Document upload + indexing
├── Basic search
├── AI answers
└── Billing integration

Phase 2: Growth (Weeks 7-12)
├── Google Drive integration
├── Team management
├── Advanced search filters
├── Audit logging
└── SOC 2 preparation

Phase 3: Scale (Weeks 13-20)
├── SOC 2 Type I certification
├── API access
├── Analytics dashboard
├── Slack integration
└── Performance optimization

Phase 4: Expand (Weeks 21+)
├── Additional integrations
├── Advanced AI features
├── White-label option
└── Enterprise features
```

## 11.2 Detailed Sprint Plan

### Sprint 1-2: Foundation (Weeks 1-4)

| Task | Priority | Estimate |
|------|----------|----------|
| Project setup (repo, CI/CD, GCP) | P0 | 2 days |
| Database schema + migrations | P0 | 2 days |
| Authentication (email + Google OAuth) | P0 | 3 days |
| User registration + login UI | P0 | 2 days |
| Organization creation flow | P0 | 2 days |
| Basic dashboard layout | P0 | 2 days |
| GCS bucket setup + upload endpoint | P0 | 2 days |
| Document upload UI | P0 | 2 days |
| Vertex AI Search integration | P0 | 3 days |
| Basic search endpoint + UI | P0 | 3 days |

**Sprint 2 Deliverable:** Users can sign up, upload documents, and search

### Sprint 3-4: Core Features (Weeks 5-8)

| Task | Priority | Estimate |
|------|----------|----------|
| AI answer generation | P0 | 3 days |
| Citation display | P0 | 2 days |
| Answer feedback mechanism | P0 | 1 day |
| Document preview | P0 | 2 days |
| Document deletion | P0 | 1 day |
| Stripe integration | P0 | 3 days |
| Plan selection + upgrade flow | P0 | 2 days |
| Storage quota enforcement | P0 | 1 day |
| Google Drive OAuth connection | P1 | 3 days |
| Drive folder selection UI | P1 | 2 days |

**Sprint 4 Deliverable:** Full MVP with billing, ready for beta users

### Sprint 5-6: Team & Security (Weeks 9-12)

| Task | Priority | Estimate |
|------|----------|----------|
| Drive sync worker | P1 | 3 days |
| Team invitation flow | P1 | 2 days |
| Role management | P1 | 2 days |
| Member listing + removal | P1 | 1 day |
| Audit logging implementation | P1 | 3 days |
| Audit log viewer UI | P1 | 2 days |
| MFA implementation | P1 | 3 days |
| Security settings page | P1 | 2 days |
| SOC 2 policy documentation | P1 | 5 days |
| Security questionnaire preparation | P1 | 3 days |

**Sprint 6 Deliverable:** Team features complete, SOC 2 audit-ready

## 11.3 Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| Alpha release | Week 4 | Core search working, 5 internal testers |
| Beta release | Week 8 | Full MVP, 20 beta customers |
| Public launch | Week 12 | Stable product, 50 paying customers |
| SOC 2 Type I | Week 16 | Certification received |
| 100 customers | Week 24 | $15,000 MRR |

---

# 12. Appendices

## 12.1 Glossary

| Term | Definition |
|------|------------|
| **Chunking** | Breaking documents into smaller pieces for embedding |
| **CMEK** | Customer-Managed Encryption Keys |
| **Data Store** | Vertex AI Search container for indexed documents |
| **Embedding** | Vector representation of text for semantic search |
| **MFA** | Multi-Factor Authentication |
| **RAG** | Retrieval-Augmented Generation |
| **Semantic Search** | Search based on meaning, not just keywords |
| **SOC 2** | Service Organization Control 2 compliance framework |
| **TOTP** | Time-based One-Time Password |

## 12.2 External Dependencies

| Dependency | Purpose | Criticality |
|------------|---------|-------------|
| Google Cloud Platform | Infrastructure | Critical |
| Vertex AI Search | Search + AI | Critical |
| Stripe | Payments | Critical |
| SendGrid/Resend | Transactional email | High |
| PagerDuty | Alerting | Medium |
| GitHub | Source control, CI/CD | High |

## 12.3 Reference Documents

- [Vertex AI Search Documentation](https://cloud.google.com/generative-ai-app-builder/docs)
- [GCP Security Best Practices](https://cloud.google.com/security/best-practices)
- [SOC 2 Compliance Guide](https://www.aicpa.org/soc2)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## 12.4 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-01-15 | Base Analytics | Initial draft |
| 0.2 | 2026-01-15 | Base Analytics | Updated tech stack to reflect actual implementation: TanStack Router (replacing React Router), tRPC (replacing REST), Better Auth (replacing custom JWT). Added monorepo structure documentation. Converted all API specs to tRPC procedures. Added settings/organization router. |

---

*End of Document*
