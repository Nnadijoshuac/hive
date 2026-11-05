// Hive on NEAR testnet: records each finished job in the Hive contract, so the money moves on-chain.
//   post_job  hive-dev holds the budget in escrow, against a hash of the redacted task
//   submit    each AI's own account submits a hash of its answer, tied to the machine that signed it
//   review    the reviewer posts the scores; the contract pays answers at 70 or more and refunds the rest
//
// Keys are read from NEAR's standard credentials folder (~/.near-credentials/testnet), outside the project.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { Account, JsonRpcProvider, nearToYocto, teraToGas, type KeyPairString } from 'near-api-js';

import type { JobResult } from '@/lib/swarm/engine';

export const CONTRACT = process.env.HIVE_CONTRACT ?? 'hive-dev.testnet';
export const EXPLORER = 'https://testnet.nearblocks.io/txns/';

/** Testnet demo scale: the dollar budget is held as test NEAR at this rate, so the faucet funds go further. */
export const NEAR_PER_USD = 0.01;

const provider = new JsonRpcProvider({ url: 'https://test.rpc.fastnear.com' });
const CREDENTIALS = path.join(homedir(), '.near-credentials', 'testnet');

export interface ChainRecord { jobId: number; escrowNear: string; txs: { step: string; hash: string }[] }

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** An account that can sign, from <id>.json or the newest key file in <id>/ (where added keys are saved). */
async function signer(accountId: string) {
  const read = async (file: string) => JSON.parse(await readFile(file, 'utf8')) as { private_key: KeyPairString };
  const dir = path.join(CREDENTIALS, accountId);
  const files = await readdir(dir).catch(() => [] as string[]);
  const key = files.length ? await read(path.join(dir, files.sort().at(-1)!)) : await read(path.join(CREDENTIALS, `${accountId}.json`));
  return new Account(accountId, provider, key.private_key);
}

/** Calls the contract and returns the transaction hash and decoded return value. Throws if it failed. */
// Agents' calls are small, and the gas attached is reserved from the caller's balance up front, so they
// get less than the reviewer, whose review settles every submission in one call.
async function call(account: Account, methodName: string, args: Record<string, unknown>, deposit: `${number}` = '0', tgas: `${number}` = '30') {
  const res = await account.callFunctionRaw({ contractId: CONTRACT, methodName, args, deposit: nearToYocto(deposit), gas: teraToGas(tgas) });
  const status = res.status as { SuccessValue?: string; Failure?: unknown };
  if (status.Failure) throw new Error(`${methodName} failed: ${JSON.stringify(status.Failure)}`);
  const raw = status.SuccessValue ? Buffer.from(status.SuccessValue, 'base64').toString() : '';
  return { hash: res.transaction.hash, value: raw ? JSON.parse(raw) : undefined };
}

const view = (methodName: string, args: Record<string, unknown>) => provider.callFunction({ contractId: CONTRACT, method: methodName, args });

/** Each AI submits from its own account, e.g. scout.hive-dev.testnet. Tops up its fuel if it runs low. */
async function agentAccount(agentId: string, name: string) {
  const account = await signer(`${agentId}.${CONTRACT}`);
  const agent = (await view('get_agent', { account_id: account.accountId })) as { fuel: string } | null;
  if (!agent || BigInt(agent.fuel) < nearToYocto('0.005')) await call(account, 'enroll', { name }, '0.02');
  return account;
}

/** Records a finished job on-chain. Scores are only sent for answers whose answer and grade were both verified. */
export async function recordJob(result: JobResult, onTx: (tx: ChainRecord['txs'][number]) => void = () => {}): Promise<ChainRecord> {
  const hive = await signer(CONTRACT);
  const escrowNear = ((result.budget / 100) * NEAR_PER_USD).toFixed(4) as `${number}`;
  const deadline = (Date.now() + 60 * 60 * 1000) * 1_000_000; // one hour from now, in nanoseconds
  const txs: ChainRecord['txs'] = [];
  const push = (tx: ChainRecord['txs'][number]) => { txs.push(tx); onTx(tx); };

  const posted = await call(hive, 'post_job', { brief_hash: sha256(result.redactedBrief), deadline }, escrowNear);
  const jobId = posted.value as number;
  push({ step: `Budget held in escrow (${escrowNear} NEAR)`, hash: posted.hash });

  const submitted = result.entries.filter((e) => e.answer);
  for (const entry of submitted) {
    const account = await agentAccount(entry.agent.id, entry.agent.name);
    const sent = await call(account, 'submit', {
      job_id: jobId,
      answer_hash: sha256(entry.answer),
      attestation_ref: sha256(`${entry.agent.model}:${entry.proof.signer}`),
    });
    push({ step: `${entry.agent.name} submitted its answer`, hash: sent.hash });
  }

  const scores = submitted.map((e) => ({
    agent: `${e.agent.id}.${CONTRACT}`,
    // An unverified answer or grade scores 0 on-chain, matching how the engine pays it.
    score: e.proof.verified && e.review.proof.verified ? e.review.score : 0,
  }));
  const reviewRef = sha256(JSON.stringify(submitted.map((e) => [e.agent.id, e.review.score, e.review.verdict, e.review.proof.signer])));
  const reviewed = await call(hive, 'review', { job_id: jobId, scores, review_ref: reviewRef }, '0', '100');
  push({ step: 'Reviewer posted the scores and the contract paid out', hash: reviewed.hash });

  return { jobId, escrowNear, txs };
}
