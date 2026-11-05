/** Cents -> "$5.05". */
export const formatUsd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Models sometimes answer in Markdown; the console shows plain text, so drop the formatting marks. */
export const plainText = (s: string) => s.replace(/\*\*|__|^#+\s*/gm, '');
