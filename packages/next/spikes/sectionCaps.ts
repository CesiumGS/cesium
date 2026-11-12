// Section caps on the GPU (View.clipCaps, scene/world/capFaces.ts, the parity
// pass in surface.slang and sectionCap.slang): unlit white solids on black, cut
// by a plane or a box with red caps, drawn into an offscreen target and every
// pixel read back and compared with where float64 says the cap is: the pixel's
// ray meets the cut inside the solid's section. Pixels within 1 px of a
// boundary are left out, as the clips spike does.
//
// Cases:
//   1. a closed box cut by a level plane, from above at an angle;
//   2. the same box not marked solid: no cap, and no cap pixel anywhere;
//   3. the box with an open floor under it (not solid): the floor's surface,
//      behind the cut, doesn't flip the count;
//   4. a hollow box (a bore through it, the inner surfaces turned in): the cap
//      is a ring, the bore left open;
//   5. the plane moving: every one of nine frames has its cap where the plane is;
//   6. a clip box (six faces): the cap of the face the camera is outside of;
//   7. a view without caps draws none.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  createFrameCatalog,
  createFramesResolver,
} from "../src/frames/index.ts";
import {
  EARTH,
  Engine,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  type ClipSet,
  type MeshData,
  type View,
  type World,
} from "../src/index.ts";
import type { AnchorHandle } from "../src/scene/world/types.ts";
import type { CapParityKind } from "../src/scene/RenderContext.ts";

const TEMPLATE = `
<h1>Section caps on the GPU</h1>
<p>
  Unlit white solids on black, cut by a plane or a box whose view has caps
  (<code>View.clipCaps</code>, red). Every pixel is compared with float64's
  classification of where the cut lies inside a solid. Pixels within 1 px of a
  boundary are left out.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 512;
const HEIGHT = 512;
/** The Earth's equatorial radius, m: the site sits at (0, 0, R). */
const R = 6_378_137;
const WHITE = [1, 1, 1, 1] as const;

type V3 = [number, number, number];

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface SectionCapsResult {
  adapter: string;
  checks: Check[];
  pass: boolean;
}

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;
let active: Engine | undefined;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** A box's mesh about the origin; `inward` turns its faces in (a bore's wall). */
function boxMesh(half: Readonly<V3>, inward = false): MeshData {
  const corners: number[] = [];
  for (let i = 0; i < 8; i++) {
    corners.push(
      (i & 1 ? 1 : -1) * half[0],
      (i & 2 ? 1 : -1) * half[1],
      (i & 4 ? 1 : -1) * half[2],
    );
  }
  const quads = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ];
  const indices = quads.flatMap(([a, b, c, d]) =>
    inward ? [a!, c!, b!, a!, d!, c!] : [a!, b!, c!, a!, c!, d!],
  );
  return {
    positions: Float32Array.from(corners),
    indices: Uint32Array.from(indices),
  };
}

/** A square on the level, `half` across, with its normal up: an open surface. */
function floorMesh(half: number): MeshData {
  return {
    positions: Float32Array.from([
      -half,
      -half,
      0,
      half,
      -half,
      0,
      half,
      half,
      0,
      -half,
      half,
      0,
    ]),
    indices: Uint32Array.from([0, 1, 2, 0, 2, 3]),
  };
}

interface Scene {
  world: World;
  view: View;
  target: OffscreenTarget;
  earth: AnchorHandle;
  itrf: ReturnType<ReturnType<typeof createFrameCatalog>["get"]>;
  capture(): Promise<Uint8ClampedArray>;
  dispose(): void;
}

function scene(engine: Engine, lost: () => void): Scene {
  const world = engine.createWorld({
    maxDraws: 16,
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
  engine.cameras.setRig(view, {
    position: { frame: itrf },
    orientation: { kind: "free" },
  });
  const frames = async (n: number) => {
    for (let i = 0; i < n; i++) {
      engine.renderFrame();
      lost();
      await sleep(16);
    }
  };
  return {
    world,
    view,
    target,
    earth: world.bodyAnchor(EARTH),
    itrf,
    async capture() {
      // The pipelines of the caps are made when first asked for.
      await frames(80);
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
  view.camera.position.set(eye);
  view.camera.direction.set(direction);
  view.camera.orient(Float64Array.from(up));
  view.camera.version++;
}

/** Where the pixel's ray meets the plane `axis` = `value`, or undefined. */
function onPlane(
  view: View,
  px: number,
  py: number,
  axis: number,
  value: number,
): V3 | undefined {
  const c = view.camera;
  const t = Math.tan(c.fovy(WIDTH / HEIGHT) / 2);
  const ndcX = ((px + 0.5) / WIDTH) * 2 - 1;
  const ndcY = 1 - ((py + 0.5) / HEIGHT) * 2;
  const d = [0, 1, 2].map(
    (i) => c.direction[i]! + c.right[i]! * ndcX * t + c.up[i]! * ndcY * t,
  );
  if (Math.abs(d[axis]!) < 1e-12) {
    return undefined;
  }
  const s = (value - c.position[axis]!) / d[axis]!;
  return s > 0
    ? [
        c.position[0]! + s * d[0]!,
        c.position[1]! + s * d[1]!,
        c.position[2]! + s * d[2]!,
      ]
    : undefined;
}

const isRed = (pixels: Uint8ClampedArray, px: number, py: number): boolean => {
  const i = (py * WIDTH + px) * 4;
  return pixels[i]! > 140 && pixels[i + 1]! < 90 && pixels[i + 2]! < 90;
};

interface Comparison {
  checked: number;
  cap: number;
  other: number;
  wrong: number;
  skipped: number;
  /** The first and the last wrong pixel. */
  first: [number, number];
  last: [number, number];
}

/** Red against `expected` over the pixels whose 3 × 3 neighbourhood agrees. */
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
    other: 0,
    wrong: 0,
    skipped: 0,
    first: [-1, -1],
    last: [-1, -1],
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
        out.skipped++;
        continue;
      }
      out.checked++;
      if (here) {
        out.cap++;
      } else {
        out.other++;
      }
      if (isRed(pixels, px, py) !== (here === 1)) {
        out.wrong++;
        if (out.first[0] < 0) {
          out.first = [px, py];
        }
        out.last = [px, py];
      }
    }
  }
  return out;
}

const redCount = (pixels: Uint8ClampedArray): number => {
  let n = 0;
  for (let py = 0; py < HEIGHT; py++) {
    for (let px = 0; px < WIDTH; px++) {
      n += isRed(pixels, px, py) ? 1 : 0;
    }
  }
  return n;
};

function show(caption: string, pixels: Uint8ClampedArray): void {
  const figure = document.createElement("figure");
  const label = document.createElement("figcaption");
  label.textContent = caption;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = "320px";
  canvas
    .getContext("2d")!
    .putImageData(new ImageData(new Uint8ClampedArray(pixels), WIDTH), 0, 0);
  figure.append(label, canvas);
  $("images").append(figure);
}

function render(checks: readonly Check[]): void {
  const table = $("results");
  table.replaceChildren();
  for (const c of checks) {
    for (const [key, value] of Object.entries(c.measured)) {
      const tr = document.createElement("tr");
      for (const text of [
        `${c.id}. ${c.name}`,
        key,
        String(value),
        c.pass ? "pass" : "FAIL",
      ]) {
        const td = document.createElement("td");
        td.textContent = text;
        tr.append(td);
      }
      table.append(tr);
    }
  }
}

const level = (frame: ClipSet["frame"], z: number): ClipSet => ({
  frame,
  shapes: [{ kind: "plane", point: [0, 0, R + z], normal: [0, 0, 1] }],
});

async function runSectionCaps(): Promise<SectionCapsResult> {
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
  const comparison = (c: Comparison) => ({
    "pixels compared": c.checked,
    "expected cap": c.cap,
    "expected not": c.other,
    wrong: c.wrong,
    "left out": c.skipped,
    "first wrong x": c.first[0],
    "first wrong y": c.first[1],
    "last wrong x": c.last[0],
    "last wrong y": c.last[1],
  });
  // The parity is counted at the pixel's centre and the opaque pass is
  // multisampled, so a row along the cap's edge may differ: a hundredth of the
  // cap's pixels at most.
  const agrees = (c: Comparison) =>
    c.wrong <= c.cap / 100 && c.cap > 1500 && c.other > 2000;
  const RED = { color: [1, 0, 0, 1] } as const;
  const solid = (
    world: World,
    earth: AnchorHandle,
    mesh: MeshData,
    z: number,
    solid_ = true,
  ) =>
    world.addDraw({
      mesh: world.addMesh(mesh),
      parent: earth,
      origin: Float64Array.from([0, 0, R + z]),
      color: WHITE,
      unlit: true,
      doubleSided: true,
      solid: solid_,
    });
  // The camera: south of the box and above it, looking down at it.
  const above = (view: View) =>
    look(view, [0, -26, R + 22], [0, 0.78, -0.62], [0, 0, 1]);
  try {
    // The clipped pipelines and the caps' are made when first asked for: here,
    // all now, so no frame is drawn without them.
    await engine.ctx.pipelines.warmClipped();
    const { pipelines } = engine.ctx;
    for (let i = 0; i < 400; i++) {
      const kinds: CapParityKind[] = ["mesh", "patch", "patchTrimmed"];
      const ready = kinds.map((k) => pipelines.capParity(k, () => {}));
      if (ready.every(Boolean) && pipelines.sectionCap(() => {})) {
        break;
      }
      await sleep(25);
    }
    lost();
    // --- 1. a closed box cut by a level plane ----------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      solid(world, s.earth, boxMesh([6, 6, 4]), 4);
      above(view);
      view.setClips([world.addClip(level(s.itrf, 5))]);
      view.clipCaps = RED;
      const pixels = await s.capture();
      show("1. a box cut at 5 m, red cap", pixels);
      const result = compare(pixels, (px, py) => {
        const p = onPlane(view, px, py, 2, R + 5);
        return p !== undefined && Math.abs(p[0]) <= 6 && Math.abs(p[1]) <= 6;
      });
      add(
        "a closed box cut by a plane: the cap is the section",
        comparison(result),
        "every pixel clear of a boundary is red where the ray meets the cut inside the box (a row of the edge may differ)",
        agrees(result),
      );
      s.dispose();
    }
    // --- 2. not solid ------------------------------------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      solid(world, s.earth, boxMesh([6, 6, 4]), 4, false);
      above(view);
      view.setClips([world.addClip(level(s.itrf, 5))]);
      view.clipCaps = RED;
      const pixels = await s.capture();
      add(
        "a box that is not marked solid has no cap",
        { "red pixels": redCount(pixels) },
        "no red pixel",
        redCount(pixels) === 0,
      );
      s.dispose();
    }
    // --- 3. an open floor under the box -----------------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      solid(world, s.earth, boxMesh([6, 6, 4]), 4);
      solid(world, s.earth, floorMesh(30), 0.5, false);
      above(view);
      view.setClips([world.addClip(level(s.itrf, 5))]);
      view.clipCaps = RED;
      const pixels = await s.capture();
      show("3. the same box on an open floor", pixels);
      const result = compare(pixels, (px, py) => {
        const p = onPlane(view, px, py, 2, R + 5);
        return p !== undefined && Math.abs(p[0]) <= 6 && Math.abs(p[1]) <= 6;
      });
      add(
        "an open floor behind the cut doesn't flip the count",
        comparison(result),
        "the cap is as without the floor",
        agrees(result),
      );
      s.dispose();
    }
    // --- 4. a hollow box ---------------------------------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      solid(world, s.earth, boxMesh([6, 6, 4]), 4);
      solid(world, s.earth, boxMesh([3, 3, 3], true), 4);
      above(view);
      view.setClips([world.addClip(level(s.itrf, 5))]);
      view.clipCaps = RED;
      const pixels = await s.capture();
      show("4. a box with a bore", pixels);
      const result = compare(pixels, (px, py) => {
        const p = onPlane(view, px, py, 2, R + 5);
        return (
          p !== undefined &&
          Math.abs(p[0]) <= 6 &&
          Math.abs(p[1]) <= 6 &&
          !(Math.abs(p[0]) <= 3 && Math.abs(p[1]) <= 3)
        );
      });
      add(
        "a hollow box: the cap is a ring, the bore open",
        comparison(result),
        "red exactly on the ring of the section",
        agrees(result),
      );
      s.dispose();
    }
    // --- 5. the plane moving -----------------------------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      solid(world, s.earth, boxMesh([6, 6, 4]), 4);
      above(view);
      const clip = world.addClip(level(s.itrf, 1.5));
      view.setClips([clip]);
      view.clipCaps = RED;
      await s.capture();
      let present = 0;
      let wrong = 0;
      let capPixels = 0;
      for (let k = 0; k < 9; k++) {
        const z = 1.5 + k * 0.75;
        world.setClip(clip, level(s.itrf, z));
        // One frame after the move, no waiting: the cap is in it.
        engine.renderFrame();
        lost();
        const pixels = await s.target.read();
        const reds = redCount(pixels);
        present += reds > 1500 ? 1 : 0;
        const result = compare(pixels, (px, py) => {
          const p = onPlane(view, px, py, 2, R + z);
          return p !== undefined && Math.abs(p[0]) <= 6 && Math.abs(p[1]) <= 6;
        });
        wrong += result.wrong;
        capPixels += result.cap;
        if (k === 8) {
          show("5. the plane at 7.5 m, the frame after it moved", pixels);
        }
      }
      add(
        "a plane moved each frame: the cap is in the frame it moves in",
        { "frames with the cap": present, "wrong pixels": wrong },
        "nine of nine frames have the cap, within a hundredth of its pixels wrong",
        present === 9 && wrong <= capPixels / 100,
      );
      s.dispose();
    }
    // --- 6. a clip box -----------------------------------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      solid(world, s.earth, boxMesh([9, 9, 6]), 6);
      above(view);
      const box: ClipSet = {
        frame: s.itrf,
        shapes: [
          {
            kind: "box",
            center: [0, 0, R + 6],
            halfExtents: [4, 4, 12],
          },
        ],
      };
      view.setClips([world.addClip(box)]);
      view.clipCaps = RED;
      const pixels = await s.capture();
      show("6. a solid cut by a clip box", pixels);
      // The box's top is above the solid's (12 m up), so what shows is its four
      // sides cut: the solid's top (z 12) is inside the clip box's extent, and
      // the cap is on the camera's side: the box's south face (y = -4).
      const result = compare(pixels, (px, py) => {
        const p = onPlane(view, px, py, 1, -4);
        return (
          p !== undefined && Math.abs(p[0]) <= 4 && p[2] >= R && p[2] <= R + 12
        );
      });
      add(
        "a clip box: the cap of its near face through a larger solid",
        comparison(result),
        "red exactly where the ray enters the box through the solid",
        result.wrong === 0 && result.cap > 500,
      );
      s.dispose();
    }
    // --- 7. a view without caps ------------------------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      solid(world, s.earth, boxMesh([6, 6, 4]), 4);
      above(view);
      view.setClips([world.addClip(level(s.itrf, 5))]);
      view.clipCaps = undefined;
      const pixels = await s.capture();
      add(
        "a view without caps draws none",
        { "red pixels": redCount(pixels) },
        "no red pixel",
        redCount(pixels) === 0,
      );
      s.dispose();
    }
  } finally {
    engine.gpu.device.removeEventListener("uncapturederror", onError);
    add(
      "no GPU validation error in any case",
      { "uncaptured errors": gpuErrors.length },
      "the parity pass's and the cap pass's pipelines are valid",
      gpuErrors.length === 0,
    );
    if (gpuErrors.length > 0) {
      console.error(
        `[sectionCaps] GPU errors: ${gpuErrors.slice(0, 3).join(" | ")}`,
      );
    }
    $("adapter").textContent =
      `Adapter: ${engine.gpu.adapter.info.vendor} ${engine.gpu.adapter.info.description}`;
    if (active === engine) {
      active = undefined;
      engine.destroy();
    }
    render(checks);
    const failed = checks.filter((c) => !c.pass);
    status.textContent = failed.length
      ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
      : `pass: all ${checks.length} checks`;
  }
  return {
    adapter: $("adapter").textContent ?? "",
    checks,
    pass: checks.length === 8 && checks.every((c) => c.pass),
  };
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runSectionCaps, dispose: () => active?.destroy() };
  },
};
