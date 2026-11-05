'use client';

import { useState } from 'react';

/** Copies the current page's address, for sharing a receipt. */
export function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium hover:border-neutral-400"
    >
      {copied ? 'Link copied' : 'Copy link'}
    </button>
  );
}
