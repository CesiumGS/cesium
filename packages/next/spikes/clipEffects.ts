// Clip effects on the GPU (plan §13.26, the owner's question of 2026-11-11:
// "can the box clips replace terrain clipping, and show the terrain inside a
// clip volume translucent, or shaded by a custom shader?").
//
// Content is unlit and flat-coloured, drawn into an offscreen target, and
// pixels are read back where the classification is known. The scene is an
// excavation seen from above: a ground slab (red), a pipe buried under it
// (blue, exempt from clips), and a clip box that removes the slab over the
// pipe. Cases:
//
//   1. no effect (discard): the box is a hole; the pipe shows in it;
//   2. a blended ghost (`translucent`, alpha 0.4): the ground inside the box
//      is drawn translucent over the pipe, which stays whole, at the right
//      mix; outside the box nothing changed;
//   2b. the same ghost on a b-rep ground (a GPU-diced plane face);
//   3. a stippled ghost (alpha 0.5): the same without the translucent passes,
//      at about half the pixels;
//   4. the same ghost on a pipe that is not exempt: the clip ghosts the pipe
//      too (nothing is exempt by default);
//   5. a custom shader reading `fsInput.clipDistance` on a "shade" set (a
//      plane across a wall): every pixel's colour is the sign of the
//      distance, as float64 classifies the surface point it shows;
//   6. a "discard" set that reports: the kept side sees its distance (<= 0),
//      and the removed side is gone;
//   7. what the effect costs nothing for: a view that doesn't use the clips
//      draws everything whole, and clearing the mask restores it.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { BrepBuilder } from "../src/brep/index.ts";
import {
  createFrameCatalog,
  createFramesResolver,
} from "../src/frames/index.ts";
import {
  CustomShader,
  EARTH,
  Engine,
  MaterialFlags,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  type ClipSet,
  type MeshData,
  type View,
  type World,
} from "../src/index.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";
import { clipSetDistance } from "../src/scene/world/clips.ts";
import { runBench } from "./clipEffectsBench.ts";

const TEMPLATE = `
<h1>Clip effects</h1>
<p>
  A ground slab over a buried pipe, cut by a box (an excavation). The clip's
  effect says what happens to the slab inside it: gone, a blended ghost, a
  dithered ghost, or untouched but told to a custom shader.
  <code>runClipEffects()</code> checks pixels against what is known;
  <code>runClipBench()</code> measures GPU time on the globe (needs an ion token).
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 512;
const HEIGHT = 512;
/** The Earth's equatorial radius, m: the scene sits at the north pole's axis. */
const R = 6_378_137;
const CAMERA_HEIGHT = 160;

type V3 = [number, number, number];
type Rgb = [number, number, number];

interface Check {
  id: number;
  name: string;
  measured: Record<string, number | string>;
  limit: string;
  pass: boolean;
}

export interface ClipEffectsResult {
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

function boxMesh(half: readonly [number, number, number]): MeshData {
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
  const indices = quads.flatMap(([a, b, c, d]) => [a!, b!, c!, a!, c!, d!]);
  return {
    positions: Float32Array.from(corners),
    indices: Uint32Array.from(indices),
  };
}

interface Scene {
  world: World;
  view: View;
  target: OffscreenTarget;
  earth: AnchorHandle;
  itrf: ReturnType<ReturnType<typeof createFrameCatalog>["get"]>;
  frames(n: number): Promise<void>;
  ready(): Promise<void>;
  capture(): Promise<Uint8ClampedArray>;
  dispose(): void;
}

function scene(
  engine: Engine,
  lost: () => void,
  extra: Partial<Parameters<Engine["addView"]>[0]> = {},
): Scene {
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
    ...extra,
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
      engine.renderFrame();
      lost();
      await sleep(20);
    }
  };
  return {
    world,
    view,
    target,
    earth,
    itrf,
    frames,
    async ready() {
      // Frames until no draw uses a stand-in (a custom shader's clipped
      // pipelines compile in the background).
      for (let i = 0; i < 400 && !world.ready(); i++) {
        await frames(1);
      }
      await frames(3);
    },
    async capture() {
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

/** The pixel a point projects to (the camera looks along its direction, aspect 1). */
function pixelOf(view: View, p: V3): { x: number; y: number } {
  const c = view.camera;
  const t = Math.tan(c.fovy(WIDTH / HEIGHT) / 2);
  const d = [0, 1, 2].map((i) => p[i]! - c.position[i]!) as V3;
  const dot = (a: ArrayLike<number>) =>
    a[0]! * d[0] + a[1]! * d[1] + a[2]! * d[2];
  const depth = dot(c.direction);
  return {
    x: ((dot(c.right) / (depth * t) + 1) / 2) * WIDTH - 0.5,
    y: ((1 - dot(c.up) / (depth * t)) / 2) * HEIGHT - 0.5,
  };
}

/** The mean colour of the (2r + 1)² pixels about (x, y), 0 to 255. */
function mean(pixels: Uint8ClampedArray, x: number, y: number, r = 3): Rgb {
  const sum = [0, 0, 0];
  let n = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const o = (Math.round(y + dy) * WIDTH + Math.round(x + dx)) * 4;
      for (let k = 0; k < 3; k++) {
        sum[k] = sum[k]! + pixels[o + k]!;
      }
      n++;
    }
  }
  return [sum[0]! / n, sum[1]! / n, sum[2]! / n];
}

/** The share of pixels in a (2r + 1)² patch whose red channel is above 128. */
function redShare(
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  r: number,
): number {
  let red = 0;
  let n = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const o = (Math.round(y + dy) * WIDTH + Math.round(x + dx)) * 4;
      red += pixels[o]! > 128 ? 1 : 0;
      n++;
    }
  }
  return red / n;
}

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

const RED: [number, number, number, number] = [1, 0.1, 0.1, 1];
const BLUE: [number, number, number, number] = [0.1, 0.3, 1, 1];
const near = (a: number, b: number, tolerance: number) =>
  Math.abs(a - b) <= tolerance;
const rgb = (c: Rgb) => c.map((v) => Math.round(v)).join(",");
/** The 8-bit value the present pass writes for a linear value 0 to 1 (sRGB). */
const encode = (linear: number): number =>
  255 *
  (linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055);

/** The excavation: the slab, a pipe under it, the camera above. */
function excavation(s: Scene, pipeExempt: boolean): DrawHandle[] {
  const { world, view } = s;
  // One-sided (a terrain tile is a surface): a ghost of it is one layer.
  const slab = world.addDraw({
    mesh: world.addMesh(boxMesh([80, 80, 0.5])),
    parent: s.earth,
    origin: Float64Array.from([0, 0, R - 0.5]),
    color: RED,
    unlit: true,
  });
  const pipe = world.addDraw({
    mesh: world.addMesh(boxMesh([4, 70, 2])),
    parent: s.earth,
    origin: Float64Array.from([0, 0, R - 6]),
    color: BLUE,
    unlit: true,
    doubleSided: true,
    ...(pipeExempt ? { clipExempt: true } : {}),
  });
  look(view, [0, 0, R + CAMERA_HEIGHT], [0, 0, -1], [0, 1, 0]);
  return [slab, pipe];
}

/** A box 50 m across from 10 m below the ground to 4 m above it, removing what is inside. */
const pit = (effect?: ClipSet["effect"]): ClipSet => ({
  frame: undefined as never,
  shapes: [{ kind: "box", center: [0, 0, R - 3], halfExtents: [25, 25, 7] }],
  keep: "outside",
  ...(effect ? { effect } : {}),
});

function format(value: number | string): string {
  return typeof value === "string"
    ? value
    : Number.isInteger(value)
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

/** A custom shader that colours by the clip's distance: green kept, magenta removed, bands within 1 m. */
const DISTANCE_SHADER = /* wgsl */ `
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).unlit = true;
  if (fsInput.clipId == 0xffffffffu) {
    (*material).baseColor = vec3f(0.0, 0.0, 1.0);
    return;
  }
  let d = fsInput.clipDistance;
  var color = select(vec3f(0.0, 0.8, 0.0), vec3f(0.9, 0.0, 0.9), d > 0.0);
  if (abs(d) < 1.0) {
    color = vec3f(1.0, 1.0, 0.0);
  }
  (*material).baseColor = color * fsInput.clipParams.x;
}
`;

async function runClipEffects(): Promise<ClipEffectsResult> {
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
  engine.gpu.device.addEventListener("uncapturederror", (event) => {
    gpuErrors.push((event as GPUUncapturedErrorEvent).error.message);
  });
  let id = 1;
  const add = (
    name: string,
    measured: Record<string, number | string>,
    limit: string,
    pass: boolean,
  ) => checks.push({ id: id++, name, measured, limit, pass });
  try {
    await engine.ctx.pipelines.warmClipped();
    lost();

    // Where the scene's sample points land in the image.
    const probe = (s: Scene) => ({
      outside: pixelOf(s.view, [60, 60, R]),
      pit: pixelOf(s.view, [15, 15, R]),
      pipe: pixelOf(s.view, [0, 10, R]),
      pitEdge: pixelOf(s.view, [0, 24, R]),
    });

    // --- the references: no clips ---------------------------------------------
    let whole: { outside: Rgb; pit: Rgb; pipe: Rgb };
    {
      const s = scene(engine, lost);
      excavation(s, true);
      await s.frames(3);
      const pixels = await s.capture();
      show("whole: no clips", pixels);
      const p = probe(s);
      whole = {
        outside: mean(pixels, p.outside.x, p.outside.y),
        pit: mean(pixels, p.pit.x, p.pit.y),
        pipe: mean(pixels, p.pipe.x, p.pipe.y),
      };
      add(
        "references, no clips",
        {
          "ground (rgb)": rgb(whole.outside),
          "pipe seen through the ground? (rgb)": rgb(whole.pipe),
        },
        "the ground is red at both the pit and outside, and hides the pipe",
        whole.outside[0]! > 200 &&
          whole.outside[2]! < 100 &&
          whole.pit[0]! > 200 &&
          whole.pipe[0]! > 200,
      );
      s.dispose();
    }

    // --- 1. discard: the hole ---------------------------------------------------
    {
      const s = scene(engine, lost);
      excavation(s, true);
      view_clips(s, { ...pit(), frame: s.itrf });
      await s.frames(4);
      const pixels = await s.capture();
      show("1. discard: a hole, the exempt pipe shows", pixels);
      const p = probe(s);
      const outside = mean(pixels, p.outside.x, p.outside.y);
      const hole = mean(pixels, p.pit.x, p.pit.y);
      const pipe = mean(pixels, p.pipe.x, p.pipe.y);
      add(
        "discard: the slab inside the box is gone, the exempt pipe shows",
        {
          "outside (rgb)": rgb(outside),
          "hole (rgb)": rgb(hole),
          "pipe in the hole (rgb)": rgb(pipe),
        },
        "outside red; the hole shows the background; the pipe, exempt, is whole and blue",
        near(outside[0]!, whole.outside[0]!, 6) &&
          hole[0]! < 10 &&
          hole[1]! < 10 &&
          hole[2]! < 10 &&
          pipe[2]! > 200 &&
          pipe[0]! < 100,
      );
      s.dispose();
    }

    // --- 2. a blended ghost ------------------------------------------------------
    const ALPHA = 0.4;
    for (const method of ["moments", "exact"] as const) {
      const s = scene(engine, lost, { translucencyMethod: method });
      excavation(s, true);
      view_clips(s, {
        ...pit({ kind: "translucent", alpha: ALPHA }),
        frame: s.itrf,
      });
      await s.frames(6);
      const pixels = await s.capture();
      show(
        `2. translucent ghost, alpha 0.4 (${method}): the pipe through the ground`,
        pixels,
      );
      const p = probe(s);
      const outside = mean(pixels, p.outside.x, p.outside.y);
      const ghost = mean(pixels, p.pit.x, p.pit.y);
      const over = mean(pixels, p.pipe.x, p.pipe.y);
      // The blend of the ground over the pipe (and over nothing): α · ground +
      // (1 − α) · what is behind, in linear light, then the display's encoding.
      const ground = [1, 0.1, 0.1];
      const pipeLinear = [0.1, 0.3, 1];
      const expectedGhost = ground.map((v) => encode(ALPHA * v));
      const expectedOver = ground.map((v, k) =>
        encode(ALPHA * v + (1 - ALPHA) * pipeLinear[k]!),
      );
      add(
        `a blended ghost (${method} translucency): the ground inside the box is translucent over the pipe`,
        {
          "outside (rgb)": rgb(outside),
          "ghost over nothing (rgb)": rgb(ghost),
          expected: rgb(expectedGhost as Rgb),
          "ghost over the pipe (rgb)": rgb(over),
          "expected over the pipe": rgb(expectedOver as Rgb),
          "GPU errors": gpuErrors.length,
        },
        "outside unchanged; each channel of the ghost within 12 of α · ground + (1 − α) · behind, in linear light",
        near(outside[0]!, whole.outside[0]!, 6) &&
          expectedGhost.every((v, k) => near(ghost[k]!, v, 12)) &&
          expectedOver.every((v, k) => near(over[k]!, v, 12)) &&
          gpuErrors.length === 0,
      );
      s.dispose();
    }

    // --- 2b. the same ghost on a b-rep ground (GPU-diced faces) ------------------
    for (const method of ["moments", "exact"] as const) {
      const s = scene(engine, lost, { translucencyMethod: method });
      const [slab] = excavation(s, true);
      s.world.removeDraw(slab!);
      const b = new BrepBuilder();
      const v = b.vertex([0, 0, 0]);
      const e = b.edge(v, v, { tolerance: 1e-5 });
      const corners = [
        [0, 0],
        [160, 0],
        [160, 160],
        [0, 160],
      ] as const;
      b.face(b.plane([-80, -80, 0], [1, 0, 0], [0, 1, 0]), [
        corners.map((a, i) => ({
          edge: e,
          pcurve: [a, corners[(i + 1) % 4]!] as const,
        })),
      ]);
      const ground = s.world.addBrep(b.build(), {
        parent: s.earth,
        origin: Float64Array.from([0, 0, R]),
        material: s.world.addMaterial({
          baseColor: RED,
          flags: MaterialFlags.unlit,
        }),
        doubleSided: true,
      });
      view_clips(s, {
        ...pit({ kind: "translucent", alpha: ALPHA }),
        frame: s.itrf,
      });
      await s.ready();
      await s.frames(6);
      const pixels = await s.capture();
      show(`2b. b-rep ground, translucent ghost (${method})`, pixels);
      const p = probe(s);
      const outside = mean(pixels, p.outside.x, p.outside.y);
      const ghost = mean(pixels, p.pit.x, p.pit.y);
      const over = mean(pixels, p.pipe.x, p.pipe.y);
      const groundLinear = [1, 0.1, 0.1];
      const pipeLinear = [0.1, 0.3, 1];
      const expectedGhost = groundLinear.map((v) => encode(ALPHA * v));
      const expectedOver = groundLinear.map((v, k) =>
        encode(ALPHA * v + (1 - ALPHA) * pipeLinear[k]!),
      );
      add(
        `a blended ghost of a b-rep ground (${method} translucency): the faces inside the box are translucent over the pipe`,
        {
          "patch draw (1) or none (0)": ground.patches ? 1 : 0,
          "outside (rgb)": rgb(outside),
          "ghost over nothing (rgb)": rgb(ghost),
          expected: rgb(expectedGhost as Rgb),
          "ghost over the pipe (rgb)": rgb(over),
          "expected over the pipe": rgb(expectedOver as Rgb),
          "GPU errors": gpuErrors.length,
        },
        "the ground is a patch draw; outside it is whole; inside the box each channel is within 12 of α · ground + (1 − α) · behind, in linear light",
        ground.patches !== undefined &&
          outside[0]! > 200 &&
          outside[2]! < 100 &&
          expectedGhost.every((v, k) => near(ghost[k]!, v, 12)) &&
          expectedOver.every((v, k) => near(over[k]!, v, 12)) &&
          gpuErrors.length === 0,
      );
      s.dispose();
    }

    // --- 3. a stippled ghost -----------------------------------------------------
    {
      const s = scene(engine, lost);
      excavation(s, true);
      view_clips(s, {
        ...pit({ kind: "translucent", alpha: 0.5, method: "stipple" }),
        frame: s.itrf,
      });
      await s.frames(4);
      const pixels = await s.capture();
      show("3. stippled ghost, alpha 0.5", pixels);
      const p = probe(s);
      const share = redShare(pixels, p.pit.x, p.pit.y, 12);
      const outside = mean(pixels, p.outside.x, p.outside.y);
      add(
        "a stippled ghost: about half the ground's pixels inside the box",
        {
          "share of pixels the ground keeps": share,
          "outside (rgb)": rgb(outside),
        },
        "a share within 0.08 of the alpha, 0.5; outside unchanged",
        near(share, 0.5, 0.08) && near(outside[0]!, whole.outside[0]!, 6),
      );
      s.dispose();
    }

    // --- 4. nothing is exempt by default: the pipe is ghosted too ----------------
    {
      const s = scene(engine, lost);
      excavation(s, false);
      view_clips(s, {
        ...pit({ kind: "translucent", alpha: 0.4 }),
        frame: s.itrf,
      });
      await s.frames(6);
      const pixels = await s.capture();
      show("4. the pipe not exempt: ghosted with the ground", pixels);
      const p = probe(s);
      const over = mean(pixels, p.pipe.x, p.pipe.y);
      add(
        "a pipe that is not exempt is ghosted like the ground",
        { "over the pipe (rgb)": rgb(over) },
        "the pipe's blue is under 0.4 · 255 + the ground's contribution, no longer whole",
        over[2]! < 0.75 * 255 && over[2]! > 20 && over[0]! > 40,
      );
      s.dispose();
    }

    // --- 5. a custom shader reads the distance -----------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      const shader = new CustomShader({
        fragment: DISTANCE_SHADER,
        label: "clip distance colours",
      });
      await engine.compileShader(shader);
      // A thin wall facing the camera, cut across by a plane at x = 0 (the
      // side the normal points away from, x < 0, is kept).
      const wall = world.addDraw({
        mesh: world.addMesh(boxMesh([40, 0.05, 20])),
        parent: s.earth,
        origin: Float64Array.from([0, 0, R + 10]),
        color: [1, 1, 1, 1],
        unlit: true,
        doubleSided: true,
        shader,
      });
      look(view, [0, -60, R + 10], [0, 1, 0], [0, 0, 1]);
      const shade: ClipSet = {
        frame: s.itrf,
        shapes: [{ kind: "plane", point: [0, 0, R], normal: [1, 0, 0] }],
        effect: { kind: "shade", params: [1, 0, 0, 0] },
      };
      view.setClips([world.addClip(shade)]);
      await s.ready();
      void wall;
      const pixels = await s.capture();
      show("5. custom shader by clip distance: a shade set", pixels);
      let wrong = 0;
      let checked = 0;
      let magenta = 0;
      let green = 0;
      for (let py = 40; py < HEIGHT - 40; py += 3) {
        for (let px = 40; px < WIDTH - 40; px += 3) {
          // The wall's point at the pixel, the plane y = -0.05 (the face toward the camera).
          const c = view.camera;
          const t = Math.tan(c.fovy(WIDTH / HEIGHT) / 2);
          const nx = ((px + 0.5) / WIDTH) * 2 - 1;
          const ny = 1 - ((py + 0.5) / HEIGHT) * 2;
          const dir = [0, 1, 2].map(
            (i) => c.direction[i]! + c.right[i]! * nx * t + c.up[i]! * ny * t,
          ) as V3;
          const k = (-0.05 - c.position[1]!) / dir[1];
          const point: V3 = [
            c.position[0]! + k * dir[0],
            c.position[1]! + k * dir[1],
            c.position[2]! + k * dir[2],
          ];
          if (Math.abs(point[0]) > 39 || Math.abs(point[2] - (R + 10)) > 19) {
            continue;
          }
          const distance = clipSetDistance(shade, point);
          if (Math.abs(distance) < 1.5) {
            continue;
          }
          const o = (py * WIDTH + px) * 4;
          const [r, g, b] = [pixels[o]!, pixels[o + 1]!, pixels[o + 2]!];
          const isMagenta = r > 150 && g < 80 && b > 150;
          const isGreen = g > 120 && r < 80 && b < 80;
          checked++;
          magenta += isMagenta ? 1 : 0;
          green += isGreen ? 1 : 0;
          if (distance > 0 ? !isMagenta : !isGreen) {
            wrong++;
          }
        }
      }
      add(
        "a custom shader reads fsInput.clipDistance (a shade set keeps both sides)",
        { "pixels compared": checked, magenta, green, wrong },
        "every pixel clear of the plane's 1.5 m band is as float64's distance says: magenta where positive, green where negative",
        checked > 3000 && wrong === 0 && magenta > 500 && green > 500,
      );
      s.dispose();
    }

    // --- 6. discard that reports ---------------------------------------------------
    {
      const s = scene(engine, lost);
      const { world, view } = s;
      const shader = new CustomShader({
        fragment: DISTANCE_SHADER,
        label: "clip distance colours",
      });
      await engine.compileShader(shader);
      world.addDraw({
        mesh: world.addMesh(boxMesh([40, 0.05, 20])),
        parent: s.earth,
        origin: Float64Array.from([0, 0, R + 10]),
        color: [1, 1, 1, 1],
        unlit: true,
        doubleSided: true,
        shader,
      });
      look(view, [0, -60, R + 10], [0, 1, 0], [0, 0, 1]);
      const cut: ClipSet = {
        frame: s.itrf,
        shapes: [{ kind: "plane", point: [0, 0, R], normal: [1, 0, 0] }],
        effect: { kind: "discard", params: [1, 0, 0, 0] },
      };
      view.setClips([world.addClip(cut)]);
      await s.ready();
      const pixels = await s.capture();
      show("6. discard that reports: the kept side sees its distance", pixels);
      const left = pixelOf(view, [-20, 0, R + 10]);
      const right = pixelOf(view, [20, 0, R + 10]);
      const kept = mean(pixels, left.x, left.y);
      const gone = mean(pixels, right.x, right.y);
      add(
        "a discard set that reports: the kept side is coloured by its distance",
        { "kept (rgb)": rgb(kept), "removed (rgb)": rgb(gone) },
        "the kept side (distance < 0) is green; the removed side shows the background",
        kept[1]! > 120 &&
          kept[0]! < 80 &&
          gone[0]! < 10 &&
          gone[1]! < 10 &&
          gone[2]! < 10,
      );
      s.dispose();
    }

    // --- 7. a view without the clips draws everything -----------------------------
    {
      const s = scene(engine, lost);
      excavation(s, true);
      const clip = s.world.addClip({
        ...pit({ kind: "translucent", alpha: 0.4 }),
        frame: s.itrf,
      });
      s.view.setClips([clip]);
      await s.frames(4);
      s.view.setClips([]);
      await s.frames(4);
      const pixels = await s.capture();
      const p = probe(s);
      const back = mean(pixels, p.pit.x, p.pit.y);
      show("7. the mask cleared: whole again", pixels);
      add(
        "clearing the view's clips restores the content",
        { "pit (rgb)": rgb(back), "GPU errors": gpuErrors.length },
        "the pit is the whole ground again",
        near(back[0]!, whole.pit[0]!, 6) && gpuErrors.length === 0,
      );
      s.dispose();
    }
  } finally {
    stop(engine);
  }
  render(checks);
  status.textContent = checks.every((c) => c.pass)
    ? "All checks pass."
    : "Some checks FAIL.";
  $("adapter").textContent = describe(engine);
  return {
    adapter: describe(engine),
    checks,
    pass: checks.every((c) => c.pass),
  };
}

/** Sets the scene's only clip: the view uses it. */
function view_clips(s: Scene, set: ClipSet): void {
  s.view.setClips([s.world.addClip(set)]);
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return {
      run: runClipEffects,
      entries: {
        runClipBench: () => runBench(root),
        runClipBenchCustom: () => runBench(root, true),
        runClipBench4k: () => runBench(root, false, "uhd"),
        runClipBenchCustom4k: () => runBench(root, true, "uhd"),
      },
      dispose: () => stop(active),
    };
  },
};
