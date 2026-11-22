/** `&alpha=`'s value clamped to [0, 1]; undefined when absent or not a number. */
export function parseAlpha(value: string | null): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : undefined;
}
