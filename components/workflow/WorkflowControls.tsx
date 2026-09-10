"use client";

import * as React from "react";
import type { Workflow } from "@/types/workflow";
import { WORKFLOW_TEMPLATES } from "@/lib/workflow-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from "lucide-react";

export interface WorkflowControlsProps {
  onAddNode: () => void;
  onRunWorkflow: () => void;
  running: boolean;
  onValidate: () => { ok: boolean; errors: string[] };
  currentGraph: { nodes: any[]; edges: any[] };
  onExportJson: () => string;
  onImportJson: (raw: string) => { ok: boolean; error?: string };
  onReset: () => void;
  savedWorkflows: { name: string; savedAt: number; data: Workflow }[];
  onSaveWorkflow: (name: string) => void;
  onLoadWorkflow: (name: string) => void;
  onDeleteWorkflow: (name: string) => void;
  onDeleteSelected: () => void;
  onLoadTemplate: (workflow: Workflow, templateName: string) => void;
  selectionExists: boolean;
}

export function WorkflowControls(props: WorkflowControlsProps) {
  const {
    onAddNode,
    onRunWorkflow,
    running,
    onValidate,
    currentGraph,
    onExportJson,
    onImportJson,
    onReset,
    savedWorkflows,
    onSaveWorkflow,
    onLoadWorkflow,
    onDeleteWorkflow,
    onDeleteSelected,
    onLoadTemplate,
    selectionExists,
  } = props;

  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [nameExistsWarning, setNameExistsWarning] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const validation = React.useMemo(() => {
    return onValidate();
    // Re-run when the graph structure actually changes; onValidate is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onValidate, currentGraph.nodes.length, currentGraph.edges.length]);

  const sortedWorkflows = React.useMemo(() => {
    return [...savedWorkflows].sort((a, b) => b.savedAt - a.savedAt);
  }, [savedWorkflows]);

  const handleRunClick = () => {
    if (running || currentGraph.nodes.length === 0) return;
    onRunWorkflow();
  };

  const handleOpenSaveDialog = () => {
    setSaveName("");
    setNameExistsWarning(false);
    setSaveDialogOpen(true);
  };

  const handleSaveNameChange = (value: string) => {
    setSaveName(value);
    const exists = savedWorkflows.some((w) => w.name === value);
    setNameExistsWarning(exists);
  };

  const handleSaveConfirm = () => {
    if (!saveName.trim()) return;
    onSaveWorkflow(saveName.trim());
    setSaveDialogOpen(false);
  };

  const handleLoad = (name: string) => {
    onLoadWorkflow(name);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    onDeleteWorkflow(deleteTarget);
    setDeleteTarget(null);
  };

  const handleExportJson = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const filename = `workflow-${yyyy}${MM}${dd}-${HH}${mm}${ss}.json`;
    const content = onExportJson();
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Exported",
      description: `Downloaded ${filename}`,
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const raw = event.target?.result as string;
      const result = onImportJson(raw);
      if (result.ok) {
        toast({
          title: "Import Successful",
          description: "Workflow imported and ready to run.",
        });
      } else {
        toast({
          title: "Import Failed",
          description: result.error ?? "Invalid workflow JSON file.",
          variant: "destructive",
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "Import Failed",
        description: "Failed to read file.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasNodes = currentGraph.nodes.length > 0;

  return (
    <div className="flex flex-col gap-4 p-4 w-full h-full overflow-y-auto">
      {/* Primary Actions Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>Execution & Actions</span>
            <span className="text-xs font-normal text-slate-500">
              {currentGraph.nodes.length} nodes
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            variant="default"
            size="default"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
            onClick={handleRunClick}
            disabled={running || !hasNodes || !validation.ok}
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Executing Inngest Workflow…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4 fill-white" />
                Run AI Workflow
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onAddNode}
            className="justify-start gap-2 h-9 text-xs"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Add Decision Node
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            onClick={onDeleteSelected}
            disabled={!selectionExists}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected Node
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!hasNodes}
            className="justify-start gap-2 h-9 text-xs text-slate-600 dark:text-slate-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Canvas
          </Button>
        </CardContent>
      </Card>

      {/* Preset Workflow Templates Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-2.5">
          <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>Workflow Templates</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {WORKFLOW_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.name}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {tmpl.name}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  onClick={() => onLoadTemplate(tmpl.data, tmpl.name)}
                >
                  Load Template
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {tmpl.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Graph Validation Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-2.5">
          <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>Validation</span>
            {validation.ok ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Valid
              </span>
            ) : (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {validation.errors.length} Issue(s)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {validation.ok ? (
            <Alert className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-xs font-semibold">Graph is ready</AlertTitle>
              <AlertDescription className="text-[11px] text-emerald-700/90 dark:text-emerald-400">
                All nodes and connections are structurally valid.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" className="py-2.5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">Issues Detected</AlertTitle>
              <AlertDescription className="text-[11px] mt-1 space-y-1">
                {validation.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{err}</span>
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Saved Workflows Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-2.5">
          <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-amber-500" />
              Saved Workflows
            </span>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleOpenSaveDialog}>
                  Save As…
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Workflow</DialogTitle>
                  <DialogDescription>
                    Save the current node positions, prompts, and connections locally.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-2">
                  <Input
                    placeholder="e.g. Support Triage v2"
                    value={saveName}
                    onChange={(e) => handleSaveNameChange(e.target.value)}
                  />
                  {nameExistsWarning && (
                    <Alert variant="destructive">
                      <AlertTitle className="text-xs">Overwrite Warning</AlertTitle>
                      <AlertDescription className="text-xs">
                        A saved workflow named "{saveName}" already exists. Saving will overwrite it.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConfirm} disabled={!saveName.trim()}>
                    Save Workflow
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {sortedWorkflows.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">
                No custom saved workflows yet.
              </p>
            ) : (
              sortedWorkflows.map((w) => (
                <div
                  key={w.name}
                  className="flex items-center justify-between p-2 border rounded-md gap-2 bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                      {w.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {w.data.nodes.length} nodes • {new Date(w.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2"
                      onClick={() => handleLoad(w.name)}
                    >
                      Load
                    </Button>
                    <AlertDialog
                      open={deleteTarget === w.name}
                      onOpenChange={(open) => {
                        if (!open) setDeleteTarget(null);
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteTarget(w.name)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{w.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-rose-600 text-white hover:bg-rose-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export / Import Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-2.5">
          <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            JSON Export / Import
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 h-8 text-xs"
            onClick={handleExportJson}
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 h-8 text-xs"
            onClick={handleImportClick}
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON
          </Button>
          <input
            ref={fileInputRef}
            id="import-json-input"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default WorkflowControls;

