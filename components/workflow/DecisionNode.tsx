"use client";

import React from "react";
import { type NodeProps, Handle, Position, type Node } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, CheckCircle2, AlertCircle, Loader2, PlayCircle } from "lucide-react";

export type DecisionNodeState = "idle" | "running" | "completed" | "failed";

export interface DecisionNodeData {
  [key: string]: unknown;
  name: string;
  prompt: string;
  nodeState?: DecisionNodeState;
  isStartNode?: boolean;
  onNameChange?: (id: string, val: string) => void;
  onPromptChange?: (id: string, val: string) => void;
}

export type DecisionNode = Node<DecisionNodeData, "decision">;

export function DecisionNode({ id, data, selected }: NodeProps<DecisionNode>) {
  const { name, prompt, nodeState = "idle", isStartNode = false, onNameChange, onPromptChange } = data;

  const isRunning = nodeState === "running";
  const isCompleted = nodeState === "completed";
  const isFailed = nodeState === "failed";
  const isEmptyPrompt = !prompt || prompt.trim() === "";

  return (
    <div className="relative min-w-[320px] max-w-[360px] group">
      {/* Target handle (Input) */}
      <Handle
        type="target"
        id="in"
        position={Position.Top}
        className="!w-3.5 !h-3.5 !bg-slate-400 !border-2 !border-white dark:!border-slate-900 shadow-sm transition-transform hover:!scale-125 hover:!bg-blue-500"
      />

      <Card
        className={cn(
          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border shadow-lg rounded-xl transition-all duration-300 overflow-hidden",
          selected ? "ring-2 ring-blue-500 shadow-blue-500/20 shadow-xl" : "border-slate-200 dark:border-slate-800 hover:border-slate-300",
          isRunning && "ring-2 ring-amber-400 shadow-amber-500/20 shadow-xl border-amber-300",
          isCompleted && "ring-2 ring-emerald-500 shadow-emerald-500/20 shadow-xl border-emerald-300",
          isFailed && "ring-2 ring-red-500 shadow-red-500/20 shadow-xl border-red-300"
        )}
      >
        {/* Node Header Banner */}
        <div className={cn(
          "px-3.5 py-2 flex items-center justify-between border-b text-xs font-medium tracking-wide transition-colors",
          isStartNode
            ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-100 dark:border-blue-900/50"
            : "bg-slate-50/80 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800",
          isRunning && "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50",
          isCompleted && "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50",
          isFailed && "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
        )}>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "flex items-center justify-center w-5 h-5 rounded-md",
              isStartNode ? "bg-blue-600 text-white" : "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300"
            )}>
              {isStartNode ? <PlayCircle className="w-3.5 h-3.5" /> : <Sparkles className="w-3 h-3" />}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 uppercase text-[10px] tracking-wider">
              {isStartNode ? "Start AI Decision" : "AI Decision Step"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isRunning && (
              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 h-5 gap-1 animate-pulse">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Running
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] px-1.5 py-0 h-5 gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Done
              </Badge>
            )}
            {isFailed && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
                Failed
              </Badge>
            )}
            {!isRunning && !isCompleted && !isFailed && isStartNode && (
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-950/80 px-1.5 py-0.5 rounded">
                ENTRYPOINT
              </span>
            )}
          </div>
        </div>

        {/* Node Body */}
        <div className="p-3.5 flex flex-col gap-2.5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1 block">
              Node Title
            </label>
            <Input
              value={name}
              onChange={(e) => onNameChange?.(id, e.target.value)}
              className="h-8 text-xs font-medium bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-blue-500"
              placeholder="e.g., Support Ticket Classifier"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                LLM Decision Prompt (Returns YES / NO)
              </label>
              {isEmptyPrompt && (
                <span className="text-[10px] text-amber-500 font-medium">Prompt required</span>
              )}
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => onPromptChange?.(id, e.target.value)}
              className={cn(
                "min-h-[85px] text-xs leading-relaxed resize-none bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-blue-500",
                isEmptyPrompt && "border-amber-400 focus-visible:ring-amber-400"
              )}
              placeholder="State the condition to evaluate. The model will strictly output YES or NO."
            />
          </div>
        </div>

        {/* Branch Ports Footer */}
        <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Branch YES
          </span>
          <span className="text-rose-700 dark:text-rose-300 flex items-center gap-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
            Branch NO
          </span>
        </div>
      </Card>

      {/* YES Handle (Bottom-Left) */}
      <div className="absolute -bottom-1.5 left-10 flex flex-col items-center">
        <Handle
          type="source"
          id="yes"
          position={Position.Bottom}
          className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-white dark:!border-slate-900 shadow-md hover:!scale-125 transition-transform"
        />
      </div>

      {/* NO Handle (Bottom-Right) */}
      <div className="absolute -bottom-1.5 right-10 flex flex-col items-center">
        <Handle
          type="source"
          id="no"
          position={Position.Bottom}
          className="!w-4 !h-4 !bg-rose-500 !border-2 !border-white dark:!border-slate-900 shadow-md hover:!scale-125 transition-transform"
        />
      </div>
    </div>
  );
}

export default DecisionNode;

