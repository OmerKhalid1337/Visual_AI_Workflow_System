"use client";

import * as React from "react";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
} from "@/types/workflow";
import {
  genId,
  validateWorkflow,
  parseWorkflow,
  DEFAULT_INITIAL_WORKFLOW,
} from "@/lib/workflow-helpers";

const STORAGE_KEY = "visual-ai-workflow:current";
const AUTOSAVE_DELAY = 400;

export function useWorkflow() {
  const [nodes, setNodes] = React.useState<WorkflowNode[]>(
    DEFAULT_INITIAL_WORKFLOW.nodes
  );
  const [edges, setEdges] = React.useState<WorkflowEdge[]>(
    DEFAULT_INITIAL_WORKFLOW.edges
  );

  const didLoadRef = React.useRef(false);

  React.useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // First time load: save default initial workflow
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(DEFAULT_INITIAL_WORKFLOW)
        );
        return;
      }

      const parsed = parseWorkflow(JSON.parse(raw));
      if (parsed.ok) {
        setNodes(parsed.data.nodes);
        setEdges(parsed.data.edges);
      }
    } catch {
    }
  }, []);

  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const autosave = React.useCallback((workflow: Workflow) => {
    if (typeof window === "undefined") return;

    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow));
      } catch {
      }
    }, AUTOSAVE_DELAY);
  }, []);

  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const commit = React.useCallback((nextNodes: WorkflowNode[], nextEdges: WorkflowEdge[]) => {
    setNodes(nextNodes);
    setEdges(nextEdges);
    autosave({ nodes: nextNodes, edges: nextEdges });
  }, [autosave]);

  const addNode = React.useCallback((partial?: Partial<WorkflowNode>): WorkflowNode => {
    const newNode: WorkflowNode = {
      id: genId("n"),
      type: "decision",
      name: partial?.name ?? "Decision Node",
      prompt: partial?.prompt ?? "Is this statement true?",
      position: partial?.position ?? { x: 0, y: 0 },
    };

    setNodes((prev) => {
      let nextNodes: WorkflowNode[];
      if (partial?.position) {
        nextNodes = [...prev, newNode];
      } else {
        let position: { x: number; y: number };
        if (prev.length === 0) {
          position = { x: 100, y: 100 };
        } else {
          const last = prev[prev.length - 1];
          position = {
            x: last.position.x + 40,
            y: last.position.y + 40,
          };
        }
        const positionedNode: WorkflowNode = { ...newNode, position };
        nextNodes = [...prev, positionedNode];
        Object.assign(newNode, { position });
      }
      setEdges((prevEdges) => {
        autosave({ nodes: nextNodes, edges: prevEdges });
        return prevEdges;
      });
      return nextNodes;
    });

    return newNode;
  }, [autosave]);

  const updateNode = React.useCallback((id: string, patch: Partial<Omit<WorkflowNode, "id" | "type">>) => {
    setNodes((prev) => {
      const nextNodes = prev.map((n) =>
        n.id === id ? { ...n, ...patch } : n
      );
      setEdges((prevEdges) => {
        autosave({ nodes: nextNodes, edges: prevEdges });
        return prevEdges;
      });
      return nextNodes;
    });
  }, [autosave]);

  const deleteNodes = React.useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setNodes((prev) => {
      const nextNodes = prev.filter((n) => !idSet.has(n.id));
      setEdges((prevEdges) => {
        const nextEdges = prevEdges.filter(
          (e) => !idSet.has(e.source) && !idSet.has(e.target)
        );
        autosave({ nodes: nextNodes, edges: nextEdges });
        return nextEdges;
      });
      return nextNodes;
    });
  }, [autosave]);

  const addEdge = React.useCallback((params: { source: string; target: string; branch: "YES" | "NO" }) => {
    const { source, target, branch } = params;
    setEdges((prev) => {
      const filtered = prev.filter(
        (e) => !(e.source === source && e.branch === branch)
      );
      const newEdge: WorkflowEdge = {
        id: genId("e"),
        source,
        target,
        branch,
      };
      const nextEdges = [...filtered, newEdge];
      setNodes((prevNodes) => {
        autosave({ nodes: prevNodes, edges: nextEdges });
        return prevNodes;
      });
      return nextEdges;
    });
  }, [autosave]);

  const deleteEdge = React.useCallback((id: string) => {
    setEdges((prev) => {
      const nextEdges = prev.filter((e) => e.id !== id);
      setNodes((prevNodes) => {
        autosave({ nodes: prevNodes, edges: nextEdges });
        return prevNodes;
      });
      return nextEdges;
    });
  }, [autosave]);

  const setWorkflow = React.useCallback((next: Workflow) => {
    const result = validateWorkflow(next);
    if (!result.ok) {
      throw new Error(result.errors[0] ?? "Invalid workflow");
    }
    commit(next.nodes, next.edges);
  }, [commit]);

  const exportJson = React.useCallback((): string => {
    return JSON.stringify({ nodes, edges }, null, 2);
  }, [nodes, edges]);

  const importJson = React.useCallback((raw: string): { ok: boolean; error?: string } => {
    try {
      const parsed = parseWorkflow(JSON.parse(raw));
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }
      setWorkflow(parsed.data);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse JSON";
      return { ok: false, error: message };
    }
  }, [setWorkflow]);

  const reset = React.useCallback(() => {
    commit([], []);
  }, [commit]);

  const validate = React.useCallback((): { ok: boolean; errors: string[] } => {
    return validateWorkflow({ nodes, edges });
  }, [nodes, edges]);

  return {
    nodes,
    edges,
    actions: {
      addNode,
      updateNode,
      deleteNodes,
      addEdge,
      deleteEdge,
      setWorkflow,
      exportJson,
      importJson,
      reset,
      validate,
    },
  };
}
