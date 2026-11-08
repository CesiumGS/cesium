// The frames explorer's frame data (examples/frames-explorer/frameData.ts,
// plan 5a Task 21): its `Frames` are the catalog's tree, and its progress
// is the catalog's `progress` events, over a stubbed store.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFrameData } from "../examples/frames-explorer/frameData.ts";
import { LoadingModel } from "../examples/frames-explorer/loading.ts";
import { pack } from "./syntheticPacks.ts";

const BASE = "/frames-data/";
const MJD_UNIX_EPOCH = 40587;

/** Daily EOP rows from `startMjd`, `days` of them (as test/loadFrameData.test.ts). */
function eopText(startMjd: number, days: number): string {
  const rows = ["DATE,MJD,X,Y,UT1-UTC,LOD,DPSI,DEPS,DX,DY,DAT,DATA_TYPE"];
  for (let i = 0; i < days; i++) {
    const mjd = startMjd + i;
    const date = new Date((mjd - MJD_UNIX_EPOCH) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    rows.push(`${date},${mjd},0.1,0.3,0.6,0.5,0,0,0.0001,-0.0002,32,O`);
  }
  return `${rows.join("\n")}\n`;
}

/** A leap-second excerpt from 1999 on, expiring after the built-in table. */
const LEAP_TEXT = `#  File expires on 28 December 2030
#    MJD        Date        TAI-UTC (s)
 51179.0    1  1 1999       32
 53736.0    1  1 2006       33
 54832.0    1  1 2009       34
 56109.0    1  7 2012       35
 57204.0    1  7 2015       36
 57754.0    1  1 2017       37
`;

const bytesOf = (data: string | Uint8Array): ArrayBuffer => {
  const u8 =
    typeof data === "string" ? new TextEncoder().encode(data) : data.slice();
  return u8.buffer as ArrayBuffer;
};

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

const ROLES: Record<string, string> = {
  "planets.pack": "planets",
  "moon.pack": "moon",
  "EOP-All.csv": "eop",
  "Leap_Second.dat": "leapSeconds",
};
const FILES: Record<string, ArrayBuffer> = {
  "planets.pack": bytesOf(
    pack("SPK", ["sun", "emb", "moon"], "ICRF", "position"),
  ),
  "moon.pack": bytesOf(pack("PCK", ["moonPa"], "MOON_PA", "euler")),
  // 1999-12-22 to 2000-01-11, around the synthetic packs' span.
  "EOP-All.csv": bytesOf(eopText(51534, 21)),
  // Expires after the built-in table, so the catalog adopts it.
  "Leap_Second.dat": bytesOf(LEAP_TEXT),
};

let requested: string[] = [];
let missing = new Set<string>();

beforeEach(async () => {
  requested = [];
  missing = new Set();
  const manifest = {
    files: await Promise.all(
      Object.entries(FILES).map(async ([file, bytes]) => ({
        file,
        role: ROLES[file]!,
        sha256: await sha256(bytes),
      })),
    ),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      requested.push(input);
      const name = input.slice(BASE.length);
      if (name === "manifest.json") {
        return new Response(JSON.stringify(manifest));
      }
      const bytes = missing.has(name) ? undefined : FILES[name];
      return bytes
        ? new Response(bytes.slice(0))
        : new Response("not found", { status: 404 });
    }),
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup() {
  const catalog = createFrameCatalog({ data: BASE });
  const viewer = { frames: catalog, setFrameData: vi.fn() };
  const loading = new LoadingModel();
  const ready = vi.fn();
  const failed = vi.fn();
  const data = createFrameData({
    viewer: viewer as never,
    loading,
    signal: new AbortController().signal,
    ready,
    failed,
  });
  return { catalog, viewer, loading, ready, failed, data };
}

describe("the explorer's frame data", () => {
  it("resolves its Frames from the Viewer's catalog and reports progress", async () => {
    const { catalog, loading, ready, failed, data } = setup();
    const received: number[] = [];
    loading.subscribe(() => {
      const item = loading.get("frames");
      if (item.state === "fetching" && item.received !== undefined) {
        received.push(item.received);
      }
    });
    await data.load();
    expect(failed).not.toHaveBeenCalled();
    expect(ready).toHaveBeenCalledTimes(1);
    // The catalog's own reference frames, not a second tree.
    expect(data.frames()!.itrf).toBe(catalog.get("ITRF"));
    expect(data.frames()!.gcrf).toBe(catalog.get("GCRF"));
    expect(received.length).toBeGreaterThan(0);
    expect(received.at(-1)).toBeGreaterThan(0);
    expect(loading.get("frames").state).toBe("ready");
    // The manifest is read for the report.
    expect(data.manifest()!.files.map((f) => f.file)).toContain("moon.pack");
  });

  it("reports a failed load, and a reload asks a new catalog", async () => {
    const { viewer, loading, ready, failed, data } = setup();
    missing.add("planets.pack");
    await data.load();
    expect(ready).not.toHaveBeenCalled();
    expect(failed).toHaveBeenCalledTimes(1);
    expect(["error", "missing"]).toContain(loading.get("frames").state);
    expect(data.frames()).toBeUndefined();
    // The failed catalog stays failed: the reload swaps it.
    const fresh = createFrameCatalog({ data: BASE });
    viewer.setFrameData.mockImplementation(() => {
      viewer.frames = fresh;
    });
    missing.clear();
    await data.load();
    expect(viewer.setFrameData).toHaveBeenCalledWith(undefined);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(data.frames()!.itrf).toBe(fresh.get("ITRF"));
  });
});
