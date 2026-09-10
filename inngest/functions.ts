import { inngest } from './client';
import { callOpenAIDecision, AIDecisionResult } from '@/lib/ai';
import {
  findStartNodes,
  getOutgoingEdge,
  validateWorkflow,
  MAX_EXECUTION_STEPS,
} from '@/lib/workflow-helpers';
import type {
  Workflow,
  WorkflowNode,
  ExecutionResult,
  ExecutionStep,
} from '@/types/workflow';
import { runStore } from '@/lib/runStore';

async function executeWorkflowCore(
  graph: Workflow,
  runId: string,
  options: {
    stepRun: <T>(id: string, name: string, fn: () => Promise<T>) => Promise<T>;
  }
): Promise<ExecutionResult> {
  const validation = validateWorkflow(graph);
  if (!validation.ok) {
    const finalResult: ExecutionResult = {
      runId,
      status: 'failed',
      steps: [],
      startedAt: Date.now(),
      finishedAt: Date.now(),
      error: `Invalid workflow: ${validation.errors.join('; ')}`,
    };
    runStore.set(runId, finalResult);
    return finalResult;
  }

  const starts = findStartNodes(graph);
  if (starts.length === 0) {
    const finalResult: ExecutionResult = {
      runId,
      status: 'failed',
      steps: [],
      startedAt: Date.now(),
      finishedAt: Date.now(),
      error: 'No start node found (no node without incoming edges)',
    };
    runStore.set(runId, finalResult);
    return finalResult;
  }

  const startNode = starts[0];

  const finalResult: ExecutionResult = {
    runId,
    status: 'running',
    steps: [],
    startedAt: Date.now(),
  };
  runStore.set(runId, finalResult);

  let currentNode: WorkflowNode | undefined = startNode;
  let order = 0;
  let workflowError: string | undefined;
  let completedNormally = true;

  while (currentNode) {
    if (order >= MAX_EXECUTION_STEPS) {
      workflowError = `Max steps reached (possible loop detected): limit of ${MAX_EXECUTION_STEPS} steps`;
      completedNormally = false;
      break;
    }

    const node = currentNode;
    const sanitizedNodeId = node.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const stepId = `eval-step-${order}-${sanitizedNodeId}`;
    const currentOrder = order;
    const stepStartTime = Date.now();

    const runningStep: ExecutionStep = {
      order: currentOrder,
      nodeId: node.id,
      nodeName: node.name,
      prompt: node.prompt,
      status: 'running',
      timestamp: stepStartTime,
    };
    finalResult.steps.push(runningStep);
    runStore.patch(runId, { steps: [runningStep] });

    try {
      const decisionResult: AIDecisionResult = await options.stepRun(
        stepId,
        `Evaluate: ${node.name}`,
        async () => callOpenAIDecision(node.prompt)
      );

      const stepEndTime = Date.now();
      const completedStep: ExecutionStep = {
        ...runningStep,
        result: decisionResult.decision,
        selectedBranch: decisionResult.decision,
        reasoning: decisionResult.reasoning,
        status: 'completed',
        timestamp: stepEndTime,
        durationMs: stepEndTime - stepStartTime,
      };
      finalResult.steps[finalResult.steps.length - 1] = completedStep;
      runStore.patch(runId, { steps: [completedStep] });

      const edge = getOutgoingEdge(graph, node.id, decisionResult.decision);
      if (!edge) {
        // Reached end of branch cleanly
        break;
      }

      const nextNode = graph.nodes.find((n) => n.id === edge.target);
      if (!nextNode) {
        workflowError = `Dangling edge: edge "${edge.id}" targets non-existent node "${edge.target}"`;
        completedNormally = false;
        break;
      }

      currentNode = nextNode;
      order++;
    } catch (err) {
      const stepEndTime = Date.now();
      const errorMsg = err instanceof Error ? err.message : String(err);
      const failedStep: ExecutionStep = {
        ...runningStep,
        status: 'failed',
        error: errorMsg,
        timestamp: stepEndTime,
        durationMs: stepEndTime - stepStartTime,
      };
      finalResult.steps[finalResult.steps.length - 1] = failedStep;
      runStore.patch(runId, { steps: [failedStep] });
      workflowError = errorMsg;
      completedNormally = false;
      break;
    }
  }

  finalResult.status = completedNormally ? 'completed' : 'failed';
  finalResult.finishedAt = Date.now();
  if (workflowError) {
    finalResult.error = workflowError;
  }
  runStore.set(runId, finalResult);
  return finalResult;
}

export async function executeWorkflowDirect(
  graph: Workflow,
  runId: string
): Promise<ExecutionResult> {
  return executeWorkflowCore(graph, runId, {
    stepRun: async (_id, _name, fn) => fn(),
  });
}

type EventShape = { data: { runId: string; graph: Workflow } };

export const aiWorkflowExecute = inngest.createFunction(
  {
    id: 'ai-workflow-execute',
    name: 'AI Workflow Execute',
    triggers: [{ event: 'ai/workflow.start' }],
  },
  async ({ event, step }: any) => {
    const { runId, graph } = (event as EventShape).data;
    return executeWorkflowCore(graph, runId, {
      stepRun: async (id, _name, fn) => step.run(id, fn),
    });
  }
);

