// Shared memory where the page allows it (plan §13.42): kept terrain
// heights in a SharedArrayBuffer under cross-origin isolation, transferred
// otherwise; the job system reports which.
import { afterEach, describe, expect, it, vi } from "vitest";
import { upsampleTerrainTile } from "../src/globe/quantizedMesh.ts";
import { Jobs } from "../src/io/Jobs.ts";
import { jobMemory, shareArrays } from "../src/io/sharedMemory.ts";
import { gridTile } from "./terrainRayFixtures.ts";

afterEach(() => vi.unstubAllGlobals());

const RECT = { west: 0.3, south: 0.2, east: 0.30001, north: 0.20001 };
const SW = { west: 0.3, south: 0.2, east: 0.300005, north: 0.200005 };

describe("shared memory", () => {
  it("copies arrays into one shared buffer, types, lengths and values kept", () => {
    const a = Uint16Array.of(1, 2, 3);
    const b = Uint32Array.of(7, 8);
    const c = Uint8Array.of(9);
    const [sa, sb, sc] = shareArrays([a, b, c] as const);
    expect(sa.buffer).toBeInstanceOf(SharedArrayBuffer);
    expect(sb.buffer).toBe(sa.buffer);
    expect(sc.buffer).toBe(sa.buffer);
    expect([...sa]).toEqual([1, 2, 3]);
    expect([...sb]).toEqual([7, 8]);
    expect([...sc]).toEqual([9]);
    expect(sb.byteOffset % 4).toBe(0);
  });

  it("is the job system's mode only under cross-origin isolation", () => {
    const port = { size: 1, post: () => {} };
    vi.stubGlobal("crossOriginIsolated", false);
    expect(jobMemory()).toBe("transfer");
    expect(new Jobs(port).stats.memory).toBe("transfer");
    vi.stubGlobal("crossOriginIsolated", true);
    expect(jobMemory()).toBe("shared");
    expect(new Jobs(port).stats.memory).toBe("shared");
  });

  it("keeps a tile's heights shared when isolated, out of the transfer list", () => {
    const parent = gridTile(
      RECT,
      9,
      (lon, lat) => 100 + 1e5 * (lon + lat),
    ).heights;
    vi.stubGlobal("crossOriginIsolated", false);
    const plain = upsampleTerrainTile(parent, RECT, SW, 0);
    vi.stubGlobal("crossOriginIsolated", true);
    const shared = upsampleTerrainTile(parent, RECT, SW, 0);
    const p = plain.info.heights!;
    const s = shared.info.heights!;
    expect(p.u.buffer).toBeInstanceOf(ArrayBuffer);
    expect(plain.transfer).toContain(p.u.buffer);
    expect(s.u.buffer).toBeInstanceOf(SharedArrayBuffer);
    expect(s.triangles.buffer).toBe(s.u.buffer);
    expect(shared.transfer).not.toContain(s.u.buffer);
    // The same surface either way.
    for (const key of ["u", "v", "h", "triangles"] as const) {
      expect([...s[key]]).toEqual([...p[key]]);
    }
    expect(s.minimumHeight).toBe(p.minimumHeight);
    // A structured clone shares it: no copy on the way to a worker.
    const cloned = structuredClone(s);
    cloned.h[0] = 12345;
    expect(s.h[0]).toBe(12345);
  });
});
