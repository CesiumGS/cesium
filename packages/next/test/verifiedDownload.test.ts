import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifiedDownload } from "../scripts/verifiedDownload.mjs";

const URL_ = "https://cdn.proj.org/x.tif";
const GOOD = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
const hash = (b: Uint8Array): string =>
  createHash("sha256").update(b).digest("hex");
const expected = { sha256: hash(GOOD), bytes: GOOD.length };

let dir: string;
let path: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "verified-download-"));
  path = join(dir, "x.tif");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A body delivered in two chunks. */
const respond = (bytes: Uint8Array, init?: ResponseInit): Response => {
  const half = Math.ceil(bytes.length / 2);
  return new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(bytes.slice(0, half));
        c.enqueue(bytes.slice(half));
        c.close();
      },
    }),
    init,
  );
};
const stub = (bytes: Uint8Array, init?: ResponseInit) =>
  (async () => respond(bytes, init)) as unknown as typeof fetch;

describe("verifiedDownload", () => {
  it("stores good bytes and leaves no .partial", async () => {
    await verifiedDownload(URL_, path, expected, { fetch: stub(GOOD) });
    expect(new Uint8Array(readFileSync(path))).toEqual(GOOD);
    expect(readdirSync(dir)).toEqual(["x.tif"]);
  });

  it("fetches with redirect: error and a timeout signal", async () => {
    let seen: RequestInit | undefined;
    const fetchStub = (async (_u: string, init?: RequestInit) => {
      seen = init;
      return respond(GOOD);
    }) as unknown as typeof fetch;
    await verifiedDownload(URL_, path, expected, { fetch: fetchStub });
    expect(seen?.redirect).toBe("error");
    expect(seen?.signal).toBeInstanceOf(AbortSignal);
  });

  it("refuses a wrong hash, naming the file and both hashes", async () => {
    const other = new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9]);
    const error = await verifiedDownload(URL_, path, expected, {
      fetch: stub(other),
    }).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain("x.tif");
    expect(message).toContain(expected.sha256);
    expect(message).toContain(hash(other));
    expect(existsSync(path)).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("refuses a short body, naming the sizes", async () => {
    const short = GOOD.slice(0, 5);
    await expect(
      verifiedDownload(URL_, path, expected, { fetch: stub(short) }),
    ).rejects.toThrow(/x\.tif.*8.*5|x\.tif.*5.*8/);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("aborts a body past the byte count", async () => {
    let cancelled = false;
    const big = (async () =>
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(6));
            c.enqueue(new Uint8Array(6));
          },
          cancel() {
            cancelled = true;
          },
        }),
      )) as unknown as typeof fetch;
    await expect(
      verifiedDownload(URL_, path, expected, { fetch: big }),
    ).rejects.toThrow(/x\.tif.*more than 8 bytes/);
    expect(cancelled).toBe(true);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("does not follow a redirect", async () => {
    // fetch with redirect: "error" rejects on a 3xx; the stub does the same.
    const redirecting = (async (_u: string, init?: RequestInit) => {
      if (init?.redirect === "error") {
        throw new TypeError("fetch failed: unexpected redirect");
      }
      return respond(GOOD);
    }) as unknown as typeof fetch;
    await expect(
      verifiedDownload(URL_, path, expected, { fetch: redirecting }),
    ).rejects.toThrow(/x\.tif/);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("refuses a non-200 answer", async () => {
    await expect(
      verifiedDownload(URL_, path, expected, {
        fetch: stub(GOOD, { status: 404 }),
      }),
    ).rejects.toThrow(/x\.tif.*404/);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("leaves an existing good file when a refresh is refused", async () => {
    await verifiedDownload(URL_, path, expected, { fetch: stub(GOOD) });
    await expect(
      verifiedDownload(URL_, path, expected, {
        fetch: stub(new Uint8Array(8)),
      }),
    ).rejects.toThrow();
    expect(new Uint8Array(readFileSync(path))).toEqual(GOOD);
  });
});
