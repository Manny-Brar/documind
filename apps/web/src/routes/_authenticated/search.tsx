import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Input, Button, Card, Badge } from "@documind/ui";
import { trpc } from "../../lib/trpc";
import { useOrg } from "../../components/layout/dashboard-layout";

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

// File type icons
const FILE_ICONS: Record<string, { bg: string; color: string; label: string }> = {
  pdf: { bg: "bg-red-100", color: "text-red-600", label: "PDF" },
  docx: { bg: "bg-blue-100", color: "text-blue-600", label: "DOC" },
  pptx: { bg: "bg-orange-100", color: "text-orange-600", label: "PPT" },
  xlsx: { bg: "bg-green-100", color: "text-green-600", label: "XLS" },
  txt: { bg: "bg-gray-100", color: "text-gray-600", label: "TXT" },
  md: { bg: "bg-purple-100", color: "text-purple-600", label: "MD" },
};

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
  return d.toLocaleDateString();
}

function SearchPage() {
  const org = useOrg();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    results: Array<{
      documentId: string;
      filename: string;
      fileType: string;
      snippet: string;
      score: number;
      pageNumber?: number;
    }>;
    answer: string | null;
    latencyMs: number;
  } | null>(null);

  // Get recent searches
  const { data: recentSearches } = trpc.search.getRecentSearches.useQuery({
    orgId: org.id,
    limit: 5,
  });

  // Search mutation
  const searchMutation = trpc.search.query.useMutation({
    onSuccess: (data) => {
      setSearchResults({
        results: data.results,
        answer: data.answer,
        latencyMs: data.latencyMs,
      });
    },
  });

  // Handle search
  const handleSearch = useCallback((searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    searchMutation.mutate({
      orgId: org.id,
      query: q,
      queryType: q.endsWith("?") ? "question" : "search",
      limit: 10,
    });
  }, [query, org.id, searchMutation]);

  // Handle pressing enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  }, [handleSearch]);

  // Quick search suggestions
  const suggestions = [
    "What were Q4 revenue numbers?",
    "Summarize the marketing strategy",
    "Find all contracts from 2024",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl uppercase tracking-tight">Search</h1>
        <p className="text-muted-foreground mt-1">Ask questions about your documents</p>
      </div>

      {/* Search Box */}
      <Card variant="blue" className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Input
              type="search"
              placeholder="Ask anything about your documents..."
              inputSize="lg"
              className="pr-24"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              className="absolute right-1 top-1 h-12"
              onClick={() => handleSearch()}
              disabled={searchMutation.isPending || !query.trim()}
            >
              {searchMutation.isPending ? (
                <div className="h-5 w-5 animate-spin border-2 border-white border-t-transparent rounded-full" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  setQuery(suggestion);
                  handleSearch(suggestion);
                }}
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-6">
          {/* AI Answer */}
          {searchResults.answer && (
            <Card variant="mint" className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center border-2 border-black bg-white shadow-neo-sm shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-2">
                    AI Answer
                  </h3>
                  <p className="text-lg">{searchResults.answer}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
              {searchResults.results.length} Results Found
            </h2>
            <span className="text-xs text-muted-foreground">
              {searchResults.latencyMs}ms
            </span>
          </div>

          {/* Results List */}
          {searchResults.results.length > 0 ? (
            <Card className="divide-y-2 divide-black">
              {searchResults.results.map((result, i) => {
                const fileIcon = FILE_ICONS[result.fileType] ?? { bg: "bg-gray-100", color: "text-gray-600", label: "FILE" };
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 hover:bg-surface-yellow transition-colors cursor-pointer"
                  >
                    {/* File Icon */}
                    <div className={`w-10 h-10 flex items-center justify-center border-2 border-black ${fileIcon.bg} shadow-neo-sm shrink-0`}>
                      <span className={`text-xs font-bold ${fileIcon.color}`}>{fileIcon.label}</span>
                    </div>

                    {/* Result Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{result.filename}</p>
                      <p className="text-sm text-muted-foreground mt-1">{result.snippet}</p>
                      {result.pageNumber && (
                        <Badge variant="outline" className="mt-2">Page {result.pageNumber}</Badge>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div className="text-sm font-bold">{Math.round(result.score * 100)}%</div>
                      <div className="text-xs text-muted-foreground">relevance</div>
                    </div>
                  </div>
                );
              })}
            </Card>
          ) : (
            <Card variant="yellow" className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-white shadow-neo">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl uppercase mb-2">No Results Found</h3>
              <p className="text-muted-foreground">Try adjusting your search query or upload more documents.</p>
            </Card>
          )}
        </div>
      )}

      {/* Recent Searches - Only show if no active results */}
      {!searchResults && recentSearches && recentSearches.length > 0 && (
        <div>
          <h2 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Recent Searches
          </h2>
          <Card className="divide-y-2 divide-black">
            {recentSearches.map((search) => (
              <button
                key={search.id}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-yellow transition-colors"
                onClick={() => {
                  setQuery(search.query);
                  handleSearch(search.query);
                }}
              >
                <svg className="w-5 h-5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="flex-1 truncate">{search.query}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDate(search.createdAt)}
                </span>
              </button>
            ))}
          </Card>
        </div>
      )}

      {/* Empty State - Only show if no results and no recent searches */}
      {!searchResults && (!recentSearches || recentSearches.length === 0) && (
        <Card variant="lavender" className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-white shadow-neo">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl uppercase mb-2">Start Searching</h3>
            <p className="text-muted-foreground">
              Enter a question or keywords to search your documents. Our AI will find relevant information and generate answers.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
