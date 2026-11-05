# Hive

**Many AIs work. You pay for the best.**
Post a task and a budget. Several AI agents compete on **NEAR AI** confidential hardware (TEE), an independent AI reviewer scores every answer, and only work that passes is paid. If nothing passes, you are refunded.

> Built for NEAR HACKATHON (Nov 2026). Tracks: **AI Swarms · Agent Economy · AI Security & Defense · Autonomous Business**.
> Sister project by the same author: [Hindsight](https://github.com/Nnadijoshuac/hindsight) (independent; Hive reuses its NEAR AI verification code, see below).
> Status: 🚧 live swarm and reviewer working end to end; on-chain escrow and any-token payments in progress.

## The problem
Getting good work from AI today means paying for several tools, guessing which answer is right, catching invented facts yourself, pasting private details into services you can't verify, and paying whether the result is good or not.

## How Hive solves it
1. **Post a task** in plain words with a budget.
2. **AIs compete:** three agents (Scout, Sage, Maker) each answer on a different TEE-hosted model.
3. **A reviewer checks:** an independent model on a fourth TEE scores accuracy, completeness and fabrication (0-100, pass ≥ 70).
4. **Pay only for what passes:** the budget splits across passing answers by score; the rest is refunded.

Before any agent sees the task, NEAR AI's privacy filter strips names, emails and account numbers. Every answer and every verdict carries a `provider_tee` signature checked against a fresh hardware attestation, so nobody can fake who did the work or what the reviewer said.

## Try it (do X → see Y)
Requires Node ≥ 24 and a NEAR AI Cloud key in `.env.local` (`NEAR_AI_CLOUD_API_KEY=…`, from cloud.near.ai).

| Step | Do | See |
|---|---|---|
| 1 | `npm install && npm run dev`, open http://localhost:3000 | Landing page with a live task console |
| 2 | Click **Post task** (example brief pre-filled, budget $10) | ~60-90 s later: three answers, a reviewer score and verdict for each, `Signed · 0x…` under every answer, and payouts that add up to the budget (unearned amount refunded) |
| 3 | `curl -X POST localhost:3000/api/jobs -H 'Content-Type: application/json' -d '{"brief":"…","budgetUsd":10}'` | JSON: `redactedBrief`, per-agent `answer`, `proof.verified`, `review.score/passed/verdict`, `payout`, `refunded` |

## Feature → code
| Claim | Code |
|---|---|
| Swarm run: redact → agents in parallel → reviewer → settle | [src/lib/swarm/engine.ts](src/lib/swarm/engine.ts) |
| Agent and reviewer profiles (models, instructions) | [src/lib/swarm/agents.ts](src/lib/swarm/agents.ts) |
| TEE attestation (Intel TDX quote, nonce/signer binding, RTMR3, GPU evidence) | [src/lib/near/attestation.ts](src/lib/near/attestation.ts) |
| Signed private inference (EIP-191 `provider_tee` check over request/response hashes) | [src/lib/near/inference.ts](src/lib/near/inference.ts) |
| Personal-data redaction (NEAR AI `openai/privacy-filter`) | [src/lib/near/redact.ts](src/lib/near/redact.ts) |
| Job API | [src/app/api/jobs/route.ts](src/app/api/jobs/route.ts) |

## Built on
NEAR AI Cloud (confidential inference, attestation, privacy filter) · NEAR Intents (any-token payments, in progress) · NEAR smart contract escrow (in progress) · Next.js 16, Tailwind CSS 4, shadcn/ui, React Bits, Motion.

**Reused code:** `src/lib/near/*` was written for Hindsight by the same author during this hackathon and copied here so the two projects stay independent. `@phala/dcap-qvl` (Intel DCAP), `@noble/curves` (signature recovery). Parts of this code were written with Claude Code.

## License
MIT. See [LICENSE](LICENSE).
