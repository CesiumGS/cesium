// Caps on the GPU (plan §13.26, increment 8b; the Node tests are
// test/brepSection*.test.ts, test/meshCaps.test.ts and test/caps.test.ts).
// Unlit white content on black, cut by a plane the view opts into, and the
// cut closed by a cap in red (a section line in orange). Every pixel is
// compared with float64: the pixel's ray carried to the cut plane, inside or
// outside the section.
//
// Cases:
//   1. a capped cylinder (b-rep: exact caps, a trimmed planar face drawn by
//      the GPU patch path) cut by a plane: the red cap fills the section's
//      ellipse, with no background pixel inside it; the clip then moves, and
//      the cap follows through the scheduler;
//   2. a box with a cylindrical hole (b-rep): the cap is a square with a hole,
//      and the pixels of the hole are not the cap's;
//   3. a closed box mesh cut by a plane: the mesh cap is a filled rectangle;
//   4. an open mesh (an L-shaped wall): no cap, but a section line along it,
//      and the report says the chain did not close;
//   5. a closed box mesh split across two tiles: the cap closes across them.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  createFrameCatalog,
  createFramesResolver,
} from "../src/frames/index.ts";
import {
  BrepCaps,
  CapScheduler,
  EARTH,
  Engine,
  MaterialFlags,
  MeshCaps,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  type ClipSet,
  type MeshData,
  type View,
  type World,
} from "../src/index.ts";
import type { AnchorHandle } from "../src/scene/world/types.ts";
import { cappedCylinderBrep } from "../test/brepFixtures.ts";
import { boxMinusCylinderBrep } from "../test/brepSectionFixtures.ts";

const TEMPLATE = `
<h1>Caps on the GPU against float64</h1>
<p>
  Unlit white content on black, cut by a plane the view opts into, and the cut
  closed by a cap: exact for a b-rep (planar faces with per-pixel trims),
  triangulated for a mesh, a section line where a mesh is open. Every pixel is
  compared with where its ray meets the cut plane, inside the section or not.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 512;
const HEIGHT = 512;
/** The body's radius, m: content sits at this height up the z axis, as the clips spike's. */
const R = 6_378_137;
const RED = [1, 0, 0, 1] as const;
const ORANGE = [1, 0.35, 0.1, 1] as const;

type V3 = [number, number, number];

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface CapsResult {
  adapter: string;
  checks: Check[];
  pass: boolean;
}

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;
let active: Engine | undefined;

function stop(engine: Engine | undefined): void {
  if (engine && active === engine) {
    active = undefined;
    engine.destroy();
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** An axis-aligned box's mesh, centred on the origin, `half` its half extents, outward winding. */
function boxMesh(half: readonly [number, number, number]): MeshData {
  const corners: number[] = [];
  for (let i = 0; i < 8; i++) {
    corners.push(
      (i & 1 ? 1 : -1) * half[0],
      (i & 2 ? 1 : -1) * half[1],
      (i & 4 ? 1 : -1) * half[2],
    );
  }
  // Corner i has x = bit 0, y = bit 1, z = bit 2; each quad runs counter-clockwise seen from outside.
  const quads = [
    [0, 2, 3, 1],
    [4, 5, 7, 6],
    [0, 1, 5, 4],
    [2, 6, 7, 3],
    [0, 4, 6, 2],
    [1, 3, 7, 5],
  ];
  const indices = quads.flatMap(([a, b, c, d]) => [a!, b!, c!, a!, c!, d!]);
  return {
    positions: Float32Array.from(corners),
    indices: Uint32Array.from(indices),
  };
}

interface Scene {
  world: World;
  view: View;
  earth: AnchorHandle;
  itrf: ReturnType<ReturnType<typeof createFrameCatalog>["get"]>;
  unlit: number;
  frames(n: number): Promise<void>;
  capture(): Promise<Uint8ClampedArray>;
  dispose(): void;
}

function scene(engine: Engine, lost: () => void, tick?: () => void): Scene {
  const world = engine.createWorld({
    maxDraws: 32,
    vertexBytes: 1 << 22,
    indexBytes: 1 << 20,
  });
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const view = engine.addView({
    target,
    world,
    background: "color",
    clearColor: [0, 0, 0],
    observer: { exposure: UNITLESS_EXPOSURE },
  });
  const catalog = createFrameCatalog();
  const itrf = catalog.get("ITRF");
  engine.cameras.setResolver(world, createFramesResolver(catalog));
  const earth = world.bodyAnchor(EARTH);
  engine.cameras.setRig(view, {
    position: { frame: itrf },
    orientation: { kind: "free" },
  });
  const frames = async (n: number) => {
    for (let i = 0; i < n; i++) {
      tick?.();
      engine.renderFrame();
      lost();
      await sleep(16);
    }
  };
  return {
    world,
    view,
    earth,
    itrf,
    unlit: world.addMaterial({
      baseColor: [1, 1, 1, 1],
      flags: MaterialFlags.unlit,
    }),
    frames,
    async capture() {
      await frames(4);
      engine.renderFrame();
      lost();
      const pixels = await target.read();
      lost();
      return pixels;
    },
    dispose() {
      engine.removeView(view);
      engine.removeWorld(world);
    },
  };
}

function look(view: View, eye: V3, direction: V3, up: V3): void {
  const length = Math.hypot(...direction);
  view.camera.position.set(eye);
  view.camera.direction.set(direction.map((x) => x / length));
  view.camera.orient(Float64Array.from(up));
  view.camera.version++;
}

/** The ray through the centre of pixel (px, py): origin and unit direction, in the root frame. */
function pixelRay(view: View, px: number, py: number): { o: V3; d: V3 } {
  const c = view.camera;
  const t = Math.tan(view.camera.fovy(WIDTH / HEIGHT) / 2);
  const ndcX = ((px + 0.5) / WIDTH) * 2 - 1;
  const ndcY = 1 - ((py + 0.5) / HEIGHT) * 2;
  const d: V3 = [0, 1, 2].map(
    (i) => c.direction[i]! + c.right[i]! * ndcX * t + c.up[i]! * ndcY * t,
  ) as V3;
  const length = Math.hypot(...d);
  return {
    o: [c.position[0]!, c.position[1]!, c.position[2]!],
    d: [d[0] / length, d[1] / length, d[2] / length],
  };
}

/** Where the pixel's ray meets the plane z = `value`, or undefined. */
function onZ(
  view: View,
  px: number,
  py: number,
  value: number,
): V3 | undefined {
  const { o, d } = pixelRay(view, px, py);
  if (Math.abs(d[2]) < 1e-12) {
    return undefined;
  }
  const s = (value - o[2]) / d[2];
  return s > 0
    ? [o[0] + s * d[0], o[1] + s * d[1], o[2] + s * d[2]]
    : undefined;
}

/** The pixel a point projects to (fractional), or undefined behind the camera. */
function project(view: View, p: V3): [number, number] | undefined {
  const c = view.camera;
  const t = Math.tan(view.camera.fovy(WIDTH / HEIGHT) / 2);
  const rel = [0, 1, 2].map((i) => p[i]! - c.position[i]!);
  const dot = (a: ArrayLike<number>) =>
    rel[0]! * a[0]! + rel[1]! * a[1]! + rel[2]! * a[2]!;
  const depth = dot(c.direction);
  if (!(depth > 0)) {
    return undefined;
  }
  const ndcX = dot(c.right) / depth / t;
  const ndcY = dot(c.up) / depth / t;
  return [((ndcX + 1) / 2) * WIDTH - 0.5, ((1 - ndcY) / 2) * HEIGHT - 0.5];
}

type Kind = "cap" | "line" | "white" | "dark";

/** What a pixel shows: the cap's red, the section line's orange, white content, or the dark of the background. */
function classify(pixels: Uint8ClampedArray, px: number, py: number): Kind {
  const i = (py * WIDTH + px) * 4;
  const r = pixels[i]!;
  const g = pixels[i + 1]!;
  const b = pixels[i + 2]!;
  if (r > 150 && g < 80 && b < 80) {
    return "cap";
  }
  if (r > 120 && g > 30 && g < r * 0.75 && b < g) {
    return "line";
  }
  if (r > 150 && g > 150 && b > 150) {
    return "white";
  }
  return "dark";
}

interface Comparison {
  /** Pixels compared: clear of the section's boundary. */
  checked: number;
  /** Of them expected to be the cap. */
  cap: number;
  /** Expected cap, not red. */
  missing: number;
  /** Expected cap, and the background's dark. */
  background: number;
  /** Not expected to be the cap, but red. */
  stray: number;
}

/** Compares every pixel whose 3 × 3 neighbourhood agrees on `expected` (inside the section or not). */
function compare(
  pixels: Uint8ClampedArray,
  expected: (px: number, py: number) => boolean,
): Comparison {
  const e = new Uint8Array(WIDTH * HEIGHT);
  for (let py = 0; py < HEIGHT; py++) {
    for (let px = 0; px < WIDTH; px++) {
      e[py * WIDTH + px] = expected(px, py) ? 1 : 0;
    }
  }
  const out: Comparison = {
    checked: 0,
    cap: 0,
    missing: 0,
    background: 0,
    stray: 0,
  };
  for (let py = 1; py < HEIGHT - 1; py++) {
    for (let px = 1; px < WIDTH - 1; px++) {
      const here = e[py * WIDTH + px]!;
      let uniform = true;
      for (let dy = -1; dy <= 1 && uniform; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (e[(py + dy) * WIDTH + px + dx] !== here) {
            uniform = false;
            break;
          }
        }
      }
      if (!uniform) {
        continue;
      }
      out.checked++;
      const kind = classify(pixels, px, py);
      if (here) {
        out.cap++;
        if (kind !== "cap") {
          out.missing++;
        }
        if (kind === "dark") {
          out.background++;
        }
      } else if (kind === "cap") {
        out.stray++;
      }
    }
  }
  return out;
}

function show(caption: string, pixels: Uint8ClampedArray): void {
  const figure = document.createElement("figure");
  const label = document.createElement("figcaption");
  label.textContent = caption;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = "320px";
  canvas.style.borderRadius = "4px";
  canvas
    .getContext("2d")!
    .putImageData(new ImageData(new Uint8ClampedArray(pixels), WIDTH), 0, 0);
  figure.append(label, canvas);
  $("images").append(figure);
}

function format(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toFixed(3);
}

function render(checks: readonly Check[]): void {
  const cell = (text: string, className?: string) => {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) {
      td.className = className;
    }
    return td;
  };
  const table = $("results");
  const head = document.createElement("tr");
  for (const title of ["check", "measured", "value", "passes when", ""]) {
    const th = document.createElement("th");
    th.textContent = title;
    head.append(th);
  }
  table.replaceChildren(head);
  for (const c of checks) {
    const entries = Object.entries(c.measured);
    entries.forEach(([key, value], i) => {
      const tr = document.createElement("tr");
      if (i === 0) {
        const name = cell(`${c.id}. ${c.name}`, "text");
        name.rowSpan = entries.length;
        tr.append(name);
      }
      tr.append(cell(key, "text"), cell(format(value)));
      if (i === 0) {
        const limit = cell(c.limit, "text");
        limit.rowSpan = entries.length;
        const verdict = cell(c.pass ? "pass" : "FAIL");
        verdict.rowSpan = entries.length;
        tr.append(limit, verdict);
      }
      table.append(tr);
    });
  }
}

function describe(engine: Engine): string {
  const info = engine.gpu.adapter.info;
  return `${info.vendor} ${info.architecture} ${info.description}`;
}

const planeAt = (frame: ClipSet["frame"], z: number): ClipSet => ({
  frame,
  shapes: [{ kind: "plane", point: [0, 0, z], normal: [0, 0, 1] }],
});

async function runCaps(): Promise<CapsResult> {
  const status = root.querySelector(".status")!;
  $("images").replaceChildren();
  $("results").replaceChildren();
  status.textContent = "checking…";
  const engine = await Engine.create();
  active = engine;
  let lostReason: string | undefined;
  void engine.gpu.device.lost.then((info) => {
    lostReason = info.message || info.reason;
  });
  const lost = () => {
    if (lostReason !== undefined) {
      throw new Error(`the GPU device was lost (${lostReason}); stopped`);
    }
    if (active !== engine) {
      throw new Error("stopped");
    }
  };
  const checks: Check[] = [];
  const gpuErrors: string[] = [];
  const onError = (event: Event) => {
    gpuErrors.push((event as GPUUncapturedErrorEvent).error.message);
  };
  engine.gpu.device.addEventListener("uncapturederror", onError);
  let id = 1;
  const add = (
    name: string,
    measured: Record<string, number>,
    limit: string,
    pass: boolean,
  ) => checks.push({ id: id++, name, measured, limit, pass });
  const measured = (c: Comparison): Record<string, number> => ({
    "pixels compared": c.checked,
    "expected cap": c.cap,
    "of them not red": c.missing,
    "of them background": c.background,
    "red where there is no cap": c.stray,
  });
  const FILLED =
    "every pixel inside the section is the cap's red (none the background), and none outside it";
  const filled = (c: Comparison, least = 1500) =>
    c.cap > least && c.missing === 0 && c.background === 0 && c.stray === 0;
  try {
    await engine.ctx.pipelines.warmClipped();
    lost();

    // --- 1. a capped cylinder, cut, then the clip moves ---------------------------
    {
      const scheduler = new CapScheduler({
        intervalMs: 0,
        budgetMs: Infinity,
      });
      const s = scene(engine, lost);
      const { world, view } = s;
      const place = {
        parent: s.earth,
        origin: Float64Array.from([0, 0, R]),
      };
      world.addBrep(cappedCylinderBrep(), {
        ...place,
        material: s.unlit,
        doubleSided: true,
        errorPixels: 0.5,
      });
      const formToFrame = Float64Array.from([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        R,
        1,
      ]);
      const caps = new BrepCaps(world, {
        form: cappedCylinderBrep(),
        formToFrame,
        draw: {
          ...place,
          material: s.unlit,
          doubleSided: true,
          errorPixels: 0.5,
        },
        color: RED,
      });
      scheduler.add(caps);
      look(view, [0, -6, R + 5], [0, 6, -3.2], [0, 0, 1]);
      for (const z of [1.8, 1.2]) {
        const set = planeAt(s.itrf, R + z);
        const clip = world.addClip(set);
        view.setClips([clip]);
        caps.setClip(set, 0);
        const tick = scheduler.tick();
        await s.frames(4);
        const pixels = await s.capture();
        show(`1. a capped cylinder cut at z = ${z} (cap: red)`, pixels);
        const result = compare(pixels, (px, py) => {
          const p = onZ(view, px, py, R + z);
          return p !== undefined && p[0] * p[0] + p[1] * p[1] <= 1;
        });
        add(
          `a capped cylinder (b-rep) cut at z = ${z}: the exact cap fills the section`,
          {
            ...measured(result),
            "caps built": caps.report.faces,
            "cap area, m²": caps.report.area,
            "rebuilt this tick": tick.rebuilt,
          },
          FILLED,
          filled(result) &&
            caps.report.faces === 1 &&
            Math.abs(caps.report.area - Math.PI) < 1e-3,
        );
        view.setClips([]);
        world.removeClip(clip);
      }
      caps.dispose();
      s.dispose();
    }

    // --- 2. a box with a cylindrical hole: the cap is a square with a hole -------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      const place = {
        parent: s.earth,
        origin: Float64Array.from([-2, -2, R]),
      };
      world.addBrep(boxMinusCylinderBrep(), {
        ...place,
        material: s.unlit,
        doubleSided: true,
        errorPixels: 0.5,
      });
      const formToFrame = Float64Array.from([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        -2,
        -2,
        R,
        1,
      ]);
      const caps = new BrepCaps(world, {
        form: boxMinusCylinderBrep(),
        formToFrame,
        draw: {
          ...place,
          material: s.unlit,
          doubleSided: true,
          errorPixels: 0.5,
        },
        color: RED,
      });
      const set = planeAt(s.itrf, R + 1);
      view.setClips([world.addClip(set)]);
      caps.setClip(set);
      caps.rebuild();
      look(view, [0, -7, R + 8], [0, 7, -6.8], [0, 0, 1]);
      await s.frames(4);
      const pixels = await s.capture();
      show("2. a block with a bore, cut at mid height (cap: red)", pixels);
      const result = compare(pixels, (px, py) => {
        const p = onZ(view, px, py, R + 1);
        return (
          p !== undefined &&
          Math.abs(p[0]) <= 2 &&
          Math.abs(p[1]) <= 2 &&
          p[0] * p[0] + p[1] * p[1] > 0.25
        );
      });
      add(
        "a block with a bore (b-rep, a face with a hole): the cap's hole is open",
        {
          ...measured(result),
          "faces cut": caps.report.section?.facesCut ?? 0,
          "cap faces": caps.report.faces,
        },
        FILLED,
        // Through the bore the pixels are not the cap's red, so no "background" is expected there.
        result.cap > 3000 &&
          result.missing === 0 &&
          result.stray === 0 &&
          caps.report.faces === 1,
      );
      caps.dispose();
      s.dispose();
    }

    // --- 3. a closed mesh, cut: a filled rectangle ---------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      const half: [number, number, number] = [1.5, 1, 1];
      const origin = Float64Array.from([0, 0, R + 4]);
      const mesh = boxMesh(half);
      world.addDraw({
        mesh: world.addMesh(mesh),
        parent: s.earth,
        origin,
        material: s.unlit,
        doubleSided: true,
      });
      const caps = new MeshCaps(world, {
        place: (o) => ({ parent: s.earth, origin: o }),
        color: RED,
        material: s.unlit,
        unlit: true,
      });
      caps.setTile({
        id: "box",
        revision: 1,
        positions: mesh.positions,
        indices: mesh.indices,
        matrix: Float64Array.from([
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          R + 4,
          1,
        ]),
      });
      const set = planeAt(s.itrf, R + 4.3);
      view.setClips([world.addClip(set)]);
      caps.setClip(set);
      caps.rebuild();
      look(view, [0, -6, R + 8], [0, 6, -3.7], [0, 0, 1]);
      await s.frames(4);
      const pixels = await s.capture();
      show("3. a closed box mesh cut above its middle (cap: red)", pixels);
      const result = compare(pixels, (px, py) => {
        const p = onZ(view, px, py, R + 4.3);
        return p !== undefined && Math.abs(p[0]) <= 1.5 && Math.abs(p[1]) <= 1;
      });
      const plane = caps.report.planes[0]!;
      add(
        "a closed mesh cut by a plane: the triangulated cap fills the section",
        {
          ...measured(result),
          "closed loops": plane.closedLoops,
          "open chains": plane.openChains,
          "cap area, m²": plane.elements[0]?.area ?? 0,
        },
        FILLED,
        filled(result) &&
          plane.closedLoops === 1 &&
          plane.openChains === 0 &&
          Math.abs((plane.elements[0]?.area ?? 0) - 3 * 2) < 1e-3,
      );
      caps.dispose();
      s.dispose();
    }

    // --- 4. an open mesh: a section line, not a cap ---------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      const origin = Float64Array.from([0, 0, R + 4]);
      // An L-shaped wall, two quads, z from -1 to 1: along y = 0 from x = -1.5 to 1.5, then along x = 1.5 to y = 2.
      const wall: MeshData = {
        positions: Float32Array.from([
          -1.5, 0, -1, 1.5, 0, -1, 1.5, 0, 1, -1.5, 0, 1, 1.5, 0, -1, 1.5, 2,
          -1, 1.5, 2, 1, 1.5, 0, 1,
        ]),
        indices: Uint32Array.from([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]),
      };
      world.addDraw({
        mesh: world.addMesh(wall),
        parent: s.earth,
        origin,
        material: s.unlit,
        doubleSided: true,
      });
      const caps = new MeshCaps(world, {
        place: (o) => ({ parent: s.earth, origin: o }),
        color: RED,
        lineColor: ORANGE,
        material: s.unlit,
        unlit: true,
      });
      caps.setTile({
        id: "wall",
        revision: 1,
        positions: wall.positions,
        indices: wall.indices,
        matrix: Float64Array.from([
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          R + 4,
          1,
        ]),
      });
      const zc = R + 4.3;
      const set = planeAt(s.itrf, zc);
      view.setClips([world.addClip(set)]);
      caps.setClip(set);
      caps.rebuild();
      look(view, [4, -6, R + 8], [-4, 6, -3.7], [0, 0, 1]);
      await s.frames(4);
      const pixels = await s.capture();
      show(
        "4. an open L-shaped wall cut mid height (section line: orange)",
        pixels,
      );
      // The path, and where it falls: every pixel along it has a line pixel within 1.
      const path: V3[] = [
        [-1.5, 0, zc],
        [1.5, 0, zc],
        [1.5, 2, zc],
      ];
      let samples = 0;
      let hit = 0;
      for (let k = 0; k + 1 < path.length; k++) {
        const a = path[k]!;
        const b = path[k + 1]!;
        // Avoid the ends, where the line stops at the pixel's half.
        for (let i = 1; i < 60; i++) {
          const t = i / 60;
          const p: V3 = [0, 1, 2].map((c) => a[c]! + t * (b[c]! - a[c]!)) as V3;
          const px = project(view, p);
          if (!px) {
            continue;
          }
          samples++;
          const cx = Math.round(px[0]);
          const cy = Math.round(px[1]);
          let found = false;
          for (let dy = -1; dy <= 1 && !found; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (classify(pixels, cx + dx, cy + dy) === "line") {
                found = true;
                break;
              }
            }
          }
          hit += found ? 1 : 0;
        }
      }
      let lineCount = 0;
      let capCount = 0;
      for (let py = 0; py < HEIGHT; py++) {
        for (let px = 0; px < WIDTH; px++) {
          const kind = classify(pixels, px, py);
          lineCount += kind === "line" ? 1 : 0;
          capCount += kind === "cap" ? 1 : 0;
        }
      }
      const report = caps.report.planes[0]!;
      add(
        "an open mesh: a section line along the cut, no cap, and the report says it did not close",
        {
          "samples along the section": samples,
          "with a line pixel within 1 px": hit,
          "line pixels": lineCount,
          "cap pixels": capCount,
          "open chains": report.openChains,
          "closed loops": report.closedLoops,
        },
        "at least 95% of the samples have a line pixel beside them; no pixel is a filled cap; one open chain, no closed loop",
        samples > 100 &&
          hit >= 0.95 * samples &&
          capCount === 0 &&
          lineCount < 6 * samples &&
          report.openChains === 1 &&
          report.closedLoops === 0,
      );
      caps.dispose();
      s.dispose();
    }

    // --- 5. a closed mesh in two tiles: the cap closes across them -----------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      const origin = Float64Array.from([0, 0, R + 4]);
      const half: [number, number, number] = [1.5, 1, 1];
      const mesh = boxMesh(half);
      world.addDraw({
        mesh: world.addMesh(mesh),
        parent: s.earth,
        origin,
        material: s.unlit,
        doubleSided: true,
      });
      // Split by the plane x = 0: each triangle goes to the half its centroid is in; the big faces
      // (two triangles a face, spanning x = 0) are cut in the middle first.
      const tiles = splitBoxAtX(half);
      const caps = new MeshCaps(world, {
        place: (o) => ({ parent: s.earth, origin: o }),
        color: RED,
        material: s.unlit,
        unlit: true,
      });
      for (const t of tiles) {
        caps.setTile({
          ...t,
          matrix: Float64Array.from([
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            R + 4,
            1,
          ]),
        });
      }
      const set = planeAt(s.itrf, R + 4.3);
      view.setClips([world.addClip(set)]);
      caps.setClip(set);
      caps.rebuild();
      look(view, [0, -6, R + 8], [0, 6, -3.7], [0, 0, 1]);
      await s.frames(4);
      const pixels = await s.capture();
      show("5. a closed box mesh in two tiles, cut (cap: red)", pixels);
      const result = compare(pixels, (px, py) => {
        const p = onZ(view, px, py, R + 4.3);
        return p !== undefined && Math.abs(p[0]) <= 1.5 && Math.abs(p[1]) <= 1;
      });
      const plane = caps.report.planes[0]!;
      add(
        "a closed mesh split across two tiles: the loop closes across them and the cap fills the section",
        {
          ...measured(result),
          tiles: plane.tiles,
          "tiles cut": plane.tilesCrossed,
          "closed loops": plane.closedLoops,
          "open chains": plane.openChains,
        },
        FILLED,
        filled(result) &&
          plane.tilesCrossed === 2 &&
          plane.closedLoops === 1 &&
          plane.openChains === 0,
      );
      caps.dispose();
      s.dispose();
    }
  } finally {
    engine.gpu.device.removeEventListener("uncapturederror", onError);
    add(
      "no GPU validation error in any case",
      { "uncaptured errors": gpuErrors.length },
      "the clipped pipelines, the b-rep caps' patch draws and the mesh caps' triangles and lines are valid",
      gpuErrors.length === 0,
    );
    if (gpuErrors.length > 0) {
      console.error(`[caps] GPU errors: ${gpuErrors.slice(0, 3).join(" | ")}`);
    }
    $("adapter").textContent = `Adapter: ${describe(engine)}`;
    stop(engine);
    render(checks);
    const failed = checks.filter((c) => !c.pass);
    status.textContent = failed.length
      ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
      : `pass: all ${checks.length} checks`;
    if (failed.length) {
      console.error(
        `[caps] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    checks,
    pass: checks.length === 7 && checks.every((c) => c.pass),
  };
}

/**
 * A box's mesh as two tiles split at x = 0 (each face of the box cut in two
 * along it), each tile open where it was cut: its own positions and triangles.
 */
function splitBoxAtX(half: readonly [number, number, number]): {
  id: string;
  revision: number;
  positions: Float32Array;
  indices: Uint32Array;
}[] {
  const [hx, hy, hz] = half;
  const tile = (side: -1 | 1, id: string) => {
    const positions: number[] = [];
    const indices: number[] = [];
    const quad = (a: V3, b: V3, c: V3, d: V3) => {
      const base = positions.length / 3;
      positions.push(...a, ...b, ...c, ...d);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const x0 = side < 0 ? -hx : 0;
    const x1 = side < 0 ? 0 : hx;
    // Bottom and top, front and back (outward winding), over this tile's x range.
    quad([x0, -hy, -hz], [x0, hy, -hz], [x1, hy, -hz], [x1, -hy, -hz]);
    quad([x0, -hy, hz], [x1, -hy, hz], [x1, hy, hz], [x0, hy, hz]);
    quad([x0, -hy, -hz], [x1, -hy, -hz], [x1, -hy, hz], [x0, -hy, hz]);
    quad([x0, hy, -hz], [x0, hy, hz], [x1, hy, hz], [x1, hy, -hz]);
    // The end wall of this tile.
    if (side < 0) {
      quad([-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]);
    } else {
      quad([hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz]);
    }
    return {
      id,
      revision: 1,
      positions: Float32Array.from(positions),
      indices: Uint32Array.from(indices),
    };
  };
  return [tile(-1, "left"), tile(1, "right")];
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runCaps, dispose: () => stop(active) };
  },
};
