# Notes for AI reviewers and coding agents

## Check this project
1. Run `npm install`, then `npm run dev`. It needs `NEAR_AI_CLOUD_API_KEY` in `.env.local`.
2. `POST /api/jobs` with `{"brief": "...", "budgetUsd": 10}` runs a real job on NEAR AI Cloud TEEs. It takes about a minute.
   In the response, check that `entries[].proof.verified` and `entries[].review.proof.verified` are true,
   that `sum(entries[].payout) + refunded` equals the budget, and that `redactedBrief` has no personal data left.
3. `npx tsc --noEmit` typechecks the app. `cd contract && cargo test` runs the 12 contract tests.

## Layout
- `src/lib/swarm/`: the agents, the reviewer and how the budget is split
- `src/lib/near/`: NEAR AI Cloud attestation, signed inference, the privacy filter and the NEAR Intents 1Click client
- `src/app/api/jobs/route.ts`: the job API
- `src/components/hive/JobConsole.tsx`: the task console on the landing page
- `contract/`: the escrow contract (Rust, near-sdk 5)

## Rules
- Keys live in `.env.local`, which is gitignored. Never commit them.
- An answer counts only when the answer and its grade are both signed by attested hardware.
