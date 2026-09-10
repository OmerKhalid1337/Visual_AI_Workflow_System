"use client";

import * as React from "react";
import { useWorkflow } from "@/hooks/useWorkflow";
import {
  WorkflowEditor,
  type WorkflowEditorProps,
} from "@/components/workflow/WorkflowEditor";
import { WorkflowControls } from "@/components/workflow/WorkflowControls";
import { ExecutionPanel } from "@/components/workflow/ExecutionPanel";
import {
  type Edge,
  type Node,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
} from "@xyflow/react";
import type {
  DecisionNodeData,
} from "@/components/workflow/DecisionNode";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ExecutionResult,
} from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";
import { findStartNodes, DEFAULT_INITIAL_WORKFLOW } from "@/lib/workflow-helpers";
import { WorkflowFlowchartIcon } from "@/components/workflow/Icons";
import { Play, Sparkles, Activity, ShieldCheck } from "lucide-react";

const SAVED_KEY = "visual-ai-workflow:saves";
const HISTORY_KEY = "visual-ai-workflow:history";

type SavedWorkflowEntry = {
  name: string;
  savedAt: number;
  data: Workflow;
};

function loadSavedWorkflows(): SavedWorkflowEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedWorkflowEntry[];
  } catch {
    return [];
  }
}

function persistSavedWorkflows(list: SavedWorkflowEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
  }
}

function loadHistory(): ExecutionResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ExecutionResult[];
  } catch {
    return [];
  }
}

function persistHistory(list: ExecutionResult[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = list.slice(0, 50);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
  }
}

function workNodeToFlowNode(
  node: WorkflowNode,
  handlers: {
    onNameChange: (id: string, val: string) => void;
    onPromptChange: (id: string, val: string) => void;
  }
): Node<DecisionNodeData> {
  return {
    id: node.id,
    type: "decision",
    position: node.position,
    data: {
      name: node.name,
      prompt: node.prompt,
      onNameChange: handlers.onNameChange,
      onPromptChange: handlers.onPromptChange,
    },
  };
}

function workEdgeToFlowEdge(edge: WorkflowEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.branch === "YES" ? "yes" : "no",
    targetHandle: "in",
    label: edge.branch,
    data: { branch: edge.branch },
  };
}

export default function HomePage() {
  const { nodes, edges, actions } = useWorkflow();
  const { toast } = useToast();

  const [selectionId, setSelectionId] = React.useState<string | null>(null);
  const [currentRun, setCurrentRun] = React.useState<ExecutionResult | null>(null);
  const [viewingRun, setViewingRun] = React.useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [pollRunId, setPollRunId] = React.useState<string | null>(null);

  const [savedWorkflows, setSavedWorkflows] = React.useState<SavedWorkflowEntry[]>(
    () => loadSavedWorkflows()
  );
  const [executionHistory, setExecutionHistory] = React.useState<ExecutionResult[]>(
    () => loadHistory()
  );

  const onNameChange = React.useCallback(
    (id: string, val: string) => actions.updateNode(id, { name: val }),
    [actions]
  );
  const onPromptChange = React.useCallback(
    (id: string, val: string) => actions.updateNode(id, { prompt: val }),
    [actions]
  );

  React.useEffect(() => {
    persistSavedWorkflows(savedWorkflows);
  }, [savedWorkflows]);

  React.useEffect(() => {
    persistHistory(executionHistory);
  }, [executionHistory]);

  const flowNodes: Node[] = React.useMemo(() => {
    return nodes.map((n) =>
      workNodeToFlowNode(n, { onNameChange, onPromptChange })
    );
  }, [nodes, onNameChange, onPromptChange]);

  const flowEdges: Edge[] = React.useMemo(
    () => edges.map((e) => workEdgeToFlowEdge(e)),
    [edges]
  );

  const handleNodesChange: OnNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      const positionChanges: NodeChange[] = [];
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          positionChanges.push(change);
        }
        if (change.type === "select") {
          setSelectionId(change.selected ? change.id : (prev) => (prev === change.id ? null : prev));
        }
      }
      if (positionChanges.length > 0) {
        const updatedNodes = applyNodeChanges(positionChanges, flowNodes);
        for (const n of updatedNodes) {
          actions.updateNode(n.id, { position: n.position });
        }
      }
    },
    [actions, flowNodes]
  );

  const handleEdgesChange: OnEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      const removes: string[] = [];
      for (const change of changes) {
        if (change.type === "remove") {
          removes.push(change.id);
        }
      }
      for (const id of removes) {
        actions.deleteEdge(id);
      }
    },
    [actions]
  );

  const handleConnect = React.useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (!connection.sourceHandle) return;
      const branch: "YES" | "NO" =
        connection.sourceHandle === "yes"
          ? "YES"
          : connection.sourceHandle === "no"
            ? "NO"
            : (() => {
                toast({
                  title: "Invalid connection",
                  description: "Connect from YES or NO handle only.",
                  variant: "destructive",
                });
                return null as never;
              })();

      if (connection.source === connection.target) {
        toast({
          title: "Invalid connection",
          description: "A node cannot connect to itself.",
          variant: "destructive",
        });
        return;
      }

      actions.addEdge({
        source: connection.source,
        target: connection.target,
        branch,
      });
    },
    [actions, toast]
  );

  const handleAddNode = React.useCallback(() => {
    actions.addNode();
  }, [actions]);

  const handleDeleteSelected = React.useCallback(() => {
    if (selectionId) {
      actions.deleteNodes([selectionId]);
      setSelectionId(null);
    }
  }, [actions, selectionId]);

  const handleReset = React.useCallback(() => {
    actions.reset();
    setSelectionId(null);
    toast({ title: "Canvas Cleared", description: "All nodes and connections removed." });
  }, [actions, toast]);

  const handleLoadTemplate = React.useCallback(
    (templateData: Workflow, templateName: string) => {
      actions.setWorkflow(templateData);
      setSelectionId(null);
      setViewingRun(null);
      toast({
        title: "Template Loaded",
        description: `Loaded "${templateName}" workflow.`,
      });
    },
    [actions, toast]
  );

  const handleRun = React.useCallback(async () => {
    const graph: Workflow = { nodes, edges };
    const validation = actions.validate();
    if (!validation.ok) {
      toast({
        title: "Invalid Workflow",
        description: validation.errors[0] || "Please resolve validation issues.",
        variant: "destructive",
      });
      return;
    }
    if (graph.nodes.length === 0) {
      toast({
        title: "Nothing to run",
        description: "Add at least one node before running.",
        variant: "destructive",
      });
      return;
    }
    const starts = findStartNodes(graph);
    if (starts.length === 0) {
      toast({
        title: "No Start Node",
        description: "At least one node must have no incoming edges.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setCurrentRun(null);
    setViewingRun(null);

    try {
      const resp = await fetch("/api/workflow/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed with status ${resp.status}`);
      }
      const data = (await resp.json()) as { runId: string; status: string };
      setPollRunId(data.runId);
      setCurrentRun({
        runId: data.runId,
        status: "running",
        steps: [],
        startedAt: Date.now(),
      });
      toast({
        title: "Workflow Started",
        description: `Triggered execution ${data.runId}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Run Failed to Start",
        description: message,
        variant: "destructive",
      });
      setIsRunning(false);
    }
  }, [nodes, edges, actions, toast]);

  React.useEffect(() => {
    if (!pollRunId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const resp = await fetch(`/api/workflow/runs/${pollRunId}`);
        if (resp.status === 404) {
          timer = setTimeout(poll, 600);
          return;
        }
        if (!resp.ok) throw new Error(`Request failed (${resp.status})`);
        const result = (await resp.json()) as ExecutionResult;
        if (!cancelled) {
          setCurrentRun(result);
          setViewingRun(null);
        }
        if (result.status === "completed" || result.status === "failed") {
          if (!cancelled) {
            setExecutionHistory((prev) => {
              const exists = prev.some((r) => r.runId === result.runId);
              if (exists) {
                return prev.map((r) =>
                  r.runId === result.runId ? result : r
                );
              }
              return [result, ...prev];
            });
            setIsRunning(false);
            setPollRunId(null);
            if (result.status === "completed") {
              toast({
                title: "Workflow Completed",
                description: `Successfully executed ${result.steps.length} decision step(s).`,
              });
            } else {
              toast({
                title: "Workflow Failed",
                description: result.error || "An error occurred during execution.",
                variant: "destructive",
              });
            }
          }
          return;
        }
        timer = setTimeout(poll, 600);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Polling error",
            description:
              err instanceof Error ? err.message : "Unexpected polling error",
            variant: "destructive",
          });
          setIsRunning(false);
          setPollRunId(null);
        }
      }
    }

    timer = setTimeout(poll, 300);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollRunId, toast]);

  const displayRun = viewingRun ?? currentRun;

  const executedNodeIds = React.useMemo(() => {
    const s = new Set<string>();
    if (displayRun) {
      for (const step of displayRun.steps) {
        if (step.status === "completed") s.add(step.nodeId);
      }
    }
    return s;
  }, [displayRun]);

  const failedNodeIds = React.useMemo(() => {
    const s = new Set<string>();
    if (displayRun) {
      for (const step of displayRun.steps) {
        if (step.status === "failed") s.add(step.nodeId);
      }
    }
    return s;
  }, [displayRun]);

  const runningNodeId = React.useMemo(() => {
    if (!displayRun) return null;
    for (const step of displayRun.steps) {
      if (step.status === "running") return step.nodeId;
    }
    return null;
  }, [displayRun]);

  const traveledEdgeIds = React.useMemo(() => {
    const s = new Set<string>();
    if (!displayRun) return s;
    for (let i = 0; i < displayRun.steps.length; i++) {
      const step = displayRun.steps[i];
      if (step.status !== "completed" || !step.selectedBranch) continue;
      const nextStep = displayRun.steps[i + 1];
      if (!nextStep) continue;
      const matchingEdge = edges.find(
        (e) =>
          e.source === step.nodeId &&
          e.target === nextStep.nodeId &&
          e.branch === step.selectedBranch
      );
      if (matchingEdge) s.add(matchingEdge.id);
    }
    return s;
  }, [displayRun, edges]);

  const handleSaveWorkflow = React.useCallback(
    (name: string) => {
      const data: Workflow = { nodes, edges };
      const validation = actions.validate();
      if (!validation.ok) {
        toast({
          title: "Cannot save invalid workflow",
          description: validation.errors[0] || "Invalid workflow structure.",
          variant: "destructive",
        });
        return;
      }
      setSavedWorkflows((prev) => {
        const others = prev.filter((w) => w.name !== name);
        const entry: SavedWorkflowEntry = {
          name,
          savedAt: Date.now(),
          data,
        };
        return [entry, ...others];
      });
      toast({
        title: "Workflow Saved",
        description: `Saved "${name}" successfully.`,
      });
    },
    [nodes, edges, actions, toast]
  );

  const handleLoadWorkflow = React.useCallback(
    (name: string) => {
      const match = savedWorkflows.find((w) => w.name === name);
      if (!match) return;
      try {
        actions.setWorkflow(match.data);
        setSelectionId(null);
        setViewingRun(null);
        toast({
          title: "Workflow Loaded",
          description: `Loaded "${name}".`,
        });
      } catch (err) {
        toast({
          title: "Load Failed",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
    },
    [savedWorkflows, actions, toast]
  );

  const handleDeleteWorkflow = React.useCallback(
    (name: string) => {
      setSavedWorkflows((prev) => prev.filter((w) => w.name !== name));
      toast({
        title: "Workflow Deleted",
        description: `Removed "${name}".`,
      });
    },
    [toast]
  );

  const handleExportJson = React.useCallback(
    () => actions.exportJson(),
    [actions]
  );

  const handleImportJson = React.useCallback(
    (raw: string) => actions.importJson(raw),
    [actions]
  );

  const handleSelectHistoryRun = React.useCallback((runId: string) => {
    const match = executionHistory.find((r) => r.runId === runId);
    if (match) {
      setViewingRun(match);
      toast({
        title: "Viewing History Run",
        description: `Visualizing execution path for ${runId}`,
      });
    }
  }, [executionHistory, toast]);

  const handleBackToLive = React.useCallback(() => {
    setViewingRun(null);
  }, []);

  const editorProps: Omit<WorkflowEditorProps, "nodes" | "edges"> = {
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect: handleConnect,
    onAddNode: handleAddNode,
    onDeleteSelected: handleDeleteSelected,
    selectedNodeId: selectionId,
    executedNodeIds,
    runningNodeId,
    failedNodeIds,
    traveledEdgeIds,
  };

  return (
    <main className="flex h-screen w-full flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Top Application Bar */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-5 py-2.5 backdrop-blur z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <WorkflowFlowchartIcon />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Visual AI Workflow System
              </h1>
              <span className="rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                Inngest • OpenAI • React Flow
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Interactive AI Decision Workflow Engine with Dynamic Branching
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={isRunning || nodes.length === 0}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Executing Flow…
              </span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                Run Workflow
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar: Controls & Presets */}
        <aside className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto z-10 shadow-sm">
          <WorkflowControls
            onAddNode={handleAddNode}
            onRunWorkflow={handleRun}
            running={isRunning}
            onValidate={actions.validate}
            currentGraph={{ nodes, edges }}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onReset={handleReset}
            savedWorkflows={savedWorkflows}
            onSaveWorkflow={handleSaveWorkflow}
            onLoadWorkflow={handleLoadWorkflow}
            onDeleteWorkflow={handleDeleteWorkflow}
            onDeleteSelected={handleDeleteSelected}
            onLoadTemplate={handleLoadTemplate}
            selectionExists={Boolean(selectionId)}
          />
        </aside>

        {/* Center: React Flow Canvas */}
        <section className="flex-1 min-w-0 min-h-0 relative">
          <WorkflowEditor
            nodes={flowNodes}
            edges={flowEdges}
            {...editorProps}
          />
        </section>

        {/* Right Sidebar: Execution Panel & History */}
        <aside className="w-96 shrink-0 z-10 shadow-sm">
          <ExecutionPanel
            currentRun={displayRun}
            executionHistory={executionHistory}
            onSelectHistoryRun={handleSelectHistoryRun}
            onRetryRun={handleRun}
            isViewingHistory={Boolean(viewingRun)}
            onBackToLive={handleBackToLive}
          />
        </aside>
      </div>
    </main>
  );
}

