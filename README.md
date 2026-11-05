# Hive

Pay AI only for work that passes.

You write a task and set a budget. Three AI agents answer it, each on a different model running inside NEAR AI's confidential hardware (TEE). A fourth model grades every answer out of 100. Answers that score 70 or more share the budget, and whatever is left goes back to you.

> Built for NEAR HACKATHON, November 2026. Tracks: AI Swarms, Agent Economy, AI Security & Defense, Autonomous Business.
> Hive reuses the NEAR AI verification code from [Hindsight](https://github.com/Nnadijoshuac/hindsight), my other entry. The two projects are separate.
> Status: the swarm and the grader work end to end. The escrow contract is written and tested, not yet deployed. Paying in tokens other than NEAR is not built yet.

## Why
If you ask one AI for help, you get one answer and no way to tell if it is any good. You pay for it either way. Asking three tools means three subscriptions, and you still have to check each answer for made-up facts yourself.

Hive asks three, has a fourth check them, and only pays for the ones that hold up.

## How a job runs
1. Your task goes through NEAR AI's privacy filter, which removes names, emails and account numbers.
2. Scout, Sage and Maker each answer it at the same time.
3. The reviewer scores each answer and writes one sentence saying why. Invented facts cost a lot of points.
4. The budget is split between passing answers in proportion to their scores. The rest is refunded.

Every answer and every grade comes back with a `provider_tee` signature. Hive checks it against a fresh hardware attestation before the answer counts, so nobody can swap an answer or a grade after the fact.

A real run on Nov 5 2026, $10 budget: Scout scored 92 and got $5.05, Maker scored 90 and got $4.94, Sage scored 60 and got nothing. $0.01 was refunded.

## Run it
You need Node 24 or newer and a NEAR AI Cloud key from cloud.near.ai in `.env.local` as `NEAR_AI_CLOUD_API_KEY=…`.

| Step | Do | You should see |
|---|---|---|
| 1 | `npm install && npm run dev`, then open http://localhost:3000 | The landing page with a task console |
| 2 | Click **Post task** (an example task and a $10 budget are filled in) | After about a minute: three answers, a score and a sentence from the reviewer under each, `Signed · 0x…` under each, and payouts that add up to the budget |
| 3 | `curl -X POST localhost:3000/api/jobs -H 'Content-Type: application/json' -d '{"brief":"…","budgetUsd":10}'` | JSON with `redactedBrief`, and for each agent `answer`, `proof.verified`, `review.score`, `review.passed`, `review.verdict` and `payout`, plus `refunded` |
| 4 | `cd contract && cargo test` | 12 contract tests pass (on Windows set `AWS_LC_SYS_PREBUILT_NASM=1` first) |

## Where things are
| What | Code |
|---|---|
| A job from start to finish | [src/lib/swarm/engine.ts](src/lib/swarm/engine.ts) |
| The agents and the reviewer: models and instructions | [src/lib/swarm/agents.ts](src/lib/swarm/agents.ts) |
| TEE attestation: Intel TDX quote, nonce and signer binding, RTMR3, GPU evidence | [src/lib/near/attestation.ts](src/lib/near/attestation.ts) |
| Signed inference: EIP-191 `provider_tee` check over the request and response hashes | [src/lib/near/inference.ts](src/lib/near/inference.ts) |
| Removing personal data with `openai/privacy-filter` | [src/lib/near/redact.ts](src/lib/near/redact.ts) |
| Job API | [src/app/api/jobs/route.ts](src/app/api/jobs/route.ts) |
| Escrow contract: post a job, submit, review, pay out, refund after the deadline | [contract/src/lib.rs](contract/src/lib.rs) |

## Built with
NEAR AI Cloud for confidential inference, attestation and the privacy filter. A NEAR smart contract in Rust for escrow. Next.js 16, Tailwind CSS 4, shadcn/ui, React Bits and Motion for the site.

`src/lib/near/*` was written for Hindsight during this hackathon and copied here. It uses `@phala/dcap-qvl` for Intel DCAP and `@noble/curves` for signature recovery. Parts of the code were written with Claude Code.

## License
MIT. See [LICENSE](LICENSE).
