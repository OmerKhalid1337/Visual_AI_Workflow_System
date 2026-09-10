'use server';

import OpenAI from 'openai';
import { normalizeDecision } from '@/lib/workflow-helpers';

export interface AIDecisionResult {
  decision: 'YES' | 'NO';
  reasoning: string;
}

export async function callOpenAIDecision(prompt: string): Promise<AIDecisionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'AI_ERROR: Missing OpenAI API key on server. Please set OPENAI_API_KEY in your .env file.'
    );
  }

  const openai = new OpenAI({ apiKey: apiKey.trim() });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ai_decision_evaluation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              decision: {
                type: 'string',
                enum: ['YES', 'NO'],
                description: 'Strict binary decision: YES or NO',
              },
              reasoning: {
                type: 'string',
                description: 'Concise explanation (1-2 sentences) of why this decision was reached based on the prompt.',
              },
            },
            required: ['decision', 'reasoning'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'You are an autonomous AI decision classifier in an automated workflow system. Evaluate the prompt objectively and strictly choose YES or NO based on the given criteria. Provide a concise, clear explanation for your decision.',
        },
        {
          role: 'user',
          content: `Evaluate the following prompt and return YES or NO:\n\n${prompt}`,
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content ?? '';
    
    try {
      const parsed = JSON.parse(rawContent);
      const normalized = normalizeDecision(parsed.decision ?? '');
      if (normalized.ok) {
        return {
          decision: normalized.value,
          reasoning: parsed.reasoning || `Evaluated prompt to ${normalized.value}`,
        };
      }
    } catch {
      // If JSON parse fails, fallback to direct text extraction
    }

    const fallbackNormalized = normalizeDecision(rawContent);
    if (fallbackNormalized.ok) {
      return {
        decision: fallbackNormalized.value,
        reasoning: `Extracted direct decision: ${fallbackNormalized.value}`,
      };
    }

    throw new Error(
      `AI_ERROR: Model returned unexpected format: "${rawContent}". Expected YES or NO.`
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('AI_ERROR:')) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`AI_ERROR: OpenAI API request failed: ${msg}`);
  }
}

