"use client";

import React from "react";
import { ExecutionResult, ExecutionStep } from "@/types/workflow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  History,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExecutionPanelProps {
  currentRun: ExecutionResult | null;
  executionHistory: ExecutionResult[];
  onSelectHistoryRun: (runId: string) => void;
  onRetryRun?: () => void;
  isViewingHistory?: boolean;
  onBackToLive?: () => void;
}

export function ExecutionPanel({
  currentRun,
  executionHistory,
  onSelectHistoryRun,
  onRetryRun,
  isViewingHistory = false,
  onBackToLive,
}: ExecutionPanelProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const sortedSteps = currentRun
    ? [...currentRun.steps].sort((a, b) => a.order - b.order)
    : [];

  const sortedHistory = [...executionHistory].sort(
    (a, b) => b.startedAt - a.startedAt
  );

  const handleCopyRunId = () => {
    if (!currentRun?.runId) return;
    navigator.clipboard.writeText(currentRun.runId);
    setCopied(true);
    toast({
      title: "Copied",
      description: "Run ID copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const totalDurationMs = currentRun?.finishedAt
    ? currentRun.finishedAt - currentRun.startedAt
    : currentRun
      ? Date.now() - currentRun.startedAt
      : null;

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      <Tabs defaultValue="logs" className="flex flex-col h-full">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <TabsList className="grid grid-cols-2 w-48 h-8">
            <TabsTrigger value="logs" className="text-xs gap-1.5 h-7">
              <Activity className="w-3.5 h-3.5" />
              Live Logs
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5 h-7">
              <History className="w-3.5 h-3.5" />
              History ({sortedHistory.length})
            </TabsTrigger>
          </TabsList>

          {isViewingHistory && onBackToLive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onBackToLive}
              className="h-7 text-xs px-2 text-blue-600 hover:text-blue-700"
            >
              Back to Live
            </Button>
          )}
        </div>

        {/* Live Logs Tab Content */}
        <TabsContent
          value="logs"
          className="flex flex-col flex-1 min-h-0 p-3.5 gap-y-3 m-0"
        >
          {/* Run Header Status Card */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentRun?.status === "running" && (
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 gap-1 text-[11px] px-2 py-0.5 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Executing
                  </Badge>
                )}
                {currentRun?.status === "completed" && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 gap-1 text-[11px] px-2 py-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Completed
                  </Badge>
                )}
                {currentRun?.status === "failed" && (
                  <Badge variant="destructive" className="gap-1 text-[11px] px-2 py-0.5">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                  </Badge>
                )}
                {(!currentRun || currentRun.status === "idle") && (
                  <Badge variant="outline" className="text-slate-500 text-[11px] px-2 py-0.5">
                    Idle
                  </Badge>
                )}
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  {isViewingHistory ? "Past Execution" : currentRun ? "Active Run" : "Workflow Ready"}
                </span>
              </div>

              {currentRun && onRetryRun && currentRun.status === "failed" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetryRun}
                  className="h-6 text-[11px] px-2 gap-1 text-blue-600 hover:bg-blue-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  Retry
                </Button>
              )}
            </div>

            {currentRun ? (
              <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                    {currentRun.runId}
                  </span>
                  <button
                    onClick={handleCopyRunId}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[10px] font-medium"
                  >
                    {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    {copied ? "Copied" : "Copy ID"}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Started: {new Date(currentRun.startedAt).toLocaleTimeString()}</span>
                  {totalDurationMs !== null && (
                    <span>Elapsed: {(totalDurationMs / 1000).toFixed(2)}s</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Click "Run AI Workflow" to start dynamic Inngest execution.
              </p>
            )}
          </div>

          {/* Top Error Alert */}
          {currentRun?.error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">Workflow Error</AlertTitle>
              <AlertDescription className="text-[11px] mt-0.5">
                {currentRun.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Step Log Cards List */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
            <span>Execution Steps</span>
            <span className="text-[11px] font-normal text-slate-500">
              {sortedSteps.length} step(s) traversed
            </span>
          </div>

          <ScrollArea className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40">
            <div className="flex flex-col gap-2.5 p-3">
              {sortedSteps.map((step) => {
                const isStepRunning = step.status === "running";
                const isStepCompleted = step.status === "completed";
                const isStepFailed = step.status === "failed";

                return (
                  <div
                    key={`${step.nodeId}-${step.order}`}
                    className={cn(
                      "p-3 rounded-lg border transition-all duration-200 flex flex-col gap-2 bg-white dark:bg-slate-900 shadow-sm",
                      isStepRunning && "border-amber-300 ring-1 ring-amber-400/40 bg-amber-50/30",
                      isStepCompleted && "border-slate-200 dark:border-slate-800 hover:border-slate-300",
                      isStepFailed && "border-rose-300 ring-1 ring-rose-400/40 bg-rose-50/30"
                    )}
                  >
                    {/* Step Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          {step.order + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {step.nodeName}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isStepRunning && (
                          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-[10px] px-1.5 py-0 h-5 gap-1 animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Evaluating
                          </Badge>
                        )}
                        {isStepCompleted && step.result && (
                          <Badge
                            className={cn(
                              "text-[11px] font-bold px-2 py-0 h-5 gap-1 border-0",
                              step.result === "YES"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            )}
                          >
                            <ArrowRight className="w-3 h-3" />
                            {step.result}
                          </Badge>
                        )}
                        {isStepFailed && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Step Prompt Snippet */}
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-100 dark:border-slate-800 font-mono text-[10.5px] leading-relaxed">
                      {step.prompt}
                    </div>

                    {/* AI Reasoning Box */}
                    {step.reasoning && (
                      <div className="text-[11px] text-purple-900 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/40 p-2 rounded border border-purple-100 dark:border-purple-900/40 flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          {step.reasoning}
                        </span>
                      </div>
                    )}

                    {/* Error message if failed */}
                    {step.error && (
                      <div className="text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-900/40">
                        {step.error}
                      </div>
                    )}

                    {/* Step Footer meta */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                      {step.durationMs !== undefined && (
                        <span>Duration: {step.durationMs}ms</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {sortedSteps.length === 0 && (
                <div className="text-xs text-slate-400 py-10 text-center flex flex-col items-center gap-2">
                  <Sparkles className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                  <span>No execution steps recorded yet.</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab Content */}
        <TabsContent
          value="history"
          className="flex flex-col flex-1 min-h-0 p-3.5 gap-y-3 m-0"
        >
          {sortedHistory.length === 0 ? (
            <Alert className="py-3">
              <AlertTitle className="text-xs font-semibold">No Past Runs</AlertTitle>
              <AlertDescription className="text-xs text-slate-500 mt-1">
                Completed and failed workflow executions will be archived here.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {sortedHistory.map((run) => (
                  <button
                    key={run.runId}
                    type="button"
                    onClick={() => onSelectHistoryRun(run.runId)}
                    className={cn(
                      "flex flex-col gap-1.5 p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      currentRun?.runId === run.runId && "bg-blue-50/50 dark:bg-blue-950/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 truncate">
                        {run.runId}
                      </code>
                      <Badge
                        variant={run.status === "completed" ? "secondary" : run.status === "failed" ? "destructive" : "default"}
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-5",
                          run.status === "completed" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        )}
                      >
                        {run.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(run.startedAt).toLocaleString()}</span>
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        {run.steps.length} step(s)
                      </span>
                    </div>

                    {run.error && (
                      <p className="text-[10px] text-rose-600 truncate mt-0.5">
                        {run.error}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ExecutionPanel;

