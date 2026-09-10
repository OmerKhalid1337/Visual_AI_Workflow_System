import { z } from 'zod';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
} from '@/types/workflow';

export const MAX_EXECUTION_STEPS = 50 as const;

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('decision'),
  name: z.string().min(1, 'Node name is required'),
  prompt: z.string().min(1, 'Node prompt cannot be empty'),
  position: PositionSchema,
});

const WorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  branch: z.enum(['YES', 'NO']),
});

const WorkflowSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
});

const WorkflowEnvelopeSchema = z.object({
  graph: WorkflowSchema,
});

export const DEFAULT_INITIAL_WORKFLOW: Workflow = {
  nodes: [
    {
      id: 'node_start',
      type: 'decision',
      name: 'Customer Support Triage',
      prompt: 'Is this message a customer support inquiry requesting assistance with an existing account or service?',
      position: { x: 280, y: 50 },
    },
    {
      id: 'node_tech_eval',
      type: 'decision',
      name: 'Technical Assistance Check',
      prompt: 'Does this issue involve a software bug, API error, system failure, or code integration problem?',
      position: { x: 80, y: 320 },
    },
    {
      id: 'node_sales_eval',
      type: 'decision',
      name: 'Sales / Partnership Check',
      prompt: 'Is the sender interested in purchasing an enterprise plan, scheduling a demo, or discussing pricing?',
      position: { x: 520, y: 320 },
    },
    {
      id: 'node_tech_tier2',
      type: 'decision',
      name: 'Critical Outage Severity',
      prompt: 'Is this a production-down or severe data-loss emergency requiring immediate Tier-2 escalation?',
      position: { x: -80, y: 580 },
    },
    {
      id: 'node_general_support',
      type: 'decision',
      name: 'Billing & Account Help',
      prompt: 'Does this request pertain to billing receipts, invoices, subscription changes, or general questions?',
      position: { x: 220, y: 580 },
    },
  ],
  edges: [
    {
      id: 'edge_1_yes',
      source: 'node_start',
      target: 'node_tech_eval',
      branch: 'YES',
    },
    {
      id: 'edge_1_no',
      source: 'node_start',
      target: 'node_sales_eval',
      branch: 'NO',
    },
    {
      id: 'edge_2_yes',
      source: 'node_tech_eval',
      target: 'node_tech_tier2',
      branch: 'YES',
    },
    {
      id: 'edge_2_no',
      source: 'node_tech_eval',
      target: 'node_general_support',
      branch: 'NO',
    },
  ],
};

export const WORKFLOW_TEMPLATES: { name: string; description: string; data: Workflow }[] = [
  {
    name: 'Customer Support Triage',
    description: 'Routes incoming tickets between Technical, Billing, and Sales teams.',
    data: DEFAULT_INITIAL_WORKFLOW,
  },
  {
    name: 'Lead Qualification Engine',
    description: 'Assesses B2B leads based on budget, team size, and urgency.',
    data: {
      nodes: [
        {
          id: 'lead_b2b',
          type: 'decision',
          name: 'B2B Enterprise Prospect',
          prompt: 'Is the prospect a registered business or corporate entity with more than 50 employees?',
          position: { x: 250, y: 50 },
        },
        {
          id: 'lead_budget',
          type: 'decision',
          name: 'Budget Confirmation',
          prompt: 'Does the prospective client have an annual budget exceeding $25,000 for this project?',
          position: { x: 100, y: 300 },
        },
        {
          id: 'lead_self_serve',
          type: 'decision',
          name: 'Self-Service Recommendation',
          prompt: 'Would this customer benefit most from our starter self-serve tier?',
          position: { x: 450, y: 300 },
        },
      ],
      edges: [
        {
          id: 'lead_edge_1',
          source: 'lead_b2b',
          target: 'lead_budget',
          branch: 'YES',
        },
        {
          id: 'lead_edge_2',
          source: 'lead_b2b',
          target: 'lead_self_serve',
          branch: 'NO',
        },
      ],
    },
  },
  {
    name: 'Bug Severity Classifier',
    description: 'Automates triage of bug reports to establish SLA and priority.',
    data: {
      nodes: [
        {
          id: 'bug_security',
          type: 'decision',
          name: 'Security Vulnerability',
          prompt: 'Does this reported issue expose user credentials, auth bypass, or private data?',
          position: { x: 250, y: 50 },
        },
        {
          id: 'bug_reproducible',
          type: 'decision',
          name: 'Consistent Reproduction',
          prompt: 'Are clear reproduction steps and error logs provided to reproduce the bug?',
          position: { x: 100, y: 300 },
        },
        {
          id: 'bug_ui_glitch',
          type: 'decision',
          name: 'Cosmetic UI Defect',
          prompt: 'Is this issue purely visual without affecting core data integrity or user actions?',
          position: { x: 450, y: 300 },
        },
      ],
      edges: [
        {
          id: 'bug_edge_1',
          source: 'bug_security',
          target: 'bug_reproducible',
          branch: 'NO',
        },
        {
          id: 'bug_edge_2',
          source: 'bug_reproducible',
          target: 'bug_ui_glitch',
          branch: 'NO',
        },
      ],
    },
  },
];

export function validateWorkflow(workflow: Workflow): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('Workflow must contain at least one decision node.');
    return { ok: false, errors };
  }

  const nodeIds = new Set(workflow.nodes.map((n) => n.id));

  // Check empty prompts
  for (const node of workflow.nodes) {
    if (!node.name || node.name.trim() === '') {
      errors.push(`Node "${node.id}" is missing a name.`);
    }
    if (!node.prompt || node.prompt.trim() === '') {
      errors.push(`Node "${node.name || node.id}" has an empty evaluation prompt.`);
    }
  }

  // Check edge references
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(
        `Edge "${edge.id}" references non-existent source node "${edge.source}".`
      );
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(
        `Edge "${edge.id}" references non-existent target node "${edge.target}".`
      );
    }
    if (edge.source === edge.target) {
      errors.push(`Node "${edge.source}" has a self-referencing edge to itself.`);
    }
  }

  // Check multiple edges of same branch
  const outgoingByNodeAndBranch = new Map<string, Map<'YES' | 'NO', number>>();
  for (const node of workflow.nodes) {
    outgoingByNodeAndBranch.set(node.id, new Map([
      ['YES', 0],
      ['NO', 0],
    ]));
  }

  for (const edge of workflow.edges) {
    const branchMap = outgoingByNodeAndBranch.get(edge.source);
    if (branchMap) {
      branchMap.set(edge.branch, (branchMap.get(edge.branch) ?? 0) + 1);
    }
  }

  for (const [nodeId, branchMap] of outgoingByNodeAndBranch) {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    const nodeLabel = node ? `"${node.name}" (${nodeId})` : `"${nodeId}"`;
    const yesCount = branchMap.get('YES') ?? 0;
    const noCount = branchMap.get('NO') ?? 0;
    if (yesCount > 1) {
      errors.push(
        `Node ${nodeLabel} has ${yesCount} YES outgoing connections (maximum 1 allowed).`
      );
    }
    if (noCount > 1) {
      errors.push(
        `Node ${nodeLabel} has ${noCount} NO outgoing connections (maximum 1 allowed).`
      );
    }
  }

  // Check start nodes
  const startNodes = findStartNodes(workflow);
  if (startNodes.length === 0) {
    errors.push('No start node found (every node has incoming edges, creating a loop).');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function findStartNodes(workflow: Workflow): WorkflowNode[] {
  if (!workflow.nodes || workflow.nodes.length === 0) return [];
  const incomingNodeIds = new Set(workflow.edges.map((e) => e.target));
  return workflow.nodes.filter((n) => !incomingNodeIds.has(n.id));
}

export function getOutgoingEdge(
  workflow: Workflow,
  nodeId: string,
  branch: 'YES' | 'NO'
): WorkflowEdge | undefined {
  return workflow.edges.find(
    (e) => e.source === nodeId && e.branch === branch
  );
}

export function parseWorkflow(
  json: unknown
): { ok: true; data: Workflow } | { ok: false; error: string } {
  // Check direct workflow format
  const directResult = WorkflowSchema.safeParse(json);
  if (directResult.success) {
    return { ok: true, data: directResult.data };
  }

  // Check nested envelope format { graph: Workflow }
  const envelopeResult = WorkflowEnvelopeSchema.safeParse(json);
  if (envelopeResult.success) {
    return { ok: true, data: envelopeResult.data.graph };
  }

  return {
    ok: false,
    error: directResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
}

export function normalizeDecision(
  raw: string
): { ok: true; value: 'YES' | 'NO' } | { ok: false; error: string } {
  const normalized = raw.trim().toUpperCase();
  if (normalized === 'YES' || normalized === 'NO') {
    return { ok: true, value: normalized };
  }
  // Try substring search if model returned conversational preface
  if (/\bYES\b/i.test(raw) && !/\bNO\b/i.test(raw)) {
    return { ok: true, value: 'YES' };
  }
  if (/\bNO\b/i.test(raw) && !/\bYES\b/i.test(raw)) {
    return { ok: true, value: 'NO' };
  }
  return {
    ok: false,
    error: `Invalid decision value: "${raw}". Expected strictly "YES" or "NO".`,
  };
}

export function genId(prefix = 'n'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36).slice(-4)}_${rand}`;
}

