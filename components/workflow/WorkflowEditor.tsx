"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  type Connection,
  type Node,
  type Edge,
  MarkerType,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import DecisionNodeComponent, {
  type DecisionNodeData,
} from "./DecisionNode";
import { Plus, Trash2, Maximize2 } from "lucide-react";

const nodeTypes: NodeTypes = {
  decision: DecisionNodeComponent,
};

export interface WorkflowEditorProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (connection: Connection) => void;
  onAddNode: () => void;
  selectedNodeId?: string | null;
  executedNodeIds?: Set<string>;
  runningNodeId?: string | null;
  failedNodeIds?: Set<string>;
  traveledEdgeIds?: Set<string>;
  onDeleteSelected?: () => void;
}

function asDecisionNodeData(data: unknown): DecisionNodeData {
  const d = data as DecisionNodeData | undefined;
  return {
    name: d?.name ?? "",
    prompt: d?.prompt ?? "",
    nodeState: d?.nodeState,
    isStartNode: d?.isStartNode,
    onNameChange: d?.onNameChange,
    onPromptChange: d?.onPromptChange,
    ...(d ?? {}),
  } as DecisionNodeData;
}

export function WorkflowEditorInner(props: WorkflowEditorProps) {
  const {
    nodes: nodesProp,
    edges: edgesProp,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onAddNode,
    selectedNodeId,
    executedNodeIds = new Set(),
    runningNodeId,
    failedNodeIds = new Set(),
    traveledEdgeIds = new Set(),
    onDeleteSelected,
  } = props;

  const targetNodeIds = useMemo(() => {
    return new Set(edgesProp.map((e) => e.target));
  }, [edgesProp]);

  const processedNodes: Node[] = useMemo(() => {
    return nodesProp.map((node) => {
      const baseData = asDecisionNodeData(node.data);
      let nodeState: DecisionNodeData["nodeState"] = baseData.nodeState;

      if (runningNodeId && node.id === runningNodeId) {
        nodeState = "running";
      } else if (failedNodeIds.has(node.id)) {
        nodeState = "failed";
      } else if (executedNodeIds.has(node.id)) {
        nodeState = "completed";
      }

      const isSelected =
        selectedNodeId !== undefined &&
        selectedNodeId !== null &&
        node.id === selectedNodeId;

      const isStartNode = !targetNodeIds.has(node.id);

      return {
        ...node,
        selected: isSelected || node.selected,
        data: {
          ...baseData,
          nodeState,
          isStartNode,
        },
      };
    });
  }, [
    nodesProp,
    targetNodeIds,
    runningNodeId,
    failedNodeIds,
    executedNodeIds,
    selectedNodeId,
  ]);

  const processedEdges: Edge[] = useMemo(() => {
    return edgesProp.map((edge) => {
      const branch: "YES" | "NO" | undefined =
        (edge.data?.branch as "YES" | "NO" | undefined) ??
        (edge.label === "YES"
          ? "YES"
          : edge.label === "NO"
            ? "NO"
            : undefined);

      const isTraveled = traveledEdgeIds.has(edge.id);

      const strokeColor = isTraveled
        ? branch === "YES"
          ? "#059669"
          : branch === "NO"
            ? "#e11d48"
            : "#2563eb"
        : branch === "YES"
          ? "#10b981"
          : branch === "NO"
            ? "#f43f5e"
            : "#64748b";

      return {
        ...edge,
        type: "smoothstep",
        animated: isTraveled,
        label: branch,
        labelStyle: {
          fill: branch === "YES" ? "#065f46" : "#9f1239",
          fontWeight: 700,
          fontSize: "11px",
        },
        labelBgStyle: {
          fill: branch === "YES" ? "#d1fae5" : "#ffe4e6",
          fillOpacity: 0.95,
          rx: 4,
          ry: 4,
        },
        labelBgPadding: [6, 3] as [number, number],
        style: {
          ...edge.style,
          stroke: strokeColor,
          strokeWidth: isTraveled ? 3.5 : 2,
          filter: isTraveled
            ? `drop-shadow(0 0 6px ${branch === "YES" ? "#34d399" : "#fb7185"})`
            : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 18,
          height: 18,
        },
      };
    });
  }, [edgesProp, traveledEdgeIds]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect(connection);
    },
    [onConnect]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        onDeleteSelected?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDeleteSelected]);

  return (
    <div className="w-full h-full relative bg-slate-50/60 dark:bg-slate-950">
      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Panel position="top-left" className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
          <Button size="sm" onClick={onAddNode} className="h-8 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add Decision Node
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDeleteSelected}
            disabled={!selectedNodeId}
            className="h-8 gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </Button>
        </Panel>

        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#94a3b8" className="opacity-40" />
        <Controls className="bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm rounded-lg overflow-hidden" />
        <MiniMap
          pannable
          zoomable
          className="border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
          nodeColor={(node) => {
            const data = asDecisionNodeData(node.data);
            switch (data.nodeState) {
              case "running":
                return "#f59e0b";
              case "completed":
                return "#10b981";
              case "failed":
                return "#ef4444";
              default:
                return data.isStartNode ? "#3b82f6" : "#64748b";
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

export default WorkflowEditor;

