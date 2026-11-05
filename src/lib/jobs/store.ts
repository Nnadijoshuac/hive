// Finished jobs, kept so each one has a receipt page anyone can open.
// On Vercel they live in Vercel Blob (private, read only by this server); locally, as JSON files under
// .data/jobs (gitignored). Only the redacted task is kept: the original may hold the personal details the
// privacy filter removed, and a receipt is meant to be shared.
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { get, put } from '@vercel/blob';

import type { ChainRecord } from '@/lib/near/chain';
import type { JobResult } from '@/lib/swarm/engine';

/** `chain` is the on-chain record of the job; `chainError` says why it is missing, if it is. */
export type Receipt = Omit<JobResult, 'brief'> & { id: string; createdAt: string; chain?: ChainRecord; chainError?: string };

const ID = /^[a-f0-9]{16}$/;
const DIR = path.join(process.cwd(), '.data', 'jobs');
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const blobPath = (id: string) => `jobs/${id}.json`;

export async function saveJob(
  { brief: _original, ...result }: JobResult,
  onChain: Pick<Receipt, 'chain' | 'chainError'> = {},
): Promise<Receipt> {
  const receipt: Receipt = { ...result, ...onChain, id: randomBytes(8).toString('hex'), createdAt: new Date().toISOString() };
  const body = JSON.stringify(receipt, null, 2);
  if (useBlob()) {
    await put(blobPath(receipt.id), body, { access: 'private', addRandomSuffix: false, contentType: 'application/json' });
  } else {
    await mkdir(DIR, { recursive: true });
    await writeFile(path.join(DIR, `${receipt.id}.json`), body);
  }
  return receipt;
}

/** The receipt for `id`, or null if there is none. The id is checked first so it can't name another file. */
export async function getJob(id: string): Promise<Receipt | null> {
  if (!ID.test(id)) return null;
  try {
    if (useBlob()) {
      const found = await get(blobPath(id), { access: 'private' });
      return found ? (JSON.parse(await new Response(found.stream).text()) as Receipt) : null;
    }
    return JSON.parse(await readFile(path.join(DIR, `${id}.json`), 'utf8')) as Receipt;
  } catch {
    return null;
  }
}
