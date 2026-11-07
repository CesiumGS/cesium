/**
 * Downloads `url` to `path`, verified against `expected` (length and SHA-256):
 * no redirects, a timeout, a cap at `expected.bytes`, a `.partial` file that is
 * deleted on any failure and renamed only when verified.
 */
export function verifiedDownload(
  url: string,
  path: string,
  expected: { sha256: string; bytes: number },
  options?: { fetch?: typeof fetch; timeoutMs?: number },
): Promise<void>;
