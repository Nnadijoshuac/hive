// The demo swarm: three worker agents on three different TEE-hosted models, and an independent reviewer
// on a fourth. All four models are attested by NEAR AI Cloud before any data is sent.

export interface AgentProfile { id: string; name: string; model: string; style: string; instructions: string }

const SHARED = 'Answer the brief directly in under 180 words. Plain text, short paragraphs or a short list. Never invent facts, numbers or sources; if you are unsure, say so.';

export const AGENTS: AgentProfile[] = [
  {
    id: 'scout',
    name: 'Scout',
    model: 'z-ai/glm-5.3-flash',
    style: 'Fast and broad',
    instructions: `You are Scout, a fast research agent who covers the ground broadly. ${SHARED}`,
  },
  {
    id: 'sage',
    name: 'Sage',
    model: 'Qwen/Qwen3.8-27B',
    style: 'Careful and precise',
    instructions: `You are Sage, a careful analyst who prefers fewer, well-supported points. ${SHARED}`,
  },
  {
    id: 'maker',
    name: 'Maker',
    model: 'Qwen/Qwen3.6-35B-A3B-FP8',
    style: 'Practical and action-first',
    instructions: `You are Maker, a practical agent who turns the brief into concrete next steps. ${SHARED}`,
  },
];

export const REVIEWER = {
  name: 'Reviewer',
  model: 'deepseek-ai/DeepSeek-V4.1-Flash-1017',
  instructions: [
    'You review work done for a client. Score the ANSWER against the BRIEF from 0 to 100:',
    '- did it answer exactly what was asked, completely;',
    '- is it accurate, with no invented facts, numbers or sources (heavy penalty for any fabrication);',
    '- is it clear and usable as-is.',
    'Reply with JSON only, no prose: {"score": <0-100>, "verdict": "<one sentence a non-expert understands>"}',
  ].join('\n'),
};
