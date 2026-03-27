"use client";

import { useMemo, useCallback, useEffect } from "react";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";

import { nodeTypes } from "./CustomGraphNode";
import GraphLegend from "./GraphLegend";
import { EDGE_TYPE_CONFIG } from "./constants";
import type {
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  PatientPosition,
  PredictionPath,
  TrajectoryAnomaly,
} from "@/types/knowledgeGraph";

interface GraphViewerProps {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  patientPosition?: PatientPosition;
  predictions?: PredictionPath[];
  anomalies?: TrajectoryAnomaly[];
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

function getLayoutedElements(
  nodes: KnowledgeGraphNode[],
  edges: KnowledgeGraphEdge[],
  predictions?: PredictionPath[]
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  if (predictions) {
    predictions.forEach((pred) => {
      if (pred.target_node?.id && !g.hasNode(pred.target_node.id)) {
        g.setNode(pred.target_node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
      }
    });
  }

  dagre.layout(g);

  const rfNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      id: node.id,
      type: "custom" as const,
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: {
        label: node.label,
        nodeType: node.type,
        isPatientPosition: node.isPatientPosition,
        isAnomaly: node.isAnomaly,
      },
    };
  });

  const rfEdges = edges.map((edge) => {
    const edgeConfig = EDGE_TYPE_CONFIG[edge.type];
    const color = edgeConfig?.color || "#9CA3AF";
    const opacity = Math.max(0.4, edge.weight);
    const isProgresses = edge.type === "progresses_to";

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edgeConfig?.label || edge.type,
      type: "smoothstep" as const,
      animated: isProgresses,
      style: {
        stroke: color,
        strokeWidth: isProgresses ? 3 : 2.5,
        opacity,
        ...(edge.isPredicted ? { strokeDasharray: "8 4" } : {}),
      },
      labelStyle: {
        fontSize: 11,
        fill: color,
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: `${color}15`,
        fillOpacity: 1,
        rx: 6,
        ry: 6,
      },
      labelBgPadding: [6, 4] as [number, number],
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
    };
  });

  // Prediction edges
  if (predictions) {
    predictions.forEach((pred, i) => {
      if (!pred.target_node?.id) return;
      const currentNodes = nodes.filter((n) => n.isPatientPosition);
      const sourceId = currentNodes[0]?.id;
      if (!sourceId) return;

      rfEdges.push({
        id: `pred-${i}`,
        source: sourceId,
        target: pred.target_node.id,
        label: `${Math.round(pred.probability * 100)}%`,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: "#f59e0b",
          strokeWidth: 2.5,
          opacity: 0.7,
          strokeDasharray: "8 4",
        },
        labelStyle: { fontSize: 11, fill: "#f59e0b", fontWeight: 500 },
        labelBgStyle: { fill: "#f59e0b15", fillOpacity: 1, rx: 6, ry: 6 },
        labelBgPadding: [6, 4] as [number, number],
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b", width: 16, height: 16 },
      });
    });
  }

  return { nodes: rfNodes, edges: rfEdges };
}

function GraphViewerInner({
  nodes: kgNodes,
  edges: kgEdges,
  predictions,
  onNodeClick,
  className = "",
}: GraphViewerProps) {
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(kgNodes, kgEdges, predictions),
    [kgNodes, kgEdges, predictions]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  useEffect(() => {
    setEdges(layoutedEdges);
  }, [layoutedEdges, setEdges]);

  const handleNodeClick = useCallback(
    (_: any, node: any) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  return (
    <div className={`w-full h-full relative bg-[#FCFAF7] ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
      </ReactFlow>
      <GraphLegend />
    </div>
  );
}

export default function GraphViewer(props: GraphViewerProps) {
  return (
    <ReactFlowProvider>
      <GraphViewerInner {...props} />
    </ReactFlowProvider>
  );
}
