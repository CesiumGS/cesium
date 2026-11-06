// readWithProgress (src/io/readWithProgress.ts): a body read as a stream with
// its bytes reported (frames explorer R9), held once when its length is known.
import { describe, expect, it } from "vitest";
import { readWithProgress } from "../src/io/readWithProgress.ts";

const bytes = (n: number) => Uint8Array.from({ length: n }, (_, i) => i % 251);

/** A response whose body arrives in `chunk`-byte pieces, stating `length` (or none). */
function response(body: Uint8Array, chunk: number, length?: number): Response {
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= body.length) {
        controller.close();
        return;
      }
      controller.enqueue(body.slice(offset, offset + chunk));
      offset += chunk;
    },
  });
  return new Response(stream, {
    headers: length === undefined ? {} : { "Content-Length": String(length) },
  });
}

type Call = [received: number, total: number | undefined];

describe("readWithProgress", () => {
  it("fills one buffer of the stated length and returns it whole", async () => {
    const body = bytes(10_000);
    const calls: Call[] = [];
    const out = await readWithProgress(response(body, 1024, 10_000), (...c) =>
      calls.push(c),
    );
    expect(new Uint8Array(out)).toEqual(body);
    expect(out.byteLength).toBe(10_000);
    expect(calls[0]).toEqual([0, 10_000]);
    expect(calls.at(-1)).toEqual([10_000, 10_000]);
    expect(calls).toHaveLength(1 + Math.ceil(10_000 / 1024));
  });

  it("keeps every byte of a body that outgrows its Content-Length, and drops the total", async () => {
    const body = bytes(5000);
    const calls: Call[] = [];
    const out = await readWithProgress(response(body, 1000, 2500), (...c) =>
      calls.push(c),
    );
    expect(new Uint8Array(out)).toEqual(body);
    expect(calls.slice(0, 3)).toEqual([
      [0, 2500],
      [1000, 2500],
      [2000, 2500],
    ]);
    expect(calls.slice(3)).toEqual([
      [3000, undefined],
      [4000, undefined],
      [5000, undefined],
    ]);
  });

  it("cuts a body that falls short of its Content-Length to what arrived", async () => {
    const body = bytes(3000);
    const out = await readWithProgress(response(body, 1000, 8000), () => {});
    expect(out.byteLength).toBe(3000);
    expect(new Uint8Array(out)).toEqual(body);
  });

  it("joins the chunks of a body with no Content-Length", async () => {
    const body = bytes(4321);
    const calls: Call[] = [];
    const out = await readWithProgress(response(body, 1000), (...c) =>
      calls.push(c),
    );
    expect(new Uint8Array(out)).toEqual(body);
    expect(calls.every((c) => c[1] === undefined)).toBe(true);
    expect(calls.at(-1)![0]).toBe(4321);
  });

  it("is arrayBuffer() without a callback", async () => {
    const body = bytes(100);
    const out = await readWithProgress(response(body, 7, 100));
    expect(new Uint8Array(out)).toEqual(body);
  });
});
