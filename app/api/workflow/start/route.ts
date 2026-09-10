import { NextRequest, NextResponse } from 'next/server';
import { parseWorkflow } from '@/lib/workflow-helpers';
import { createRunId, inngest } from '@/inngest/client';
import { runStore } from '@/lib/runStore';
import { executeWorkflowDirect } from '@/inngest/functions';
import type { ExecutionResult, Workflow } from '@/types/workflow';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = parseWorkflow(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: `Invalid workflow: ${parsed.error}` },
      { status: 400 }
    );
  }

  const graph: Workflow = parsed.data;
  const runId = createRunId();

  const initialResult: ExecutionResult = {
    runId,
    status: 'running',
    steps: [],
    startedAt: Date.now(),
  };
  runStore.set(runId, initialResult);

  let inngestSent = false;
  try {
    await inngest.send({
      name: 'ai/workflow.start',
      data: { runId, graph },
    });
    inngestSent = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`Inngest send failed, falling back to direct execution: ${msg}`);
  }

  if (!inngestSent) {
    try {
      await executeWorkflowDirect(graph, runId);
    } catch (directErr) {
      const directMsg = directErr instanceof Error ? directErr.message : String(directErr);
      runStore.patch(runId, {
        status: 'failed',
        error: `Direct execution failed: ${directMsg}`,
        finishedAt: Date.now(),
      });
    }
  }

  return NextResponse.json({ runId, status: 'started' }, { status: 200 });
}
