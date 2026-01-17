import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Card, Badge, Input } from "@documind/ui";
import { trpc } from "../../lib/trpc";
import { useOrg } from "../../components/layout/dashboard-layout";
import { KnowledgeGraph, type GraphNode, type GraphLink } from "../../components/knowledge-graph";

export const Route = createFileRoute("/_authenticated/entities")({
  component: EntitiesPage,
});

// Entity type icons and colors
interface EntityTypeInfo {
  bg: string;
  color: string;
  borderColor: string;
  icon: string;
}

const ENTITY_TYPES: Record<string, EntityTypeInfo> = {
  PERSON: { bg: "bg-blue-100", color: "text-blue-700", borderColor: "border-blue-500", icon: "P" },
  ORGANIZATION: { bg: "bg-purple-100", color: "text-purple-700", borderColor: "border-purple-500", icon: "O" },
  LOCATION: { bg: "bg-green-100", color: "text-green-700", borderColor: "border-green-500", icon: "L" },
  DATE: { bg: "bg-orange-100", color: "text-orange-700", borderColor: "border-orange-500", icon: "D" },
  CONCEPT: { bg: "bg-pink-100", color: "text-pink-700", borderColor: "border-pink-500", icon: "C" },
  PRODUCT: { bg: "bg-cyan-100", color: "text-cyan-700", borderColor: "border-cyan-500", icon: "Pr" },
  EVENT: { bg: "bg-yellow-100", color: "text-yellow-700", borderColor: "border-yellow-500", icon: "E" },
  TOPIC: { bg: "bg-indigo-100", color: "text-indigo-700", borderColor: "border-indigo-500", icon: "T" },
  MONEY: { bg: "bg-emerald-100", color: "text-emerald-700", borderColor: "border-emerald-500", icon: "$" },
  TECHNOLOGY: { bg: "bg-violet-100", color: "text-violet-700", borderColor: "border-violet-500", icon: "Te" },
  OTHER: { bg: "bg-gray-100", color: "text-gray-700", borderColor: "border-gray-500", icon: "?" },
};

const DEFAULT_TYPE_INFO: EntityTypeInfo = ENTITY_TYPES.OTHER!;

function getEntityTypeInfo(type: string): EntityTypeInfo {
  return ENTITY_TYPES[type] ?? DEFAULT_TYPE_INFO;
}

const ENTITY_TYPE_OPTIONS = [
  "PERSON",
  "ORGANIZATION",
  "LOCATION",
  "DATE",
  "CONCEPT",
  "PRODUCT",
  "EVENT",
  "TOPIC",
  "MONEY",
  "TECHNOLOGY",
  "OTHER",
] as const;

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString();
}

type EntityType = (typeof ENTITY_TYPE_OPTIONS)[number];

type ViewMode = "list" | "graph";

function EntitiesPage() {
  const org = useOrg();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<EntityType | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Fetch entity stats
  const { data: stats, isLoading: statsLoading } = trpc.entities.getStats.useQuery({
    orgId: org.id,
  });

  // Fetch entities list
  const { data: entitiesData, isLoading: entitiesLoading } = trpc.entities.list.useQuery({
    orgId: org.id,
    search: searchQuery || undefined,
    type: selectedType || undefined,
    sortBy: "mentionCount",
    sortOrder: "desc",
    limit: 50,
  });

  // Fetch graph data (for graph view)
  const { data: graphData, isLoading: graphLoading } = trpc.entities.getGraph.useQuery(
    {
      orgId: org.id,
      nodeLimit: 100,
      centeredEntityId: selectedEntityId || undefined,
    },
    { enabled: viewMode === "graph" }
  );

  // Fetch selected entity details
  const { data: entityDetails, isLoading: detailsLoading } = trpc.entities.get.useQuery(
    {
      orgId: org.id,
      entityId: selectedEntityId!,
      includeMentions: true,
      includeRelationships: true,
      mentionLimit: 5,
    },
    { enabled: !!selectedEntityId }
  );

  // Transform graph data for visualization
  const graphNodes: GraphNode[] = graphData?.nodes.map((n) => ({
    id: n.id,
    name: n.label,
    type: n.type,
    mentionCount: n.mentionCount,
    confidence: n.confidence,
  })) || [];

  const graphLinks: GraphLink[] = graphData?.edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
    confidence: e.confidence,
  })) || [];

  const handleGraphNodeClick = (node: GraphNode) => {
    setSelectedEntityId(node.id);
  };

  const entities = entitiesData?.entities || [];
  const isLoading = statsLoading || entitiesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl uppercase tracking-tight">Knowledge Graph</h1>
          <p className="text-muted-foreground mt-1">
            Explore entities and relationships extracted from your documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex border-2 border-black">
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 font-bold text-sm ${
                viewMode === "list"
                  ? "bg-black text-white"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              <svg
                className="w-4 h-4 inline-block mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              List
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-4 py-2 font-bold text-sm border-l-2 border-black ${
                viewMode === "graph"
                  ? "bg-black text-white"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              <svg
                className="w-4 h-4 inline-block mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="6" cy="6" r="2" />
                <circle cx="18" cy="18" r="2" />
                <circle cx="18" cy="6" r="2" />
                <circle cx="6" cy="18" r="2" />
                <path d="M6 8v8M8 6h8M8 18h8M18 8v8" />
              </svg>
              Graph
            </button>
          </div>
          <Link to="/search">
            <Button variant="secondary">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search with Entities
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground uppercase tracking-wide">
              Total Entities
            </div>
            <div className="text-3xl font-heading mt-1">{stats.totalEntities}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground uppercase tracking-wide">
              Entity Mentions
            </div>
            <div className="text-3xl font-heading mt-1">{stats.totalMentions}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground uppercase tracking-wide">
              Relationships
            </div>
            <div className="text-3xl font-heading mt-1">{stats.totalRelationships}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground uppercase tracking-wide">
              Entity Types
            </div>
            <div className="text-3xl font-heading mt-1">{stats.entitiesByType.length}</div>
          </Card>
        </div>
      )}

      {/* Entity Type Distribution */}
      {!statsLoading && stats && stats.entitiesByType.length > 0 && (
        <Card className="p-4">
          <h3 className="font-heading text-lg uppercase mb-4">Entity Types</h3>
          <div className="flex flex-wrap gap-2">
            {stats.entitiesByType.map((item) => {
              const typeInfo = getEntityTypeInfo(item.type);
              const isSelected = selectedType === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => setSelectedType(isSelected ? null : (item.type as EntityType))}
                  className={`px-3 py-2 border-2 border-black transition-all ${
                    isSelected
                      ? `${typeInfo.bg} shadow-none translate-x-1 translate-y-1`
                      : "bg-white shadow-neo-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                  }`}
                >
                  <span className={`font-bold ${typeInfo.color}`}>{item.type}</span>
                  <span className="ml-2 text-muted-foreground">({item.count})</span>
                </button>
              );
            })}
            {selectedType && (
              <button
                onClick={() => setSelectedType(null)}
                className="px-3 py-2 border-2 border-black bg-gray-100 shadow-neo-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1"
              >
                Clear Filter
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Graph View */}
      {viewMode === "graph" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {graphLoading && (
              <Card className="p-12 text-center">
                <div className="inline-block h-12 w-12 animate-spin border-4 border-black border-t-transparent mb-4" />
                <p className="font-heading text-lg uppercase tracking-wider">
                  Loading graph...
                </p>
              </Card>
            )}
            {!graphLoading && (
              <KnowledgeGraph
                nodes={graphNodes}
                links={graphLinks}
                selectedNodeId={selectedEntityId}
                onNodeClick={handleGraphNodeClick}
                height={500}
                className="h-[500px]"
              />
            )}
          </div>

          {/* Entity Details Panel (Graph View) */}
          <div className="lg:col-span-1">
            {selectedEntityId && entityDetails && (
              <Card className="p-4 sticky top-4">
                <div className="space-y-4">
                  {(() => {
                    const typeInfo = getEntityTypeInfo(entityDetails.type);
                    return (
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 flex items-center justify-center border-2 border-black ${typeInfo.bg} shadow-neo-sm shrink-0`}
                        >
                          <span className={`text-sm font-bold ${typeInfo.color}`}>
                            {typeInfo.icon}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-heading text-lg uppercase">{entityDetails.name}</h3>
                          <Badge variant="outline">{entityDetails.type}</Badge>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-surface-mint border border-black">
                      <div className="font-bold">{entityDetails.mentionCount}</div>
                      <div className="text-xs text-muted-foreground">Mentions</div>
                    </div>
                    <div className="p-2 bg-surface-blue border border-black">
                      <div className="font-bold">{entityDetails.documentCount}</div>
                      <div className="text-xs text-muted-foreground">Documents</div>
                    </div>
                  </div>

                  {entityDetails.relationships.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase mb-2">Relationships</h4>
                      <div className="space-y-1">
                        {entityDetails.relationships.slice(0, 5).map((rel) => {
                          const relTypeInfo = getEntityTypeInfo(rel.relatedEntity.type);
                          return (
                            <button
                              key={rel.id}
                              onClick={() => setSelectedEntityId(rel.relatedEntity.id)}
                              className="w-full flex items-center gap-2 p-1.5 border border-gray-200 rounded hover:bg-gray-50 text-left text-xs"
                            >
                              <span className={relTypeInfo.color}>
                                {rel.direction === "outgoing" ? "→" : "←"}
                              </span>
                              <span className="font-medium truncate">{rel.relatedEntity.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedEntityId(null)}
                  >
                    Clear Selection
                  </Button>
                </div>
              </Card>
            )}

            {!selectedEntityId && (
              <Card variant="mint" className="p-6 text-center">
                <svg
                  className="w-10 h-10 mx-auto mb-3 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                <p className="text-sm text-muted-foreground">
                  Click on a node in the graph to view entity details
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Search entities by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity List */}
        <div className="lg:col-span-2">
          {isLoading && (
            <Card className="p-12 text-center">
              <div className="inline-block h-12 w-12 animate-spin border-4 border-black border-t-transparent mb-4" />
              <p className="font-heading text-lg uppercase tracking-wider">
                Loading entities...
              </p>
            </Card>
          )}

          {!isLoading && entities.length === 0 && (
            <Card variant="yellow" className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center border-2 border-black bg-white shadow-neo">
                  <svg
                    className="w-10 h-10 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h2 className="font-heading text-2xl uppercase tracking-tight mb-2">
                  No Entities Yet
                </h2>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || selectedType
                    ? "No entities match your search criteria"
                    : "Upload documents to automatically extract entities like people, organizations, and concepts"}
                </p>
                <Link to="/documents">
                  <Button size="lg">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Upload Documents
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {!isLoading && entities.length > 0 && (
            <Card>
              <div className="divide-y-2 divide-black">
                {entities.map((entity) => {
                  const typeInfo = getEntityTypeInfo(entity.type);
                  const isSelected = selectedEntityId === entity.id;
                  return (
                    <button
                      key={entity.id}
                      onClick={() => setSelectedEntityId(isSelected ? null : entity.id)}
                      className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
                        isSelected ? "bg-surface-yellow" : "hover:bg-surface-yellow"
                      }`}
                    >
                      {/* Entity Type Icon */}
                      <div
                        className={`w-12 h-12 flex items-center justify-center border-2 border-black ${typeInfo.bg} shadow-neo-sm`}
                      >
                        <span className={`text-sm font-bold ${typeInfo.color}`}>
                          {typeInfo.icon}
                        </span>
                      </div>

                      {/* Entity Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{entity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {entity.type} · {entity.mentionCount} mention
                          {entity.mentionCount !== 1 ? "s" : ""} · {entity.documentCount} doc
                          {entity.documentCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Confidence */}
                      <div className="text-right">
                        <div className="text-sm font-mono">
                          {Math.round(entity.confidence * 100)}%
                        </div>
                        <div className="text-xs text-muted-foreground">confidence</div>
                      </div>

                      {/* Arrow indicator */}
                      <svg
                        className={`w-5 h-5 transition-transform ${isSelected ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Entity Details Panel */}
        <div className="lg:col-span-1">
          {selectedEntityId && (
            <Card className="p-4 sticky top-4">
              {detailsLoading && (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin border-4 border-black border-t-transparent" />
                </div>
              )}

              {!detailsLoading && entityDetails && (
                <div className="space-y-6">
                  {/* Entity Header */}
                  <div>
                    <div className="flex items-start gap-3">
                      {(() => {
                        const typeInfo =
                          getEntityTypeInfo(entityDetails.type);
                        return (
                          <div
                            className={`w-12 h-12 flex items-center justify-center border-2 border-black ${typeInfo.bg} shadow-neo-sm shrink-0`}
                          >
                            <span className={`text-sm font-bold ${typeInfo.color}`}>
                              {typeInfo.icon}
                            </span>
                          </div>
                        );
                      })()}
                      <div>
                        <h3 className="font-heading text-xl uppercase">{entityDetails.name}</h3>
                        <Badge
                          variant={
                            entityDetails.confidence > 0.7
                              ? "success"
                              : entityDetails.confidence > 0.4
                              ? "warning"
                              : "outline"
                          }
                        >
                          {entityDetails.type}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-mint border-2 border-black">
                      <div className="text-2xl font-heading">{entityDetails.mentionCount}</div>
                      <div className="text-xs text-muted-foreground uppercase">Mentions</div>
                    </div>
                    <div className="p-3 bg-surface-blue border-2 border-black">
                      <div className="text-2xl font-heading">{entityDetails.documentCount}</div>
                      <div className="text-xs text-muted-foreground uppercase">Documents</div>
                    </div>
                  </div>

                  {/* Aliases */}
                  {entityDetails.aliases.length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm uppercase mb-2">Also Known As</h4>
                      <div className="flex flex-wrap gap-1">
                        {entityDetails.aliases.map((alias, i) => (
                          <Badge key={i} variant="outline">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Relationships */}
                  {entityDetails.relationships.length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm uppercase mb-2">Relationships</h4>
                      <div className="space-y-2">
                        {entityDetails.relationships.slice(0, 5).map((rel) => {
                          const relTypeInfo =
                            getEntityTypeInfo(rel.relatedEntity.type);
                          return (
                            <button
                              key={rel.id}
                              onClick={() => setSelectedEntityId(rel.relatedEntity.id)}
                              className="w-full flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50 text-left"
                            >
                              <div
                                className={`w-6 h-6 flex items-center justify-center ${relTypeInfo.bg} border border-black`}
                              >
                                <span className={`text-xs font-bold ${relTypeInfo.color}`}>
                                  {relTypeInfo.icon}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {rel.relatedEntity.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {rel.direction === "outgoing" ? "→" : "←"}{" "}
                                  {rel.type.replace(/_/g, " ")}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recent Mentions */}
                  {entityDetails.mentions.length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm uppercase mb-2">Recent Mentions</h4>
                      <div className="space-y-2">
                        {entityDetails.mentions.map((mention) => (
                          <div
                            key={mention.id}
                            className="p-2 border border-gray-200 rounded text-sm"
                          >
                            <div className="text-xs text-muted-foreground mb-1">
                              {mention.chunk.document.filename}
                              {mention.chunk.pageNumber && ` (p.${mention.chunk.pageNumber})`}
                            </div>
                            <p className="line-clamp-2">
                              <span className="text-muted-foreground">
                                {mention.contextBefore}
                              </span>
                              <span className="font-bold bg-yellow-200 px-0.5">
                                {mention.mentionText}
                              </span>
                              <span className="text-muted-foreground">
                                {mention.contextAfter}
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedEntityId(null)}
                  >
                    Close Details
                  </Button>
                </div>
              )}
            </Card>
          )}

          {!selectedEntityId && entities.length > 0 && (
            <Card variant="mint" className="p-6 text-center">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              <p className="text-muted-foreground">
                Select an entity to view its details, relationships, and mentions
              </p>
            </Card>
          )}
        </div>
      </div>
        </>
      )}

      {/* Top Entities */}
      {!statsLoading && stats && stats.topEntities.length > 0 && (
        <Card className="p-4">
          <h3 className="font-heading text-lg uppercase mb-4">Top Entities by Mentions</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topEntities.map((entity) => {
              const typeInfo = getEntityTypeInfo(entity.type);
              return (
                <button
                  key={entity.id}
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={`px-3 py-2 border-2 border-black ${typeInfo.bg} shadow-neo-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all`}
                >
                  <span className={`font-bold ${typeInfo.color}`}>{entity.name}</span>
                  <span className="ml-2 text-muted-foreground text-sm">
                    ({entity.mentionCount})
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
