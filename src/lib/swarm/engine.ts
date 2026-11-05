// Hive swarm engine: one job, several competing agents, one independent reviewer.
//
//   1. The brief is stripped of personal data (NEAR AI privacy filter).
//   2. Every agent answers on its own TEE-hosted model; each reply is signed by attested hardware.
//   3. A reviewer on a different TEE model scores every answer against the brief.
//   4. Only answers that pass are paid, in proportion to their score. If none pass, the poster is refunded.
import { privateChat, type PrivateCompletion } from '@/lib/near/inference';
import { redact } from '@/lib/near/redact';
import { AGENTS, REVIEWER, type AgentProfile } from './agents';

export const PASS_SCORE = 70;

export interface Review { score: number; passed: boolean; verdict: string; proof: Proof }
export interface Proof { verified: boolean; signer: string; reason?: string }
export interface Entry { agent: AgentProfile; answer: string; proof: Proof; review: Review; payout: number; error?: string }
export interface JobResult { brief: string; redactedBrief: string; budget: number; entries: Entry[]; refunded: number }

const proofOf = (c: PrivateCompletion): Proof => ({ verified: c.verified, signer: c.signer, reason: c.reason });

async function work(agent: AgentProfile, brief: string, apiKey: string) {
  const reply = await privateChat(agent.model, [
    { role: 'system', content: agent.instructions },
    { role: 'user', content: brief },
  ], apiKey);
  return { answer: reply.content.trim(), proof: proofOf(reply) };
}

/** The reviewer returns strict JSON so its verdict can be parsed, stored and hashed. */
async function review(brief: string, answer: string, apiKey: string): Promise<Review> {
  const reply = await privateChat(REVIEWER.model, [
    { role: 'system', content: REVIEWER.instructions },
    { role: 'user', content: `BRIEF:\n${brief}\n\nANSWER:\n${answer}` },
  ], apiKey);
  const match = reply.content.match(/\{[\s\S]*\}/);
  const parsed = match ? JSON.parse(match[0]) as { score?: number; verdict?: string } : {};
  const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)));
  return { score, passed: score >= PASS_SCORE, verdict: parsed.verdict ?? 'No verdict returned.', proof: proofOf(reply) };
}

/** Split the budget across passing entries by score; whatever is not earned goes back to the poster. */
export function settle(budget: number, scores: { passed: boolean; score: number }[]) {
  const total = scores.reduce((sum, s) => sum + (s.passed ? s.score : 0), 0);
  const payouts = scores.map((s) => (s.passed && total ? Math.floor((budget * s.score) / total) : 0));
  return { payouts, refunded: budget - payouts.reduce((a, b) => a + b, 0) };
}

/** Run a job end to end. `budget` is in cents. */
export async function runJob(brief: string, budget: number, apiKey: string): Promise<JobResult> {
  const [{ text: redactedBrief }] = await redact([brief], apiKey);

  const attempts = await Promise.all(AGENTS.map(async (agent) => {
    try {
      const { answer, proof } = await work(agent, redactedBrief, apiKey);
      return { agent, answer, proof, review: await review(redactedBrief, answer, apiKey) };
    } catch (err) {
      const failed: Proof = { verified: false, signer: '', reason: 'agent did not finish' };
      return { agent, answer: '', proof: failed, review: { score: 0, passed: false, verdict: 'Agent failed to deliver.', proof: failed }, error: (err as Error).message };
    }
  }));

  // An answer only counts if both it and its review are provably from attested hardware.
  const eligible = attempts.map((a) => ({ passed: a.review.passed && a.proof.verified && a.review.proof.verified, score: a.review.score }));
  const { payouts, refunded } = settle(budget, eligible);

  return {
    brief,
    redactedBrief,
    budget,
    entries: attempts.map((a, i) => ({ ...a, review: { ...a.review, passed: eligible[i].passed }, payout: payouts[i] })),
    refunded,
  };
}
