-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'SLACK_WORKSPACE';
ALTER TYPE "EntityType" ADD VALUE 'SLACK_USER';
ALTER TYPE "EntityType" ADD VALUE 'SLACK_CHANNEL';
ALTER TYPE "EntityType" ADD VALUE 'SLACK_THREAD';
ALTER TYPE "EntityType" ADD VALUE 'SLACK_MESSAGE';
ALTER TYPE "EntityType" ADD VALUE 'SLACK_BOT';
ALTER TYPE "EntityType" ADD VALUE 'SLACK_FILE';
ALTER TYPE "EntityType" ADD VALUE 'SLACK_REACTION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RelationshipType" ADD VALUE 'MEMBER_OF';
ALTER TYPE "RelationshipType" ADD VALUE 'CONTAINS';
ALTER TYPE "RelationshipType" ADD VALUE 'PART_OF';
ALTER TYPE "RelationshipType" ADD VALUE 'AUTHORED_BY';
ALTER TYPE "RelationshipType" ADD VALUE 'POSTED_IN';
ALTER TYPE "RelationshipType" ADD VALUE 'REPLIED_TO';
ALTER TYPE "RelationshipType" ADD VALUE 'MENTIONED_IN';
ALTER TYPE "RelationshipType" ADD VALUE 'COLLABORATED_IN';
ALTER TYPE "RelationshipType" ADD VALUE 'ACTIVE_IN';
ALTER TYPE "RelationshipType" ADD VALUE 'REFERENCES';
ALTER TYPE "RelationshipType" ADD VALUE 'SHARES';
ALTER TYPE "RelationshipType" ADD VALUE 'REACTED_WITH';
ALTER TYPE "RelationshipType" ADD VALUE 'REACTED_TO';
ALTER TYPE "RelationshipType" ADD VALUE 'PINNED_IN';

-- CreateTable
CREATE TABLE "slack_workspaces" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "team_id" VARCHAR(20) NOT NULL,
    "team_name" VARCHAR(255) NOT NULL,
    "bot_user_id" VARCHAR(20) NOT NULL,
    "access_token" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "installer_id" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "installed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "slack_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_user_mappings" (
    "id" UUID NOT NULL,
    "slack_workspace_id" UUID NOT NULL,
    "slack_user_id" VARCHAR(20) NOT NULL,
    "user_id" VARCHAR(255),
    "slack_username" VARCHAR(255),
    "slack_display_name" VARCHAR(255),
    "slack_email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "slack_user_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_channel_configs" (
    "id" UUID NOT NULL,
    "slack_workspace_id" UUID NOT NULL,
    "channel_id" VARCHAR(20) NOT NULL,
    "channel_name" VARCHAR(255) NOT NULL,
    "channel_type" VARCHAR(20) NOT NULL DEFAULT 'public',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "index_replies_only" BOOLEAN NOT NULL DEFAULT true,
    "min_thread_length" INTEGER NOT NULL DEFAULT 2,
    "last_sync_at" TIMESTAMPTZ,
    "last_message_ts" VARCHAR(30),
    "member_count" INTEGER,
    "topic" VARCHAR(500),
    "purpose" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "slack_channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_indexed_threads" (
    "id" UUID NOT NULL,
    "channel_config_id" UUID NOT NULL,
    "thread_ts" VARCHAR(30) NOT NULL,
    "parent_message_ts" VARCHAR(30) NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "participant_count" INTEGER NOT NULL DEFAULT 0,
    "title" VARCHAR(500),
    "document_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_processed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "topic_summary" TEXT,
    "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "slack_indexed_threads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slack_workspaces_team_id_key" ON "slack_workspaces"("team_id");

-- CreateIndex
CREATE INDEX "slack_workspaces_org_id_idx" ON "slack_workspaces"("org_id");

-- CreateIndex
CREATE INDEX "slack_user_mappings_slack_workspace_id_idx" ON "slack_user_mappings"("slack_workspace_id");

-- CreateIndex
CREATE INDEX "slack_user_mappings_user_id_idx" ON "slack_user_mappings"("user_id");

-- CreateIndex
CREATE INDEX "slack_user_mappings_slack_email_idx" ON "slack_user_mappings"("slack_email");

-- CreateIndex
CREATE UNIQUE INDEX "slack_user_mappings_slack_workspace_id_slack_user_id_key" ON "slack_user_mappings"("slack_workspace_id", "slack_user_id");

-- CreateIndex
CREATE INDEX "slack_channel_configs_slack_workspace_id_idx" ON "slack_channel_configs"("slack_workspace_id");

-- CreateIndex
CREATE INDEX "slack_channel_configs_slack_workspace_id_is_enabled_idx" ON "slack_channel_configs"("slack_workspace_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "slack_channel_configs_slack_workspace_id_channel_id_key" ON "slack_channel_configs"("slack_workspace_id", "channel_id");

-- CreateIndex
CREATE INDEX "slack_indexed_threads_channel_config_id_idx" ON "slack_indexed_threads"("channel_config_id");

-- CreateIndex
CREATE INDEX "slack_indexed_threads_document_id_idx" ON "slack_indexed_threads"("document_id");

-- CreateIndex
CREATE INDEX "slack_indexed_threads_status_idx" ON "slack_indexed_threads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "slack_indexed_threads_channel_config_id_thread_ts_key" ON "slack_indexed_threads"("channel_config_id", "thread_ts");

-- AddForeignKey
ALTER TABLE "slack_workspaces" ADD CONSTRAINT "slack_workspaces_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_user_mappings" ADD CONSTRAINT "slack_user_mappings_slack_workspace_id_fkey" FOREIGN KEY ("slack_workspace_id") REFERENCES "slack_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_user_mappings" ADD CONSTRAINT "slack_user_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_channel_configs" ADD CONSTRAINT "slack_channel_configs_slack_workspace_id_fkey" FOREIGN KEY ("slack_workspace_id") REFERENCES "slack_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_indexed_threads" ADD CONSTRAINT "slack_indexed_threads_channel_config_id_fkey" FOREIGN KEY ("channel_config_id") REFERENCES "slack_channel_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_indexed_threads" ADD CONSTRAINT "slack_indexed_threads_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

