/**
 * Knowledge Graph Visualization Component
 *
 * Interactive force-directed graph showing entities and relationships
 * using react-force-graph-2d
 */

import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";
import { Button, Card } from "@documind/ui";

// Entity type colors matching the entities page
const ENTITY_COLORS: Record<string, string> = {
  PERSON: "#3B82F6",       // blue-500
  ORGANIZATION: "#8B5CF6", // purple-500
  LOCATION: "#22C55E",     // green-500
  DATE: "#F97316",         // orange-500
  CONCEPT: "#EC4899",      // pink-500
  PRODUCT: "#06B6D4",      // cyan-500
  EVENT: "#EAB308",        // yellow-500
  TOPIC: "#6366F1",        // indigo-500
  MONEY: "#10B981",        // emerald-500
  TECHNOLOGY: "#8B5CF6",   // violet-500
  OTHER: "#6B7280",        // gray-500
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  WORKS_FOR: "#3B82F6",
  BELONGS_TO: "#8B5CF6",
  LOCATED_IN: "#22C55E",
  PART_OF: "#F97316",
  RELATED_TO: "#6B7280",
  CREATED_BY: "#EC4899",
  MENTIONED_WITH: "#06B6D4",
  OCCURRED_ON: "#EAB308",
  INVOLVES: "#6366F1",
  FUNDED_BY: "#10B981",
};

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  mentionCount: number;
  confidence: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  confidence: number;
}

export interface KnowledgeGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  selectedNodeId?: string | null;
  width?: number;
  height?: number;
  className?: string;
}

export function KnowledgeGraph({
  nodes,
  links,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  width = 800,
  height = 600,
  className = "",
}: KnowledgeGraphProps) {
  const graphRef = useRef<ForceGraphMethods>();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({
          width: offsetWidth || width,
          height: offsetHeight || height,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [width, height]);

  // Transform data for force-graph
  const graphData = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Filter links to only include those where both nodes exist
    const validLinks = links.filter(
      (link) => nodeMap.has(link.source) && nodeMap.has(link.target)
    );

    return {
      nodes: nodes.map((node) => ({
        ...node,
        val: Math.max(3, Math.log(node.mentionCount + 1) * 2), // Node size based on mentions
      })),
      links: validLinks,
    };
  }, [nodes, links]);

  // Node color based on type
  const getNodeColor = useCallback((node: NodeObject): string => {
    const graphNode = node as unknown as GraphNode;
    const baseColor = ENTITY_COLORS[graphNode.type] ?? ENTITY_COLORS.OTHER ?? "#6B7280";

    // Highlight selected or hovered
    if (selectedNodeId === graphNode.id || hoveredNode === graphNode.id) {
      return "#000000";
    }

    return baseColor;
  }, [selectedNodeId, hoveredNode]);

  // Link color based on relationship type
  const getLinkColor = useCallback((link: LinkObject) => {
    const graphLink = link as unknown as GraphLink;
    return RELATIONSHIP_COLORS[graphLink.type] || "#9CA3AF";
  }, []);

  // Node click handler
  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const graphNode = node as unknown as GraphNode;
      onNodeClick?.(graphNode);

      // Center the graph on the clicked node
      if (graphRef.current && node.x !== undefined && node.y !== undefined) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(2, 1000);
      }
    },
    [onNodeClick]
  );

  // Node hover handler
  const handleNodeHover = useCallback(
    (node: NodeObject | null) => {
      setHoveredNode(node ? (node as unknown as GraphNode).id : null);
      onNodeHover?.(node ? (node as unknown as GraphNode) : null);
    },
    [onNodeHover]
  );

  // Custom node rendering
  const nodeCanvasObject = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as unknown as GraphNode & { x: number; y: number; val: number };
      const label = graphNode.name;
      const fontSize = Math.max(10 / globalScale, 3);
      const nodeSize = graphNode.val || 4;

      // Determine if this node is highlighted
      const isSelected = selectedNodeId === graphNode.id;
      const isHovered = hoveredNode === graphNode.id;
      const isHighlighted = isSelected || isHovered;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(graphNode.x, graphNode.y, nodeSize, 0, 2 * Math.PI);
      ctx.fillStyle = getNodeColor(node);
      ctx.fill();

      // Draw border for selected/hovered
      if (isHighlighted) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // Draw label
      ctx.font = `${isHighlighted ? "bold " : ""}${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isHighlighted ? "#000000" : "#374151";
      ctx.fillText(label, graphNode.x, graphNode.y + nodeSize + 2);

      // Draw type badge
      const badgeText = graphNode.type.charAt(0);
      ctx.font = `bold ${fontSize * 0.7}px Inter, sans-serif`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, graphNode.x, graphNode.y);
    },
    [selectedNodeId, hoveredNode, getNodeColor]
  );

  // Reset view
  const handleResetView = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(500, 50);
    }
  }, []);

  if (nodes.length === 0) {
    return (
      <Card variant="lavender" className={`p-8 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-white shadow-neo">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="6" cy="6" r="2.5" />
            <circle cx="18" cy="6" r="2.5" />
            <circle cx="6" cy="18" r="2.5" />
            <circle cx="18" cy="18" r="2.5" />
            <circle cx="12" cy="12" r="3" />
            <path d="M8.5 7.5l2 3M15.5 7.5l-2 3M8.5 16.5l2-3M15.5 16.5l-2-3" />
          </svg>
        </div>
        <h3 className="font-heading text-xl uppercase mb-2">No Graph Data</h3>
        <p className="text-muted-foreground">
          Upload and index documents to see the Knowledge Graph visualization
        </p>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleResetView}>
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset View
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 border-2 border-black p-3 shadow-neo-sm">
        <div className="text-xs font-bold uppercase mb-2">Entity Types</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(ENTITY_COLORS).slice(0, 6).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full border border-black"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs">{type.charAt(0) + type.slice(1).toLowerCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 border-2 border-black px-3 py-2 shadow-neo-sm">
        <div className="text-xs">
          <span className="font-bold">{nodes.length}</span> entities ·{" "}
          <span className="font-bold">{links.length}</span> relationships
        </div>
      </div>

      {/* Graph */}
      <div className="border-2 border-black bg-white">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node, color, ctx) => {
            const graphNode = node as unknown as GraphNode & { x: number; y: number; val: number };
            ctx.beginPath();
            ctx.arc(graphNode.x, graphNode.y, (graphNode.val || 4) + 5, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={getLinkColor}
          linkWidth={1.5}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          cooldownTicks={100}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      </div>
    </div>
  );
}
