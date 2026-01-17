import { useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from "@documind/ui";
import { trpc } from "../../lib/trpc";
import { useOrg } from "../../components/layout/dashboard-layout";

// ============================================================================
// Simple Toggle Component (since Toggle is not exported)
// ============================================================================

function Toggle({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer
        border-2 border-black transition-colors
        ${checked ? 'bg-primary' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5
          transform bg-white border border-black shadow-neo-sm
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

// ============================================================================
// Slack Channel Configuration Component
// ============================================================================

interface ChannelConfig {
  id: string;
  channelId: string;
  channelName: string;
  channelType: string;
  isEnabled: boolean;
  indexRepliesOnly: boolean;
  minThreadLength: number;
  topic: string | null;
  stats: {
    totalThreads: number;
    indexedThreads: number;
    pendingThreads: number;
    failedThreads: number;
  };
}

interface IndexedThread {
  id: string;
  title: string | null;
  messageCount: number;
  participantCount: number;
  status: string;
  topicSummary: string | null;
}

function SlackChannelConfig({ orgId }: { orgId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  // Note: These tRPC endpoints (getChannels, updateChannel, getIndexedThreads)
  // are defined in the API but may not be generated in the client yet.
  // Using eslint-disable and any types for now - will work once tRPC types regenerate.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slackRouter = (trpc as any).slack;

  // Fetch channels
  const channelsQuery = slackRouter?.getChannels?.useQuery?.(
    { orgId },
    { enabled: expanded }
  );
  const channelData = channelsQuery?.data as { channels: ChannelConfig[] } | undefined;
  const isLoading = channelsQuery?.isLoading ?? false;

  // Update channel mutation
  const updateChannelMutation = slackRouter?.updateChannel?.useMutation?.();
  const updateChannel = {
    mutate: updateChannelMutation?.mutate ?? (() => {}),
    isPending: updateChannelMutation?.isPending ?? false,
  };

  // Fetch threads for selected channel
  const threadsQuery = slackRouter?.getIndexedThreads?.useQuery?.(
    { orgId, channelId: selectedChannel! },
    { enabled: !!selectedChannel }
  );
  const threadData = threadsQuery?.data as { threads: IndexedThread[] } | undefined;

  const handleToggleChannel = (channelId: string, isEnabled: boolean) => {
    updateChannel.mutate({
      orgId,
      channelId,
      isEnabled,
    });
  };

  const handleUpdateConfig = (
    channelId: string,
    field: "indexRepliesOnly" | "minThreadLength",
    value: boolean | number
  ) => {
    updateChannel.mutate({
      orgId,
      channelId,
      [field]: value,
    });
  };

  return (
    <div className="border-2 border-black bg-white">
      {/* Header - Toggle Expand */}
      <button
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center border-2 border-black bg-surface-lavender">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </div>
          <div className="text-left">
            <h4 className="font-bold">Channel Indexing</h4>
            <p className="text-sm text-muted-foreground">
              Configure which channels to index for knowledge base
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t-2 border-black p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !channelData?.channels.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No channels discovered yet.</p>
              <p className="text-sm">Channels are auto-discovered when DocuMind is invited.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {channelData.channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`border-2 border-black p-3 transition-colors ${
                    channel.isEnabled ? "bg-surface-mint" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Toggle
                        checked={channel.isEnabled}
                        onChange={(checked: boolean) =>
                          handleToggleChannel(channel.id, checked)
                        }
                        disabled={updateChannel.isPending}
                      />
                      <div>
                        <p className="font-bold">
                          #{channel.channelName}
                          <Badge
                            variant="outline"
                            className="ml-2 text-xs"
                          >
                            {channel.channelType}
                          </Badge>
                        </p>
                        {channel.topic && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {channel.topic}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Stats */}
                      <div className="text-right text-xs">
                        <p className="font-mono">
                          {channel.stats.indexedThreads}/{channel.stats.totalThreads} threads
                        </p>
                        {channel.stats.pendingThreads > 0 && (
                          <p className="text-yellow-600">
                            {channel.stats.pendingThreads} pending
                          </p>
                        )}
                        {channel.stats.failedThreads > 0 && (
                          <p className="text-red-600">
                            {channel.stats.failedThreads} failed
                          </p>
                        )}
                      </div>
                      {/* Expand Details */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setSelectedChannel(
                            selectedChannel === channel.id ? null : channel.id
                          )
                        }
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            selectedChannel === channel.id ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Channel Details */}
                  {selectedChannel === channel.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      {/* Config Options */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center justify-between p-2 bg-white border border-gray-200">
                          <div>
                            <p className="text-sm font-bold">Replies Only</p>
                            <p className="text-xs text-muted-foreground">
                              Only index threaded conversations
                            </p>
                          </div>
                          <Toggle
                            checked={channel.indexRepliesOnly}
                            onChange={(checked: boolean) =>
                              handleUpdateConfig(
                                channel.id,
                                "indexRepliesOnly",
                                checked
                              )
                            }
                            disabled={updateChannel.isPending}
                          />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white border border-gray-200">
                          <div>
                            <p className="text-sm font-bold">Min Thread Length</p>
                            <p className="text-xs text-muted-foreground">
                              Minimum messages to index
                            </p>
                          </div>
                          <select
                            value={channel.minThreadLength}
                            onChange={(e) =>
                              handleUpdateConfig(
                                channel.id,
                                "minThreadLength",
                                parseInt(e.target.value)
                              )
                            }
                            className="border-2 border-black px-2 py-1 text-sm"
                            disabled={updateChannel.isPending}
                          >
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                          </select>
                        </div>
                      </div>

                      {/* Recent Threads */}
                      {threadData?.threads && threadData.threads.length > 0 && (
                        <div>
                          <p className="text-sm font-bold mb-2">Recent Threads</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {threadData.threads.slice(0, 5).map((thread) => (
                              <div
                                key={thread.id}
                                className="p-2 bg-white border border-gray-200 text-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="truncate max-w-xs font-medium">
                                    {thread.title || "Untitled Thread"}
                                  </p>
                                  <Badge
                                    variant={
                                      thread.status === "indexed"
                                        ? "success"
                                        : thread.status === "failed"
                                        ? "error"
                                        : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {thread.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {thread.messageCount} messages,{" "}
                                  {thread.participantCount} participants
                                  {thread.topicSummary && (
                                    <> · {thread.topicSummary}</>
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  component: IntegrationsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    slack: search.slack as string | undefined,
    team: search.team as string | undefined,
    error: search.error as string | undefined,
  }),
});

function IntegrationsPage() {
  const org = useOrg();
  const utils = trpc.useUtils();
  const search = useSearch({ from: "/_authenticated/settings/integrations" });

  const [showSuccess, setShowSuccess] = useState(!!search.slack);
  const [showError, setShowError] = useState(!!search.error);

  // Fetch Slack status
  const { data: slackStatus, isLoading: slackLoading } = trpc.slack.getStatus.useQuery({
    orgId: org.id,
  });

  // Get install URL mutation
  const getInstallUrl = trpc.slack.getInstallUrl.useMutation({
    onSuccess: (data: { url: string }) => {
      // Redirect to Slack OAuth
      window.location.href = data.url;
    },
  });

  // Disconnect mutation
  const disconnect = trpc.slack.disconnect.useMutation({
    onSuccess: () => {
      utils.slack.getStatus.invalidate();
    },
  });

  const handleConnect = () => {
    getInstallUrl.mutate({ orgId: org.id });
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect Slack? Your team won't be able to use /ask commands.")) {
      disconnect.mutate({ orgId: org.id, revokeToken: true });
    }
  };

  const getErrorMessage = (error: string): string => {
    const messages: Record<string, string> = {
      access_denied: "You cancelled the Slack authorization",
      invalid_state: "The authorization request expired. Please try again.",
      workspace_connected_to_another_org: "This Slack workspace is already connected to another organization",
      unauthorized: "You need admin access to connect integrations",
      oauth_not_configured: "Slack OAuth is not configured on this server",
      internal_error: "An unexpected error occurred. Please try again.",
    };
    return messages[error] || error;
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/settings">
            <Button variant="ghost" size="icon-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-3xl uppercase tracking-tight">Integrations</h1>
            <p className="text-muted-foreground mt-1">Connect external services to DocuMind</p>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccess && search.team && (
        <Card variant="mint" className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 flex items-center justify-center border-2 border-black bg-white shadow-neo-sm shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-2">Slack Connected!</h3>
              <p className="text-sm text-muted-foreground">
                Successfully connected to <strong>{decodeURIComponent(search.team)}</strong>. Your team can now use{" "}
                <code className="px-1 py-0.5 bg-gray-100 border border-gray-200 text-sm">/ask</code> in Slack to search DocuMind.
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowSuccess(false)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </Card>
      )}

      {/* Error Alert */}
      {showError && search.error && (
        <Card className="p-6 border-destructive bg-red-50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 flex items-center justify-center border-2 border-black bg-white shadow-neo-sm shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-2 text-red-800">Connection Failed</h3>
              <p className="text-sm text-red-700">{getErrorMessage(search.error)}</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowError(false)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </Card>
      )}

      {/* Slack Integration */}
      <Card variant="lavender">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Slack Logo */}
            <div className="w-12 h-12 flex items-center justify-center border-2 border-black bg-white shadow-neo-sm">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/>
              </svg>
            </div>
            <div>
              <CardTitle>Slack</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Ask questions about your documents directly from Slack
              </p>
            </div>
          </div>
          {slackStatus?.isConnected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="outline">Not Connected</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {slackLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !slackStatus?.isOAuthConfigured ? (
            <div className="p-4 border-2 border-black bg-yellow-50">
              <p className="text-sm">
                <strong>Slack OAuth not configured.</strong> Contact your administrator to set up Slack integration.
              </p>
            </div>
          ) : slackStatus?.isConnected && slackStatus.workspace ? (
            <>
              {/* Connected State */}
              <div className="p-4 border-2 border-black bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{slackStatus.workspace.teamName}</p>
                    <p className="text-sm text-muted-foreground">
                      Connected {new Date(slackStatus.workspace.installedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnect.isPending}
                  >
                    {disconnect.isPending ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              </div>

              {/* Usage Stats */}
              {slackStatus.stats && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 border-2 border-black bg-white shadow-neo-sm">
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Slack Searches</p>
                    <p className="font-mono text-2xl font-bold">{slackStatus.stats.searchCount}</p>
                    <p className="text-sm text-muted-foreground">via /ask command</p>
                  </div>
                  <div className="p-4 border-2 border-black bg-white shadow-neo-sm">
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Slack Users</p>
                    <p className="font-mono text-2xl font-bold">{slackStatus.stats.userMappingCount}</p>
                    <p className="text-sm text-muted-foreground">who've used DocuMind</p>
                  </div>
                </div>
              )}

              {/* How to Use */}
              <div className="p-4 border-2 border-black bg-surface-mint">
                <h4 className="font-bold mb-2">How to Use</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 flex items-center justify-center border border-black bg-white text-xs font-bold shrink-0">1</span>
                    <span>Type <code className="px-1 py-0.5 bg-gray-100 border border-gray-200">/ask</code> in any Slack channel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 flex items-center justify-center border border-black bg-white text-xs font-bold shrink-0">2</span>
                    <span>Ask a question about your documents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 flex items-center justify-center border border-black bg-white text-xs font-bold shrink-0">3</span>
                    <span>Get AI-powered answers with source citations</span>
                  </li>
                </ul>
              </div>

              {/* Channel Configuration */}
              <SlackChannelConfig orgId={org.id} />

              {/* Scopes */}
              <div className="text-sm text-muted-foreground">
                <p className="font-bold mb-1">Permissions:</p>
                <div className="flex flex-wrap gap-1">
                  {slackStatus.workspace.scopes.map((scope: string) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <div className="p-4 border-2 border-black bg-white">
                <h4 className="font-bold mb-2">Connect Slack to DocuMind</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Allow your team to search documents and get AI-powered answers directly from Slack using the <code className="px-1 py-0.5 bg-gray-100 border border-gray-200">/ask</code> command.
                </p>
                <Button
                  onClick={handleConnect}
                  disabled={getInstallUrl.isPending}
                >
                  {getInstallUrl.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
                      </svg>
                      Add to Slack
                    </>
                  )}
                </Button>
              </div>

              {/* Features Preview */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 border-2 border-black bg-white">
                  <div className="w-8 h-8 flex items-center justify-center border-2 border-black bg-surface-blue mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h4 className="font-bold mb-1">/ask Command</h4>
                  <p className="text-sm text-muted-foreground">
                    Search documents and get answers without leaving Slack
                  </p>
                </div>
                <div className="p-4 border-2 border-black bg-white">
                  <div className="w-8 h-8 flex items-center justify-center border-2 border-black bg-surface-mint mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="font-bold mb-1">AI Answers</h4>
                  <p className="text-sm text-muted-foreground">
                    Get intelligent summaries with source citations
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon: More Integrations */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-muted-foreground">More Integrations Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 border-2 border-dashed border-gray-300 bg-gray-50 text-center">
              <p className="font-bold text-muted-foreground">Google Drive</p>
              <p className="text-xs text-muted-foreground">Auto-sync documents</p>
            </div>
            <div className="p-4 border-2 border-dashed border-gray-300 bg-gray-50 text-center">
              <p className="font-bold text-muted-foreground">Notion</p>
              <p className="text-xs text-muted-foreground">Import pages</p>
            </div>
            <div className="p-4 border-2 border-dashed border-gray-300 bg-gray-50 text-center">
              <p className="font-bold text-muted-foreground">Confluence</p>
              <p className="text-xs text-muted-foreground">Sync spaces</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
