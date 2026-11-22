// The one verified fetcher: setup's grid and catalog downloads and the dev
// server's grid cache both use it. Nothing it fetches is kept unless it has
// exactly the expected length and SHA-256.
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  fstatSync,
  mkdirSync,
  openSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { basename, dirname } from "node:path";

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Downloads `url` to `path`, verified against `expected`.
 *
 * Redirects are not followed (a mirror answering with one is an error), and
 * the request times out after `timeoutMs` (default 120,000). The body is
 * written to its own `<path>.<random>.partial` (two calls for one path never
 * share a file; the last verified writer wins) and abandoned as soon as it passes
 * `expected.bytes`; a wrong length, a wrong
 * stored size or a wrong hash deletes the partial file and
 * throws, naming the file and both hashes (or sizes). Only a verified file is
 * renamed to `path`, so an existing file at `path` survives a refused refresh.
 *
 * @param {string} url
 * @param {string} path
 * @param {{ sha256: string; bytes: number }} expected
 * @param {{ fetch?: typeof fetch; timeoutMs?: number }} [options]
 * @returns {Promise<void>}
 */
export async function verifiedDownload(url, path, expected, options = {}) {
  const { fetch: fetcher = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const name = basename(path);
  // Its own partial file per call, so concurrent calls never share one.
  const partial = `${path}.${randomUUID()}.partial`;
  let fd;
  try {
    const response = await fetcher(url, {
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status !== 200 || !response.body) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`${name}: HTTP ${response.status} from ${url}`);
    }
    mkdirSync(dirname(path), { recursive: true });
    fd = openSync(partial, "wx");
    const hash = createHash("sha256");
    const reader = response.body.getReader();
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      received += value.byteLength;
      if (received > expected.bytes) {
        await reader.cancel().catch(() => {});
        throw new Error(
          `${name}: more than ${expected.bytes} bytes from ${url}; refused`,
        );
      }
      hash.update(value);
      for (let at = 0; at < value.byteLength;) {
        const n = writeSync(fd, value, at, value.byteLength - at);
        if (n <= 0) {
          throw new Error(`${name}: write to ${partial} stalled; refused`);
        }
        at += n;
      }
    }
    if (received !== expected.bytes) {
      throw new Error(
        `${name}: ${received} bytes, expected ${expected.bytes}; refused`,
      );
    }
    const actual = hash.digest("hex");
    if (actual !== expected.sha256) {
      throw new Error(
        `${name}: SHA-256 mismatch (expected ${expected.sha256}, got ${actual}); refused`,
      );
    }
    // The stored file, not just the stream, must be the verified length.
    const stored = fstatSync(fd).size;
    if (stored !== expected.bytes) {
      throw new Error(
        `${name}: ${stored} bytes stored, expected ${expected.bytes}; refused`,
      );
    }
    const done = fd;
    fd = undefined;
    closeSync(done);
    renameSync(partial, path);
  } catch (error) {
    if (fd !== undefined) {
      closeSync(fd);
    }
    rmSync(partial, { force: true });
    throw error instanceof Error && error.message.startsWith(`${name}:`)
      ? error
      : new Error(`${name}: ${url} failed: ${String(error)}`, {
          cause: error,
        });
  }
}
