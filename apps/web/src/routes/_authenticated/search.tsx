import { useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input, Button, Card, Badge } from "@documind/ui";
import { trpc } from "../../lib/trpc";
import { useOrg } from "../../components/layout/dashboard-layout";
import { DocumentViewer } from "../../components/document-viewer";

// Entity type styling
interface EntityStyle {
  bg: string;
  color: string;
  icon: string;
}

const ENTITY_TYPES: Record<string, EntityStyle> = {
  PERSON: { bg: "bg-blue-100", color: "text-blue-700", icon: "P" },
  ORGANIZATION: { bg: "bg-purple-100", color: "text-purple-700", icon: "O" },
  LOCATION: { bg: "bg-green-100", color: "text-green-700", icon: "L" },
  DATE: { bg: "bg-orange-100", color: "text-orange-700", icon: "D" },
  CONCEPT: { bg: "bg-pink-100", color: "text-pink-700", icon: "C" },
  PRODUCT: { bg: "bg-cyan-100", color: "text-cyan-700", icon: "Pr" },
  EVENT: { bg: "bg-yellow-100", color: "text-yellow-700", icon: "E" },
  TOPIC: { bg: "bg-indigo-100", color: "text-indigo-700", icon: "T" },
  MONEY: { bg: "bg-emerald-100", color: "text-emerald-700", icon: "$" },
  TECHNOLOGY: { bg: "bg-violet-100", color: "text-violet-700", icon: "Te" },
  OTHER: { bg: "bg-gray-100", color: "text-gray-700", icon: "?" },
};

const DEFAULT_ENTITY_STYLE: EntityStyle = { bg: "bg-gray-100", color: "text-gray-700", icon: "?" };

function getEntityStyle(type: string): EntityStyle {
  return ENTITY_TYPES[type] ?? DEFAULT_ENTITY_STYLE;
}

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

/**
 * Highlights query terms in a snippet
 */
function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  if (!query.trim()) {
    return <p className="text-sm text-muted-foreground mt-1">{snippet}</p>;
  }

  // Extract words from query (simple tokenization)
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  if (queryWords.length === 0) {
    return <p className="text-sm text-muted-foreground mt-1">{snippet}</p>;
  }

  // Create a regex pattern for highlighting
  const pattern = new RegExp(`(${queryWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = snippet.split(pattern);

  return (
    <p className="text-sm text-muted-foreground mt-1">
      {parts.map((part, i) => {
        const isMatch = queryWords.some(
          (word) => part.toLowerCase() === word.toLowerCase()
        );
        return isMatch ? (
          <mark key={i} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </p>
  );
}

// Document type for viewer
interface ViewableDocument {
  id: string;
  filename: string;
  fileType: string;
  mimeType: string;
}

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  md: "text/markdown",
};

function SearchPage() {
  const org = useOrg();
  const [query, setQuery] = useState("");
  const [viewingDocument, setViewingDocument] = useState<ViewableDocument | null>(null);
  const [queryMode, setQueryMode] = useState<"search" | "question">("search");
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
    answerSources: Array<{
      documentId: string;
      filename?: string;
      pageNumber?: number;
      relevance?: number;
    }>;
    tokensUsed: number;
    latencyMs: number;
    // Entity context
    entities: Array<{
      id: string;
      name: string;
      type: string;
      mentionCount: number;
      confidence: number;
    }>;
    relatedEntities: Array<{
      id: string;
      name: string;
      type: string;
      relationshipType: string;
      direction: "incoming" | "outgoing";
    }>;
    entitySummary: string;
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
        answerSources: data.answerSources,
        tokensUsed: data.tokensUsed,
        latencyMs: data.latencyMs,
        entities: data.entities,
        relatedEntities: data.relatedEntities,
        entitySummary: data.entitySummary,
      });
    },
  });

  // Handle search
  const handleSearch = useCallback((searchQuery?: string, forceMode?: "search" | "question") => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    // Auto-detect question mode if query ends with ?
    const mode = forceMode || (q.endsWith("?") ? "question" : queryMode);

    searchMutation.mutate({
      orgId: org.id,
      query: q,
      queryType: mode,
      limit: 10,
    });
  }, [query, org.id, searchMutation, queryMode]);

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
          {/* Mode Toggle */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <button
                className={`flex-1 px-6 py-3 border-2 border-black font-bold text-sm transition-all ${
                  queryMode === "search"
                    ? "bg-black text-white shadow-neo-sm"
                    : "bg-white hover:bg-gray-100 hover:shadow-neo-sm"
                }`}
                onClick={() => setQueryMode("search")}
                title="Find documents by keywords"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <div className="text-left">
                    <div>Keyword Search</div>
                    <div className="text-xs font-normal opacity-75">Find specific documents</div>
                  </div>
                </span>
              </button>
              <button
                className={`flex-1 px-6 py-3 border-2 border-black font-bold text-sm transition-all ${
                  queryMode === "question"
                    ? "bg-black text-white shadow-neo-sm"
                    : "bg-white hover:bg-gray-100 hover:shadow-neo-sm"
                }`}
                onClick={() => setQueryMode("question")}
                title="Ask questions and get AI answers"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div className="text-left">
                    <div>Ask AI</div>
                    <div className="text-xs font-normal opacity-75">Get instant answers</div>
                  </div>
                </span>
              </button>
            </div>
          </div>

          <div className="relative">
            <Input
              type="search"
              placeholder={queryMode === "question" ? "Ask a question about your documents..." : "Search your documents..."}
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
              ) : queryMode === "question" ? (
                "Ask"
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
                  setQueryMode("question");
                  handleSearch(suggestion, "question");
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
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
                      AI Answer
                    </h3>
                    {searchResults.tokensUsed > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {searchResults.tokensUsed.toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-lg whitespace-pre-wrap">{searchResults.answer}</p>
                  </div>

                  {/* Source Citations */}
                  {searchResults.answerSources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-black/20">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Sources
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {searchResults.answerSources.map((source, i) => {
                          const fileType = source.filename?.split(".").pop() ?? "file";
                          const fileIcon = FILE_ICONS[fileType] ?? { bg: "bg-gray-100", color: "text-gray-600", label: "FILE" };
                          return (
                            <button
                              key={i}
                              className="flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-white hover:bg-surface-yellow transition-colors text-sm"
                              onClick={() => source.filename && setViewingDocument({
                                id: source.documentId,
                                filename: source.filename,
                                fileType,
                                mimeType: MIME_TYPES[fileType] ?? "application/octet-stream",
                              })}
                            >
                              <span className={`w-5 h-5 flex items-center justify-center text-xs font-bold ${fileIcon.bg} ${fileIcon.color} border border-black`}>
                                {fileIcon.label.charAt(0)}
                              </span>
                              <span className="font-medium truncate max-w-[150px]">
                                {source.filename ?? "Document"}
                              </span>
                              {source.pageNumber && (
                                <span className="text-xs text-muted-foreground">
                                  p.{source.pageNumber}
                                </span>
                              )}
                              {source.relevance && (
                                <Badge variant="outline" className="text-xs">
                                  {source.relevance}%
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Entity Context */}
          {searchResults.entities.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
                  Related Entities
                </h3>
                <Link to="/entities" className="text-xs text-primary hover:underline">
                  Explore Graph
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchResults.entities.slice(0, 8).map((entity) => {
                  const style = getEntityStyle(entity.type);
                  return (
                    <Link
                      key={entity.id}
                      to="/entities"
                      search={{ entityId: entity.id }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 border-2 border-black ${style.bg} shadow-neo-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all`}
                    >
                      <span className={`text-xs font-bold ${style.color}`}>
                        {style.icon}
                      </span>
                      <span className="text-sm font-medium">{entity.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({entity.mentionCount})
                      </span>
                    </Link>
                  );
                })}
                {searchResults.entities.length > 8 && (
                  <Link
                    to="/entities"
                    className="inline-flex items-center px-3 py-1.5 border-2 border-black bg-gray-100 text-sm font-medium hover:bg-gray-200"
                  >
                    +{searchResults.entities.length - 8} more
                  </Link>
                )}
              </div>

              {/* Related Entities via Relationships */}
              {searchResults.relatedEntities.length > 0 && (
                <div className="mt-4 pt-3 border-t border-black/20">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Connected Entities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {searchResults.relatedEntities.slice(0, 5).map((rel) => {
                      const style = getEntityStyle(rel.type);
                      return (
                        <Link
                          key={rel.id}
                          to="/entities"
                          search={{ entityId: rel.id }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                        >
                          <span className={style.color}>{rel.direction === "outgoing" ? "→" : "←"}</span>
                          <span className="font-medium">{rel.name}</span>
                          <span className="text-muted-foreground">
                            {rel.relationshipType.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
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
                  <button
                    key={i}
                    className="w-full flex items-start gap-4 p-4 hover:bg-surface-yellow transition-colors cursor-pointer text-left"
                    onClick={() => setViewingDocument({
                      id: result.documentId,
                      filename: result.filename,
                      fileType: result.fileType,
                      mimeType: MIME_TYPES[result.fileType] ?? "application/octet-stream",
                    })}
                  >
                    {/* File Icon */}
                    <div className={`w-10 h-10 flex items-center justify-center border-2 border-black ${fileIcon.bg} shadow-neo-sm shrink-0`}>
                      <span className={`text-xs font-bold ${fileIcon.color}`}>{fileIcon.label}</span>
                    </div>

                    {/* Result Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{result.filename}</p>
                      <HighlightedSnippet snippet={result.snippet} query={query} />
                      {result.pageNumber && (
                        <Badge variant="outline" className="mt-2">Page {result.pageNumber}</Badge>
                      )}
                    </div>

                    {/* Score & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-bold">{Math.round(result.score * 100)}%</div>
                        <div className="text-xs text-muted-foreground">relevance</div>
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-surface-yellow transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    </div>
                  </button>
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

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          documentId={viewingDocument.id}
          filename={viewingDocument.filename}
          fileType={viewingDocument.fileType}
          mimeType={viewingDocument.mimeType}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
