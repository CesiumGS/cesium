// The globe, a billboard and anchored content across a warp on the GPU
// (plan §13.26, increment 4; the Node test is test/warpGlobe.test.ts, and
// spikes/warpRoute.ts is the model). A view's rig sits on `exaggerated`, a
// `verticalExaggeration` of 10 over ITRF with a scale the page moves. Near
// the north pole, unlit and in flat colours:
//
//   green    a terrain tile carrying h·n̂ (exact in height, no fit)
//   blue     the same tile without it (fitted per vertex)
//   red      a billboard, anchored (its anchor goes through the route)
//   yellow   a pole, `warpAt: "anchor"` (moved rigidly, not stretched)
//
// Each item's bounding box in the image is compared with the one the float64
// route (`routeForward`) and the view's projection give: within 1.5 px, at
// scale 1 and 0.4 (one float, no refit of the exact tile). Then the globe
// (`Engine.addEllipsoid`) is added and its tiles, generated in a worker, must
// come to be drawn under the warp, carrying h·n̂ and exact.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { routeForward } from "../src/camera/route.ts";
import {
  createFrameCatalog,
  createFramesResolver,
  verticalExaggeration,
  warpFrame,
} from "../src/frames/index.ts";
import { HEIGHT_NORMAL_ATTRIBUTE } from "../src/globe/heightNormal.ts";
import {
  EARTH,
  Ellipsoid,
  Engine,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  createBillboard,
  type MeshData,
  type World,
} from "../src/index.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";

const TEMPLATE = `
<h1>The globe, a billboard and anchored content across a warp</h1>
<p>
  A view whose rig sits on a warp frame that multiplies height by 10, with a
  scale (one float). A terrain tile with exact heights, one fitted, a
  billboard and a pole kept upright, each measured in the image against where
  the route puts it; then the globe, whose generated tiles must be drawn
  exactly under the warp.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 512;
const HEIGHT = 512;
const K = 10;
/** The ellipsoid's polar radius: the quads stand on it at the north pole. */
const POLE = Ellipsoid.WGS84.radii[2]!;
/** The camera's height above the pole in render space, m. */
const EYE = POLE + 300;
const TURN = (7 * Math.PI) / 180;
/** Pixels a measured box may differ from the route's. */
const LIMIT = 1.5;
/** The tile: 8 × 8 cells over this many metres, its heights metres above the ellipsoid. */
const TILE = 20;
const GRID = 9;
const height = (x: number, y: number): number =>
  3 + 2 * Math.sin(x * 0.4) * Math.cos(y * 0.35);

type Rgb = readonly [number, number, number];
const GREEN: Rgb = [0, 1, 0];
const BLUE: Rgb = [0, 0, 1];
const RED: Rgb = [1, 0, 0];
const YELLOW: Rgb = [1, 1, 0];

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface WarpGlobeResult {
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

/** The tile's mesh around its origin: a grid of ellipsoid-height `height` vertices, with `h·n̂` when asked. */
function tileMesh(withHeightNormal: boolean): MeshData {
  const positions = new Float32Array(GRID * GRID * 3);
  const attribute = new Float32Array(GRID * GRID * 3);
  const indices: number[] = [];
  const carto = { longitude: 0, latitude: 0, height: 0 };
  const up = new Float64Array(3);
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const x = (i / (GRID - 1) - 0.5) * TILE;
      const y = (j / (GRID - 1) - 0.5) * TILE;
      const p = [x, y, POLE + height(x, y)];
      const k = j * GRID + i;
      positions.set([x, y, height(x, y)], k * 3);
      if (withHeightNormal) {
        // h·n̂ from the ellipsoid itself, as the terrain worker makes it.
        Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(p), carto);
        Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(carto, up);
        attribute.set(
          [carto.height * up[0]!, carto.height * up[1]!, carto.height * up[2]!],
          k * 3,
        );
      }
      if (i + 1 < GRID && j + 1 < GRID) {
        indices.push(k, k + 1, k + GRID, k + 1, k + GRID + 1, k + GRID);
      }
    }
  }
  return {
    positions,
    indices: Uint32Array.from(indices),
    ...(withHeightNormal
      ? {
          attributes: {
            [HEIGHT_NORMAL_ATTRIBUTE]: { data: attribute, components: 3 },
          },
        }
      : {}),
  };
}

/**
 * A slab leaning up and away from its origin, seen from above as a square
 * (a vertical plane would be edge-on to the camera and draw nothing).
 */
const POLE_MESH: MeshData = {
  positions: Float32Array.of(-3, -3, 0, 3, -3, 0, 3, 3, 14, -3, 3, 14),
  indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
};

/** Where each item stands in ITRF: east of the pole, apart enough not to hide one another at ×10. */
const AT = { green: -75, blue: -25, red: 25, yellow: 75 } as const;

/** Frames before giving up on a wait, whatever the timers do. */
const FRAME_LIMIT = 2_000;

async function runWarpGlobe(): Promise<WarpGlobeResult> {
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
  try {
    const world: World = engine.createWorld({
      maxDraws: 20_000,
      vertexBytes: 1 << 26,
      indexBytes: 1 << 26,
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
    const scale = world.createPlacementParameter(1, { range: [0, 1] });
    const exaggeration = verticalExaggeration({ factor: K, scale });
    const exaggerated = warpFrame("exaggerated", itrf, exaggeration);
    catalog.add(exaggerated);
    engine.cameras.setResolver(world, createFramesResolver(catalog));
    const earth = world.bodyAnchor(EARTH);
    engine.cameras.setRig(view, {
      position: { frame: exaggerated },
      orientation: { kind: "free" },
    });
    view.camera.position.set([0, 0, EYE]);
    view.camera.orient(Float64Array.of(Math.sin(TURN), Math.cos(TURN), 0));
    view.camera.version++;
    // The anchors are known after one frame; content added after is held
    // until it is drawn warped.
    engine.renderFrame();

    const exact = tileMesh(true);
    const plain = tileMesh(false);
    const at = (x: number, h = 0) => Float64Array.of(x, 0, POLE + h);
    const draws = {
      green: world.addDraw({
        mesh: world.addMesh(exact),
        parent: earth,
        origin: at(AT.green),
        color: [...GREEN, 1],
        unlit: true,
        doubleSided: true,
      }),
      blue: world.addDraw({
        mesh: world.addMesh(plain),
        parent: earth,
        origin: at(AT.blue),
        color: [...BLUE, 1],
        unlit: true,
        doubleSided: true,
      }),
      red: world.addDraw({
        mesh: world.addMesh(createBillboard()),
        parent: earth,
        origin: at(AT.red, 4),
        color: [...RED, 1],
        billboard: { size: 20 },
      }),
      yellow: world.addDraw({
        mesh: world.addMesh(POLE_MESH),
        parent: earth,
        origin: at(AT.yellow),
        color: [...YELLOW, 1],
        unlit: true,
        doubleSided: true,
        warpAt: "anchor",
      }),
    };
    world.setDrawGeometricError(draws.green, 0.05);
    world.setDrawGeometricError(draws.blue, 0.05);
    world.setDrawHeightNormal(draws.green, {
      radii: [...Ellipsoid.WGS84.radii] as [number, number, number],
      maxDistance: 6,
    });
    let fits = 0;
    const cache = world.warps.cache;
    const run = cache.run.bind(cache);
    cache.run = (budget, now) => {
      const n = run(budget, now);
      fits += n;
      return n;
    };

    /** Frames, waiting for the GPU between them (timers may be throttled), until the warp context has nothing pending and `ready` holds. */
    const settle = async (ready: () => boolean): Promise<number> => {
      let calm = 0;
      for (let frame = 0; frame < FRAME_LIMIT; frame++) {
        engine.renderFrame();
        await engine.gpu.device.queue.onSubmittedWorkDone();
        lost();
        calm = world.warps.pending === 0 && ready() ? calm + 1 : 0;
        if (calm >= 3) {
          return frame;
        }
      }
      throw new Error(`still pending after ${FRAME_LIMIT} frames`);
    };
    const drawn = () =>
      Object.values(draws).every(
        (d) => world.warps.status(d)?.state === "fitted",
      );
    const keys = ["green", "blue", "red", "yellow"] as const;
    const colours: Record<(typeof keys)[number], Rgb> = {
      green: GREEN,
      blue: BLUE,
      red: RED,
      yellow: YELLOW,
    };

    let id = 1;
    for (const [name, s] of [
      [`scale 1: height × ${K}`, 1],
      [`scale 0.4: height × ${1 + 0.4 * (K - 1)}, one float written`, 0.4],
    ] as const) {
      const fitsBefore = fits;
      scale.value = s;
      await settle(drawn);
      const fitsRun = fits - fitsBefore;
      const route = view.anchorRoute(earth)!;
      const drawnPixel = (p: ArrayLike<number>): [number, number] => {
        const q = view.toPixel(p, world.root);
        if (!q) {
          throw new Error("a point is behind the camera");
        }
        return [q[0]!, q[1]!];
      };
      const project = (p: ArrayLike<number>) =>
        drawnPixel(routeForward(route, p));
      const boxes = {
        green: expectedBox(exact, AT.green, 0, project),
        blue: expectedBox(plain, AT.blue, 0, project),
        red: billboardBox(project(at(AT.red, 4)), 20),
        yellow: poleBox(at(AT.yellow), route, drawnPixel),
      };
      const measured: Record<string, number> = {};
      let worst = 0;
      // One item at a time: nothing hides another at ×10.
      for (const key of keys) {
        for (const other of keys) {
          world.setVisible(draws[other], other === key);
        }
        engine.renderFrame();
        await engine.gpu.device.queue.onSubmittedWorkDone();
        const pixels = await target.read();
        lost();
        const got = measureBox(pixels, colours[key]);
        const want = boxes[key];
        const e = got
          ? Math.max(...got.map((v, i) => Math.abs(v - want[i]!)))
          : Infinity;
        measured[`${key}: box edge, GPU − route, px (largest of 4)`] = e;
        worst = Math.max(worst, e);
      }
      for (const key of keys) {
        world.setVisible(draws[key], true);
      }
      engine.renderFrame();
      await engine.gpu.device.queue.onSubmittedWorkDone();
      show(name, await target.read());
      measured["fits run for this capture"] = fitsRun;
      checks.push({
        id: id++,
        name,
        measured,
        limit: `every box within ${LIMIT} px of the route's${s === 0.4 ? "; only the billboard and pole evaluated again, the exact tile and the fitted one not refitted" : ""}`,
        pass: worst <= LIMIT && (s === 1 || fitsRun === 2),
      });
    }
    const states = Object.fromEntries(
      Object.entries(draws).map(([k, d]) => [k, world.warps.status(d)]),
    );
    checks.push({
      id: id++,
      name: "each kind's term",
      measured: {
        "green exact (1 = yes)": states.green?.exact ? 1 : 0,
        "blue exact (0 = fitted)": states.blue?.exact ? 1 : 0,
        "red anchored (1 = yes)": states.red?.at === "anchor" ? 1 : 0,
        "yellow anchored (1 = yes)": states.yellow?.at === "anchor" ? 1 : 0,
      },
      limit: "green exact, blue fitted, red and yellow anchored",
      pass:
        states.green?.exact === true &&
        states.blue?.exact === false &&
        states.red?.at === "anchor" &&
        states.yellow?.at === "anchor",
    });

    // The globe: tiles generated in a worker, drawn under the warp.
    const own = new Set<number>(Object.values(draws).map((d) => d.index));
    const globe = engine.addEllipsoid(world);
    let globeDraws: DrawHandle[] = [];
    // Waited by frames, not timers: until tiles have loaded and none is
    // pending for five frames in a row. A draw uploaded in a frame is pending
    // until the next, so the longest a draw stays pending is what shows a stall.
    const waited = new Map<number, number>();
    let longest = 0;
    let lastLoaded = -1;
    let quiet = 0;
    for (let frame = 0; frame < FRAME_LIMIT && quiet < 5; frame++) {
      engine.renderFrame();
      await engine.gpu.device.queue.onSubmittedWorkDone();
      lost();
      globeDraws = warped(world, own);
      const pending = globeDraws.filter(
        (d) => world.warps.status(d)?.state === "pending",
      );
      const now = new Map<number, number>();
      for (const d of pending) {
        const n = (waited.get(d.index) ?? 0) + 1;
        now.set(d.index, n);
        longest = Math.max(longest, n);
      }
      waited.clear();
      now.forEach((n, k) => waited.set(k, n));
      const loaded = globe.stats.loaded;
      quiet =
        loaded >= 6 && loaded === lastLoaded && pending.length === 0
          ? quiet + 1
          : 0;
      lastLoaded = loaded;
    }
    const exactDraws = globeDraws.filter(
      (d) => world.warps.status(d)?.exact,
    ).length;
    const pendingNow = globeDraws.filter(
      (d) => world.warps.status(d)?.state === "pending",
    ).length;
    checks.push({
      id: id++,
      name: "the globe's tiles under the warp",
      measured: {
        "tiles loaded": globe.stats.loaded,
        "tile draws warped": globeDraws.length,
        "of them exact (no fit)": exactDraws,
        "fitted instead": globeDraws.length - exactDraws - pendingNow,
        "still pending": pendingNow,
        "most frames one draw stayed pending": longest,
      },
      limit:
        "tiles loaded; every draw drawn and exact; none pending for more than 30 frames",
      pass:
        globe.stats.loaded >= 6 &&
        globeDraws.length > 0 &&
        pendingNow === 0 &&
        exactDraws === globeDraws.length &&
        longest <= 30,
    });
    engine.removeTileset(globe);
  } finally {
    $("adapter").textContent = `Adapter: ${describe(engine)}`;
    stop(engine);
    render(checks);
    const failed = checks.filter((c) => !c.pass);
    status.textContent = failed.length
      ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
      : `pass: all ${checks.length} checks`;
    if (failed.length) {
      console.error(
        `[warpGlobe] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    checks,
    pass: checks.length === 4 && checks.every((c) => c.pass),
  };
}

/** The draws of the world drawn warped now, other than `except`. */
function warped(world: World, except: ReadonlySet<number>): DrawHandle[] {
  const out: DrawHandle[] = [];
  const raster = world.raster;
  for (let index = 0; index < raster.drawCount; index++) {
    if (raster.drawBatches[index] === undefined || except.has(index)) {
      continue;
    }
    const handle: DrawHandle = {
      index,
      generation: raster.drawGeneration[index]!,
      name: undefined,
    };
    if (world.warps.has(handle)) {
      out.push(handle);
    }
  }
  return out;
}

type Box = [number, number, number, number];

/** [left, top, right, bottom] of the route's image of a tile's vertices, px. */
function expectedBox(
  mesh: MeshData,
  x: number,
  h: number,
  project: (p: ArrayLike<number>) => [number, number],
): Box {
  let box: Box = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length / 3; i++) {
    const p = project([
      x + mesh.positions[i * 3]!,
      mesh.positions[i * 3 + 1]!,
      POLE + h + mesh.positions[i * 3 + 2]!,
    ]);
    box = [
      Math.min(box[0], p[0]),
      Math.min(box[1], p[1]),
      Math.max(box[2], p[0]),
      Math.max(box[3], p[1]),
    ];
  }
  return box;
}

function billboardBox(center: [number, number], size: number): Box {
  return [
    center[0] - size / 2,
    center[1] - size / 2,
    center[0] + size / 2,
    center[1] + size / 2,
  ];
}

/** The pole kept rigid: the route's image of its origin, plus its own offsets, then the projection. */
function poleBox(
  origin: Float64Array,
  route: Parameters<typeof routeForward>[0],
  drawnPixel: (p: ArrayLike<number>) => [number, number],
): Box {
  const moved = routeForward(route, origin);
  let box: Box = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < POLE_MESH.positions.length / 3; i++) {
    const px = drawnPixel(
      [0, 1, 2].map((a) => moved[a]! + POLE_MESH.positions[i * 3 + a]!),
    );
    box = [
      Math.min(box[0], px[0]),
      Math.min(box[1], px[1]),
      Math.max(box[2], px[0]),
      Math.max(box[3], px[1]),
    ];
  }
  return box;
}

/** The bounding box of the pixels that are `rgb` (each channel high or low). */
function measureBox(pixels: Uint8ClampedArray, rgb: Rgb): Box | undefined {
  let box: Box = [Infinity, Infinity, -Infinity, -Infinity];
  let any = false;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const o = (y * WIDTH + x) * 4;
      const match = rgb.every((c, k) =>
        c === 1 ? pixels[o + k]! > 180 : pixels[o + k]! < 70,
      );
      if (match) {
        any = true;
        box = [
          Math.min(box[0], x),
          Math.min(box[1], y),
          Math.max(box[2], x + 1),
          Math.max(box[3], y + 1),
        ];
      }
    }
  }
  return any ? box : undefined;
}

function show(caption: string, pixels: Uint8ClampedArray): void {
  const figure = document.createElement("figure");
  const label = document.createElement("figcaption");
  label.textContent = caption;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.borderRadius = "4px";
  canvas
    .getContext("2d")!
    .putImageData(new ImageData(new Uint8ClampedArray(pixels), WIDTH), 0, 0);
  figure.append(label, canvas);
  $("images").append(figure);
}

function describe(engine: Engine): string {
  const info = engine.gpu.adapter.info;
  return `${info.vendor} ${info.architecture} ${info.description}`;
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

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runWarpGlobe, dispose: () => stop(active) };
  },
};
