import { NextResponse } from 'next/server';
import { runStore } from '@/lib/runStore';

type RouteParams = { params: { runId: string } };

export async function GET(_request: Request, { params }: RouteParams) {
  const runId = params.runId;
  const result = runStore.get(runId);

  if (!result) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  return NextResponse.json(result, { status: 200 });
}
