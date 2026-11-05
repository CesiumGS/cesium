import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compileSlang } from "../src/scene/slang.ts";
import {
  memorySlangCache,
  slangCacheKey,
  type CompiledSlangEntry,
  type SlangCache,
} from "../src/scene/slangCache.ts";

/**
 * Browser-compiled Slang's cache (slangCache.ts): a hit doesn't start the
 * compiler's worker; a miss compiles and keeps what the compiler made.
 * The worker is a stand-in that answers every compile with fixed WGSL.
 */

const SHADER = `import cesium;
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {}`;

let compiles = 0;
class FakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  postMessage(message: { id: number }) {
    compiles++;
    queueMicrotask(() =>
      this.onmessage?.({ data: { id: message.id, wgsl: "// compiled" } }),
    );
  }
}

beforeEach(() => {
  compiles = 0;
  (globalThis as { Worker?: unknown }).Worker = FakeWorker;
});
afterEach(() => {
  delete (globalThis as { Worker?: unknown }).Worker;
});

/** A cache that records the keys asked for. */
function recording(inner: SlangCache = memorySlangCache()) {
  const keys: string[] = [];
  return {
    keys,
    get: (key: string) => {
      keys.push(key);
      return inner.get(key);
    },
    put: (key: string, entry: CompiledSlangEntry) => inner.put(key, entry),
  };
}

describe("Slang compile cache", () => {
  it("keys a compile by a digest of all its inputs, in order", async () => {
    const a = await slangCacheKey(["2026.21", "url", "cesium", "user"]);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await slangCacheKey(["2026.21", "url", "cesium", "user"])).toBe(a);
    expect(await slangCacheKey(["2026.22", "url", "cesium", "user"])).not.toBe(
      a,
    );
    expect(await slangCacheKey(["2026.21", "url", "user", "cesium"])).not.toBe(
      a,
    );
  });

  it("compiles once, then serves the compile without the compiler", async () => {
    const cache = memorySlangCache();
    const first = await compileSlang(
      SHADER,
      "https://example.test/slang.js",
      {},
      cache,
    );
    expect(compiles).toBe(1);
    expect(first.wgsl).toBe("// compiled");
    expect([...cache.entries.values()]).toEqual([
      { wgsl: "// compiled", controls: [], declared: {} },
    ]);
    const second = await compileSlang(
      SHADER,
      "https://example.test/slang.js",
      {},
      cache,
    );
    expect(compiles, "no compile on a hit").toBe(1);
    expect(second).toEqual(first);
  });

  it("keeps the shader's own uniforms; the given ones' values are the caller's", async () => {
    const cache = memorySlangCache();
    const url = "https://example.test/slang.js";
    const given = (value: number) => ({
      uniforms: { amount: { type: "f32" as const, value } },
    });
    await compileSlang(SHADER, url, given(1), cache);
    // As if the shader had declared `glow` itself (found by reflection).
    const [key] = [...cache.entries.keys()];
    cache.entries.set(key!, {
      wgsl: "// compiled",
      controls: [],
      declared: { glow: { type: "f32", value: 0.5 } },
    });
    // Another value for a given uniform is the same compile: a hit.
    const { uniforms } = await compileSlang(SHADER, url, given(3), cache);
    expect(compiles).toBe(1);
    expect(uniforms).toEqual({
      amount: { type: "f32", value: 3 },
      glow: { type: "f32", value: 0.5 },
    });
  });

  it("compiles again for other declarations, sources or compilers", async () => {
    const cache = recording();
    await compileSlang(SHADER, "https://example.test/slang.js", {}, cache);
    await compileSlang(
      SHADER,
      "https://example.test/slang.js",
      { metadata: { t: "f32" } },
      cache,
    );
    await compileSlang(
      `${SHADER}\n`,
      "https://example.test/slang.js",
      {},
      cache,
    );
    await compileSlang(
      SHADER,
      "https://example.test/other/slang.js",
      {},
      cache,
    );
    expect(new Set(cache.keys).size).toBe(4);
    expect(compiles).toBe(4);
  });

  it("compiles as without a cache when the cache fails", async () => {
    const broken: SlangCache = {
      get: () => Promise.reject(new Error("quota")),
      put: () => Promise.reject(new Error("quota")),
    };
    const { wgsl } = await compileSlang(
      SHADER,
      "https://example.test/slang.js",
      {},
      broken,
    );
    expect(wgsl).toBe("// compiled");
    expect(compiles).toBe(1);
  });

  it("can be turned off", async () => {
    await compileSlang(SHADER, "https://example.test/slang.js", {}, false);
    await compileSlang(SHADER, "https://example.test/slang.js", {}, false);
    expect(compiles).toBe(2);
  });
});
