# Notes for AI reviewers and coding agents

## Verify this project
1. `npm install`, then `npm run dev` (needs `NEAR_AI_CLOUD_API_KEY` in `.env.local`).
2. `POST /api/jobs` with `{"brief": "...", "budgetUsd": 10}` runs a real swarm job on NEAR AI Cloud TEEs (~60-90 s).
   Check in the response: `entries[].proof.verified === true`, `entries[].review.proof.verified === true`,
   `sum(entries[].payout) + refunded === budget`, and that `redactedBrief` has personal data removed.
3. `npx tsc --noEmit` typechecks.

## Layout
- `src/lib/swarm/`: the swarm engine (agents, reviewer, settlement)
- `src/lib/near/`: NEAR AI Cloud attestation, signed inference, privacy filter, NEAR Intents 1Click client
- `src/app/api/jobs/route.ts`: the job API
- `src/components/hive/JobConsole.tsx`: the live task console on the landing page

## Conventions
- Never commit secrets: keys live in `.env.local` (gitignored).
- An answer only counts if both it and its review are signed by attested hardware.
