import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'visual-ai-workflow',
  eventKey: process.env.INNGEST_EVENT_KEY || 'local-dev-key',
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

export function createRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
