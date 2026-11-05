// Finished jobs, kept so each one has a receipt page anyone can open.
// Stored as one JSON file per job under .data/jobs (gitignored). Only the redacted task is kept: the
// original may hold the personal details the privacy filter removed, and a receipt is meant to be shared.
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { JobResult } from '@/lib/swarm/engine';

export type Receipt = Omit<JobResult, 'brief'> & { id: string; createdAt: string };

const DIR = path.join(process.cwd(), '.data', 'jobs');
const ID = /^[a-f0-9]{16}$/;

export async function saveJob({ brief: _original, ...result }: JobResult): Promise<Receipt> {
  const receipt: Receipt = { ...result, id: randomBytes(8).toString('hex'), createdAt: new Date().toISOString() };
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${receipt.id}.json`), JSON.stringify(receipt, null, 2));
  return receipt;
}

/** The receipt for `id`, or null if there is none. The id is checked first so it can't name another file. */
export async function getJob(id: string): Promise<Receipt | null> {
  if (!ID.test(id)) return null;
  try {
    return JSON.parse(await readFile(path.join(DIR, `${id}.json`), 'utf8')) as Receipt;
  } catch {
    return null;
  }
}
