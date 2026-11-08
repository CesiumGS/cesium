// The eviction order Tileset3D keeps incrementally (src/streaming/
// TouchOrder.ts) against the sort it replaced: every loaded tile, filtered
// to those not touched this frame, sorted by touch frame (a stable sort over
// the loaded set's insertion order). Scripted selections (a sliding window,
// jumps, revisits, late loads and unloads outside eviction) must evict the
// same tiles in the same order, and leave the same tiles resident.
import { describe, expect, it } from "vitest";
import { TouchOrder, type TouchNode } from "../src/streaming/TouchOrder.ts";

class Node implements TouchNode<Node> {
  touchedFrame = -1;
  touchPrev: Node | undefined = undefined;
  touchNext: Node | undefined = undefined;
  touchSeq = 0;
  constructor(readonly id: number) {}
}

/** The old policy: what `Tileset3D.evict` sorted each frame. */
function oldCandidates(loaded: Set<Node>, frame: number): Node[] {
  return [...loaded]
    .filter((t) => t.touchedFrame < frame)
    .sort((a, b) => a.touchedFrame - b.touchedFrame);
}

/** A small deterministic generator (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Script {
  /** Tiles a frame touches (its selection). */
  touched(frame: number): number[];
  /** Tiles that finish loading this frame (touched or not). */
  loads(frame: number): number[];
  /** How many tiles eviction takes this frame. */
  evictions(frame: number): number;
  /** Tiles unloaded outside eviction (a source dropping them). */
  drops?(frame: number): number[];
}

/**
 * Runs a script through both: the old sort over a loaded set, and the
 * incremental order. Checks the full candidate order every frame.
 */
function replay(script: Script, frames: number, tiles: number) {
  const nodes = Array.from({ length: tiles }, (_, i) => new Node(i));
  const loaded = new Set<Node>();
  const order = new TouchOrder<Node>();
  const evicted: number[] = [];
  for (let frame = 1; frame <= frames; frame++) {
    for (const i of script.touched(frame)) {
      order.touch(nodes[i]!, frame);
    }
    for (const i of script.loads(frame)) {
      const node = nodes[i]!;
      if (!loaded.has(node)) {
        loaded.add(node);
        order.add(node);
      }
    }
    order.seal(frame);
    const expected = oldCandidates(loaded, frame);
    const actual = [...order.coldest(frame)];
    expect(actual.map((n) => n.id)).toEqual(expected.map((n) => n.id));
    // Evict as Tileset3D does: unload while walking.
    let count = script.evictions(frame);
    for (const node of order.coldest(frame)) {
      if (count-- <= 0) {
        break;
      }
      order.remove(node);
      loaded.delete(node);
      evicted.push(node.id);
    }
    for (const i of script.drops?.(frame) ?? []) {
      order.remove(nodes[i]!);
      loaded.delete(nodes[i]!);
    }
    expect(order.size).toBe(loaded.size);
  }
  return { loaded, evicted };
}

describe("TouchOrder: the same tiles as the old sort", () => {
  it("a camera flying along a row of tiles, then back", () => {
    // A window of 40 tiles slides 3 a frame for 80 frames, then flies back.
    // Tiles load the frame they're first touched; 8 are evicted a frame.
    const at = (frame: number) =>
      frame <= 80 ? frame * 3 : Math.max(0, (160 - frame) * 3);
    const { loaded, evicted } = replay(
      {
        touched: (f) => Array.from({ length: 40 }, (_, k) => at(f) + k),
        loads: (f) => Array.from({ length: 40 }, (_, k) => at(f) + k),
        evictions: () => 8,
      },
      160,
      300,
    );
    expect(evicted.length).toBeGreaterThan(100);
    // Eviction outpaces loading: only the last selection stays.
    expect([...loaded].map((n) => n.id).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 40 }, (_, k) => k),
    );
  });

  it("ties in a frame keep load order, not touch order", () => {
    // Every frame touches the same tiles in reverse, so touch order and load
    // order disagree; eviction of a partial tie group must follow loads.
    const { evicted } = replay(
      {
        touched: (f) =>
          f % 5 === 0 ? [] : Array.from({ length: 20 }, (_, k) => 19 - k),
        loads: (f) => (f === 1 ? Array.from({ length: 20 }, (_, k) => k) : []),
        evictions: (f) => (f % 5 === 0 ? 3 : 0),
      },
      30,
      20,
    );
    // Frame 5: the oldest touches (frame 4) are all ties; the first three
    // loaded go first.
    expect(evicted.slice(0, 3)).toEqual([0, 1, 2]);
  });

  it("random selections, late loads and drops", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const next = random(seed);
      const pick = (n: number, of: number) =>
        Array.from({ length: n }, () => Math.floor(next() * of));
      let center = 200;
      replay(
        {
          touched: () => {
            // Mostly a drift, sometimes a jump.
            center =
              next() < 0.05
                ? Math.floor(next() * 400)
                : Math.min(
                    399,
                    Math.max(0, center + Math.floor(next() * 7) - 3),
                  );
            return [
              ...Array.from({ length: 30 }, (_, k) => (center + k) % 400),
              ...pick(5, 400),
            ];
          },
          // Some arrive after the camera moved on (requested earlier), some
          // were never touched (prefetch).
          loads: () => pick(12, 400),
          evictions: () => Math.floor(next() * 10),
          drops: () => (next() < 0.1 ? pick(2, 400) : []),
        },
        300,
        400,
      );
    }
  });
});

describe("TouchOrder: per-frame cost", () => {
  /**
   * `resident` loaded tiles, then frames that each touch a selection of
   * 200 (recently loaded tiles, the same ones whatever the resident count),
   * load 8 and evict 8: the links followed a frame.
   */
  function stepsPerFrame(resident: number): number {
    const order = new TouchOrder<Node>();
    const nodes: Node[] = [];
    let frame = 1;
    for (let i = 0; i < resident; i++) {
      const node = new Node(i);
      order.touch(node, frame);
      order.add(node);
      nodes.push(node);
      if (i % 200 === 199) {
        order.seal(frame++);
      }
    }
    order.seal(frame);
    const before = order.steps;
    const frames = 100;
    for (let f = 0; f < frames; f++) {
      frame++;
      const start = nodes.length - 400 + ((f * 7) % 200);
      for (let k = 0; k < 200; k++) {
        order.touch(nodes[start + k]!, frame);
      }
      for (let k = 0; k < 8; k++) {
        const node = new Node(nodes.length);
        order.touch(node, frame);
        order.add(node);
        nodes.push(node);
      }
      order.seal(frame);
      let count = 8;
      for (const node of order.coldest(frame)) {
        if (count-- <= 0) {
          break;
        }
        order.remove(node);
      }
    }
    return (order.steps - before) / frames;
  }

  it("doesn't grow with the resident count", () => {
    const small = stepsPerFrame(1_000);
    const large = stepsPerFrame(30_000);
    // About the selection (200, sealed) plus the evicted (8, walked).
    expect(small).toBeLessThan(300);
    expect(large).toBe(small);
  });

  it("is far cheaper than sorting every resident tile", () => {
    // Work counted, not timed (the old sort took 5.5 ms a frame at 30,000
    // tiles): the old policy visits every loaded tile and sorts the
    // candidates; the order follows links and sorts one selection.
    const resident = 30_000;
    const selection = 200;
    const nodes = Array.from({ length: resident }, (_, i) => new Node(i));
    const loaded = new Set<Node>();
    const order = new TouchOrder<Node>();
    // Loaded in one order, last touched in a scattered one, as in a flight
    // that revisits places.
    let seed = 1;
    const touchedAt = nodes.map(() => {
      seed = (seed * 48271) % 2147483647;
      return 1 + (seed % 150);
    });
    for (const n of nodes) {
      loaded.add(n);
    }
    const byFrame = [...nodes].sort(
      (a, b) => touchedAt[a.id]! - touchedAt[b.id]!,
    );
    let sealedAt = 0;
    for (const n of byFrame) {
      const f = touchedAt[n.id]!;
      if (f !== sealedAt) {
        order.seal(sealedAt);
        sealedAt = f;
      }
      order.touch(n, f);
      order.add(n);
    }
    let frame = 151;
    order.seal(frame);
    // The old policy, one frame.
    let compared = 0;
    void [...loaded]
      .filter((t) => t.touchedFrame < frame + 1)
      .sort((a, b) => {
        compared++;
        return a.touchedFrame - b.touchedFrame;
      });
    const oldWork = resident + compared;
    // The order, one frame: touches, the seal, eight evictions.
    frame++;
    const before = order.steps;
    for (let k = 0; k < selection; k++) {
      order.touch(nodes[(frame * 37 + k) % resident]!, frame);
    }
    order.seal(frame);
    let count = 8;
    for (const node of order.coldest(frame)) {
      if (count-- <= 0) {
        break;
      }
      order.remove(node);
    }
    // The seal's sort of one selection, at most n log2 n comparisons.
    const newWork =
      selection + (order.steps - before) + selection * Math.log2(selection);
    expect(oldWork).toBeGreaterThan(300_000);
    expect(newWork).toBeLessThan(oldWork / 100);
  });
});
