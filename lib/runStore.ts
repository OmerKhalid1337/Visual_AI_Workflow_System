import type { ExecutionResult } from '@/types/workflow';

declare global {
  var __runStoreCache: Map<string, ExecutionResult> | undefined;
}

const store: Map<string, ExecutionResult> =
  (globalThis as typeof globalThis & { __runStoreCache?: Map<string, ExecutionResult> }).__runStoreCache ||
  new Map<string, ExecutionResult>();

if (typeof window === 'undefined') {
  (globalThis as typeof globalThis & { __runStoreCache?: Map<string, ExecutionResult> }).__runStoreCache = store;
}

function mergeSteps(
  existing: ExecutionResult['steps'],
  patchSteps: ExecutionResult['steps']
): ExecutionResult['steps'] {
  const map = new Map<number, ExecutionResult['steps'][number]>();
  for (const s of existing) {
    map.set(s.order, s);
  }
  for (const s of patchSteps) {
    map.set(s.order, s);
  }
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

export const runStore = {
  get(runId: string): ExecutionResult | undefined {
    return store.get(runId);
  },

  set(runId: string, result: ExecutionResult): void {
    store.set(runId, result);
  },

  list(): ExecutionResult[] {
    return Array.from(store.values()).sort((a, b) => b.startedAt - a.startedAt);
  },

  patch(
    runId: string,
    patch: Partial<ExecutionResult> & { steps?: ExecutionResult['steps'] }
  ): ExecutionResult | undefined {
    const existing = store.get(runId);
    if (!existing) return undefined;

    const { steps: patchSteps, ...restPatch } = patch;

    const merged: ExecutionResult = {
      ...existing,
      ...restPatch,
    };

    if (patchSteps) {
      merged.steps = mergeSteps(existing.steps, patchSteps);
    }

    store.set(runId, merged);
    return merged;
  },
};
