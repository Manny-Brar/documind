import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Badge } from "@documind/ui";
import { trpc } from "../../lib/trpc";
import { useOrg } from "../../components/layout/dashboard-layout";

export const Route = createFileRoute("/_authenticated/settings/api-keys")({
  component: ApiKeysPage,
});

function formatDate(date: Date | string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  return d.toLocaleDateString();
}

function ApiKeysPage() {
  const org = useOrg();
  const utils = trpc.useUtils();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>(["read"]);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Fetch API keys
  const { data: apiKeys, isLoading } = trpc.apiKeys.list.useQuery({
    orgId: org.id,
  });

  // Create key mutation
  const createKey = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setNewKey(data.key);
      setKeyName("");
      setKeyScopes(["read"]);
      setExpiresInDays(undefined);
      utils.apiKeys.list.invalidate();
    },
  });

  // Revoke key mutation
  const revokeKey = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
    },
  });

  const handleScopeToggle = (scope: string) => {
    if (keyScopes.includes(scope)) {
      setKeyScopes(keyScopes.filter((s) => s !== scope));
    } else {
      setKeyScopes([...keyScopes, scope]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
            <h1 className="font-heading text-3xl uppercase tracking-tight">API Keys</h1>
            <p className="text-muted-foreground mt-1">Manage your API keys for programmatic access</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Key
        </Button>
      </div>

      {/* New Key Alert */}
      {newKey && (
        <Card variant="mint" className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 flex items-center justify-center border-2 border-black bg-white shadow-neo-sm shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-2">API Key Created</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Copy your API key now. You won't be able to see it again!
              </p>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-2 bg-white border-2 border-black font-mono text-sm truncate">
                  {newKey}
                </code>
                <Button
                  onClick={() => {
                    copyToClipboard(newKey);
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setNewKey(null)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-6">
          <h2 className="font-heading text-xl uppercase mb-6">Create New API Key</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production API Key"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="flex gap-4">
                {["read", "write", "search"].map((scope) => (
                  <label key={scope} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keyScopes.includes(scope)}
                      onChange={() => handleScopeToggle(scope)}
                      className="w-5 h-5 border-2 border-black"
                    />
                    <span className="capitalize">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expiration</Label>
              <select
                id="expires"
                className="w-full h-12 px-4 border-2 border-black bg-white"
                value={expiresInDays ?? "never"}
                onChange={(e) =>
                  setExpiresInDays(
                    e.target.value === "never" ? undefined : parseInt(e.target.value)
                  )
                }
              >
                <option value="never">Never expires</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() =>
                  createKey.mutate({
                    orgId: org.id,
                    name: keyName,
                    scopes: keyScopes as ("read" | "write" | "search")[],
                    expiresInDays,
                  })
                }
                disabled={createKey.isPending || !keyName || keyScopes.length === 0}
              >
                {createKey.isPending ? "Creating..." : "Create Key"}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin border-4 border-black border-t-transparent" />
            </div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <div className="divide-y-2 divide-black border-2 border-black">
              {apiKeys.map((key) => (
                <div key={key.id} className="p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center border-2 border-black bg-surface-yellow">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold">{key.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{key.keyPrefix}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Revoke this API key? This action cannot be undone.")) {
                            revokeKey.mutate({ keyId: key.id });
                          }
                        }}
                        disabled={revokeKey.isPending}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
                    <span>Created: {formatDate(key.createdAt)}</span>
                    <span>Last used: {formatDate(key.lastUsedAt)}</span>
                    <span>Calls: {key.usageCount.toLocaleString()}</span>
                    {key.expiresAt && <span>Expires: {formatDate(key.expiresAt)}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-surface-yellow shadow-neo">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl uppercase mb-2">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                Create an API key to access your documents programmatically.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>Create Your First Key</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card variant="lavender">
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use your API key to authenticate requests to the DocuMind API.
          </p>
          <div className="p-4 bg-white border-2 border-black font-mono text-sm overflow-x-auto">
            <pre>{`curl https://api.documind.ai/v1/documents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</pre>
          </div>
          <Button variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Full Documentation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
