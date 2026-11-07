// Orion's OEM on the page's own thread (examples/frames-explorer/orionTrack.ts,
// orionLayer.ts; Task 4c re-review, Important 1): a load that fails is never
// silent (R9). A SHA-256 mismatch against the manifest, or no crypto.subtle
// to check it with (an http page that isn't localhost), says so in the
// manifest's own words, in the legend's line for Orion and the console, and
// the dot stays off; while the OEM loads, the legend says that too.
import { afterEach, describe, expect, it, vi } from "vitest";
import { legendRows } from "../examples/frames-explorer/panel/legendRows.ts";
import type { OverlayView } from "../examples/frames-explorer/panel/model.ts";
import { createOrionLayer } from "../examples/frames-explorer/orionLayer.ts";
import type { OverlayState } from "../examples/frames-explorer/overlayConfig.ts";
import type { PageCore } from "../examples/frames-explorer/page.ts";
import {
  ORION_OEM,
  loadOrionTrack,
  type OrionTrack,
} from "../examples/frames-explorer/orionTrack.ts";
import type { OverlayGeometry } from "../examples/frames-explorer/protocol.ts";
import type { Frames } from "../src/frames/frames.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const oem = () =>
  vi.stubGlobal(
    "fetch",
    async () => new Response(new TextEncoder().encode("CCSDS_OEM_VERS = 2.0")),
  );
const manifest = {
  files: [{ file: ORION_OEM, sha256: "0".repeat(64) }],
};
const signal = new AbortController().signal;

describe("loadOrionTrack's checks", () => {
  it("refuses a file that doesn't match the manifest's SHA-256, in the manifest's own words", async () => {
    oem();
    await expect(
      loadOrionTrack({} as Frames, manifest, signal),
    ).rejects.toThrow(
      /does not match its SHA-256 in manifest\.json \(the file is corrupt or changed\); re-run `npm run setup`/,
    );
  });

  it("says why it can't check it where the browser gives no crypto.subtle", async () => {
    oem();
    vi.stubGlobal("crypto", {});
    await expect(
      loadOrionTrack({} as Frames, manifest, signal),
    ).rejects.toThrow(
      /no crypto\.subtle .* open the page over https or on localhost/,
    );
  });
});

/** Orion's layer over a fake page whose OEM load is `load`. */
function layer(load: () => Promise<OrionTrack>) {
  let loaded: (() => void) | undefined;
  const geometry: OverlayGeometry = {
    kind: "trajectoryPath",
    layers: [{ chunks: [] }] as never,
    ms: 0,
  };
  const core = {
    viewer: {
      clock: { time: Date.UTC(2026, 3, 6, 23), rate: 1, mode: "paused" },
    },
    globe: {
      setOverlay: () => {},
      placeOverlay: () => {},
      shownAt: () => undefined,
    },
    loading: {
      get: () => ({ state: "ready" }),
      subscribe: (fn: () => void) => {
        loaded = fn;
        return () => {};
      },
    },
    client: {
      overlay: () => Promise.resolve(geometry),
      trajectoryInfo: () => new Promise(() => {}),
    },
    frames: () => ({}) as Frames,
    instantNow: () => ({ tdb: () => 0 }),
    invalidate: () => {},
    disposed: () => false,
    scrub: (t: string) => t,
  } as unknown as PageCore;
  const state: OverlayState = { on: true, state: "drawn", token: 0 };
  const loadTrack = vi.fn(load);
  const orion = createOrionLayer({
    core,
    state,
    refreshCallouts: () => {},
    refreshTree: () => {},
    drawn: () => {},
    loadTrack,
  });
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };
  return { orion, loadTrack, settle, changed: () => loaded?.() };
}

describe("Orion's dot when its OEM doesn't load on the page (R9)", () => {
  it("says it is loading while the OEM loads", async () => {
    const l = layer(() => new Promise(() => {}));
    l.changed();
    await l.settle();
    expect(l.orion.accuracy().note).toEqual({
      text: "Orion's dot: loading its OEM on this page…",
      attention: false,
    });
  });

  it("says why it can't show, in the legend and the console, and draws no dot", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const why = `${ORION_OEM} does not match its SHA-256 in manifest.json (the file is corrupt or changed); re-run \`npm run setup\``;
    const l = layer(() => Promise.reject(new Error(why)));
    l.changed();
    await l.settle();
    const note = l.orion.accuracy().note;
    expect(note).toEqual({
      text: `Orion's dot can't show: ${why}`,
      attention: true,
    });
    expect(warn).toHaveBeenCalledWith(`Orion's dot can't show: ${why}`);
    expect(l.orion.markerPoint()).toBeUndefined();
    // The legend's row for Orion carries the line.
    const view = {
      id: "orion",
      label: "Orion's path",
      on: true,
      state: "drawn",
      ...l.orion.accuracy(),
    } as OverlayView;
    expect(legendRows([view])[0]!.note).toEqual(note);
  });

  it("doesn't fetch again on every loading change after a failure, only when the path is drawn again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const l = layer(() => Promise.reject(new Error("offline")));
    l.changed();
    await l.settle();
    l.changed();
    l.changed();
    await l.settle();
    expect(l.loadTrack).toHaveBeenCalledTimes(1);
    l.orion.draw();
    await l.settle();
    expect(l.loadTrack).toHaveBeenCalledTimes(2);
  });
});
