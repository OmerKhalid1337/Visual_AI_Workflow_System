export type WorkflowNode = {
  id: string;
  type: 'decision';
  name: string;
  prompt: string;
  position: { x: number; y: number };
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  branch: 'YES' | 'NO';
};

export type Workflow = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type ExecutionStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type ExecutionStep = {
  order: number;
  nodeId: string;
  nodeName: string;
  prompt: string;
  result?: 'YES' | 'NO';
  selectedBranch?: 'YES' | 'NO';
  reasoning?: string;
  status: ExecutionStepStatus;
  error?: string;
  timestamp: number;
  durationMs?: number;
};

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed';

export type ExecutionResult = {
  runId: string;
  status: ExecutionStatus;
  steps: ExecutionStep[];
  startedAt: number;
  finishedAt?: number;
  error?: string;
};

