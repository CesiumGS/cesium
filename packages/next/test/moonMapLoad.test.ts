import { afterEach, describe, expect, it, vi } from "vitest";
import { composeInWorker } from "../src/io/moonMapLoad.ts";

/** A stand-in for the Moon map's worker: replies when told to. */
class FakeWorker {
  static last: FakeWorker | undefined;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror:
    ((event: { message: string; preventDefault(): void }) => void) | null =
    null;
  onmessageerror: (() => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  constructor() {
    FakeWorker.last = this;
  }
  postMessage(message: unknown): void {
    this.posted.push(message);
  }
  terminate(): void {
    this.terminated = true;
  }
  reply(data: unknown): void {
    this.onmessage?.({ data });
  }
}

const request = {
  url: "https://moon.test/tileset.json",
  headers: {},
  level: 2,
};

describe("composeInWorker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    FakeWorker.last = undefined;
  });

  it("gives the worker's map, warnings and mean, then stops the worker", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const image = { width: 2, height: 1 };
    const done = composeInWorker(request);
    const worker = FakeWorker.last!;
    expect(worker.posted).toEqual([request]);
    worker.reply({ ok: true, image, warnings: ["w"], mean: 0.12 });
    await expect(done).resolves.toEqual({ image, warnings: ["w"], mean: 0.12 });
    expect(worker.terminated).toBe(true);
  });

  it("rejects with the worker's error", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const done = composeInWorker(request);
    FakeWorker.last!.reply({ ok: false, error: "Moon map: bad tile" });
    await expect(done).rejects.toThrow("Moon map: bad tile");
    expect(FakeWorker.last!.terminated).toBe(true);
  });

  it("stops the worker and rejects when aborted", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const controller = new AbortController();
    const done = composeInWorker(request, { signal: controller.signal });
    controller.abort();
    await expect(done).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeWorker.last!.terminated).toBe(true);
  });

  it("starts no worker when already aborted", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const controller = new AbortController();
    controller.abort();
    await expect(
      composeInWorker(request, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeWorker.last).toBeUndefined();
  });

  it("stops a worker that never replies, after its timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", FakeWorker);
    const done = composeInWorker(request, { timeoutMs: 1000 });
    const caught = expect(done).rejects.toThrow(/timed out/);
    vi.advanceTimersByTime(1000);
    await caught;
    expect(FakeWorker.last!.terminated).toBe(true);
  });

  it("times out by default after two minutes", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", FakeWorker);
    const done = composeInWorker(request);
    const caught = expect(done).rejects.toThrow(/timed out/);
    vi.advanceTimersByTime(119_999);
    expect(FakeWorker.last!.terminated).toBe(false);
    vi.advanceTimersByTime(1);
    await caught;
    expect(FakeWorker.last!.terminated).toBe(true);
  });
});
