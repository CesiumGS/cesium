// One world drawn in three views, each by its own route (plan §13.37, "one
// view's content under different transforms"; the Node test is
// test/warpViewVariants.test.ts). The Earth's content sits in a switch frame
// under ITRF whose edge is chosen per view:
//
//   view A   vertical exaggeration × 10        (the draws themselves)
//   view B   the identity: the true place      (a twin of each draw, unwarped)
//   view C   a height offset of 60 m           (a twin of each draw, its own compiled route)
//
// Near the north pole, unlit and in flat colours:
//
//   green    a terrain tile carrying h·n̂ (exact in height in A, no fit)
//   blue     the same tile without it (drawn by a compiled route in A and C)
//   yellow   a slab standing 6 m up: a building whose top is drawn at 60 m in
//            A, 6 m in B and 66 m in C
//
// Each item's bounding box in each view's image is compared with the one the
// float64 route of that view (`routeForward`, or none for B) and the view's
// projection give: within 1.5 px. Then the globe (`Engine.addEllipsoid`) is
// added: its tiles are exact in A and drawn in B and C by twins. Then B and C
// go away: their twins must be released, and A's image must not change.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { routeForward } from "../src/camera/route.ts";
import {
  createFrameCatalog,
  createFramesResolver,
  switchFrame,
  type SwitchChoice,
} from "../src/frames/index.ts";
import {
  heightOffset,
  verticalExaggeration,
} from "../src/georeference/index.ts";
import { HEIGHT_NORMAL_ATTRIBUTE } from "../src/globe/heightNormal.ts";
import { RECORD_WORDS, VIEW_MASK_WORD } from "../src/render/layout.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import {
  EARTH,
  Ellipsoid,
  Engine,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  type MeshData,
  type View,
  type World,
} from "../src/index.ts";

const TEMPLATE = `
<h1>One world, three views, three routes</h1>
<p>
  The Earth's content in a switch frame: view A exaggerates height ten times,
  view B shows the true place, view C lifts everything 60 m. Each view's
  image is measured against its own route's image of a terrain tile with
  exact heights, one drawn by a compiled route, and a building. Then two
  views go away and their draws must be released.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 384;
const HEIGHT = 384;
const K = 10;
const LIFT = 60;
/** The ellipsoid's polar radius: the items stand on it at the north pole. */
const POLE = Ellipsoid.WGS84.radii[2]!;
/** The camera's height above the pole in render space, m. */
const EYE = POLE + 300;
const TURN = (7 * Math.PI) / 180;
/** Pixels a measured box may differ from the route's. */
const LIMIT = 1.5;
const TILE = 20;
const GRID = 9;
const height = (x: number, y: number): number =>
  3 + 2 * Math.sin(x * 0.4) * Math.cos(y * 0.35);

type Rgb = readonly [number, number, number];
const GREEN: Rgb = [0, 1, 0];
const BLUE: Rgb = [0, 0, 1];
const YELLOW: Rgb = [1, 1, 0];

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface WarpViewsResult {
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

/** A slab leaning up and away from its origin, seen from above as a square. */
const BUILDING: MeshData = {
  positions: Float32Array.of(-3, -3, 0, 3, -3, 0, 3, 3, 6, -3, 3, 6),
  indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
};

/** Where each item stands in ITRF: east of the pole, apart enough not to hide one another at ×10. */
const AT = { green: -75, blue: -25, yellow: 50 } as const;

/** Frames before giving up on a wait, whatever the timers do, and the time a wait may take once it has run 100 of them. */
const FRAME_LIMIT = 20_000;
const TIME_LIMIT_MS = 60_000;

type Item = keyof typeof AT;
const ITEMS = ["green", "blue", "yellow"] as const;
const COLOURS: Record<Item, Rgb> = {
  green: GREEN,
  blue: BLUE,
  yellow: YELLOW,
};

async function runWarpViews(): Promise<WarpViewsResult> {
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
      maxDraws: 200,
      vertexBytes: 1 << 24,
      indexBytes: 1 << 24,
    });
    const targets = [0, 1, 2].map(() => new OffscreenTarget(WIDTH, HEIGHT));
    const views: View[] = targets.map((target) =>
      engine.addView({
        target,
        world,
        background: "color",
        clearColor: [0, 0, 0],
        observer: { exposure: UNITLESS_EXPOSURE },
      }),
    );
    const [a, b, c] = views as [View, View, View];
    const names = [
      "A: height × 10",
      "B: the true place",
      `C: lifted ${LIFT} m`,
    ];
    const catalog = createFrameCatalog();
    const itrf = catalog.get("ITRF");
    const choices: Array<SwitchChoice> = [
      verticalExaggeration({ factor: K }),
      "identity",
      heightOffset(LIFT),
    ];
    const chart = switchFrame("chart", itrf, {
      byView: new Map<object, SwitchChoice>(
        views.map((view, i) => [view, choices[i]!]),
      ),
    });
    catalog.add(chart);
    const resolver = createFramesResolver(catalog);
    engine.cameras.setResolver(world, resolver);
    const earth = world.bodyAnchor(EARTH);
    resolver.bindAnchor(earth, chart);
    for (const view of views) {
      engine.cameras.setRig(view, {
        position: { frame: itrf },
        orientation: { kind: "free" },
      });
      view.camera.position.set([0, 0, EYE]);
      view.camera.orient(Float64Array.of(Math.sin(TURN), Math.cos(TURN), 0));
      view.camera.version++;
    }
    // The anchors are known after one frame; content added after is held
    // until it is drawn.
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
      yellow: world.addDraw({
        mesh: world.addMesh(BUILDING),
        parent: earth,
        origin: at(AT.yellow),
        color: [...YELLOW, 1],
        unlit: true,
        doubleSided: true,
      }),
    };
    world.setDrawGeometricError(draws.green, 0.05);
    world.setDrawGeometricError(draws.blue, 0.05);
    world.setDrawHeightNormal(draws.green, {
      radii: [...Ellipsoid.WGS84.radii] as [number, number, number],
      maxDistance: 6,
    });

    /** Frames, waiting for the GPU between them, until nothing is pending and `ready` holds: pipelines compile asynchronously, and the first run on a cold cache takes seconds. */
    const settle = async (ready: () => boolean): Promise<number> => {
      let calm = 0;
      const start = performance.now();
      for (let frame = 0; frame < FRAME_LIMIT; frame++) {
        engine.renderFrame();
        await engine.gpu.device.queue.onSubmittedWorkDone();
        lost();
        calm = world.warps.pending === 0 && ready() ? calm + 1 : 0;
        if (calm >= 3) {
          return frame;
        }
        if (frame > 100 && performance.now() - start > TIME_LIMIT_MS) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      throw new Error(`still pending after ${FRAME_LIMIT} frames`);
    };
    const twins = () => world.warpStats().variants.draws;
    const drawn = () => {
      const { draws: counts } = world.warpStats();
      return twins() === 6 && counts.pending === 0;
    };
    await settle(drawn);

    const measure = async (
      i: number,
      captures: Record<string, number>,
      label: string,
    ): Promise<number> => {
      const view = views[i]!;
      const route = view.anchorRoute(earth);
      const project = (p: ArrayLike<number>): [number, number] => {
        const q = view.toPixel(route ? routeForward(route, p) : p, world.root);
        if (!q) {
          throw new Error("a point is behind the camera");
        }
        return [q[0]!, q[1]!];
      };
      const boxes = {
        green: expectedBox(exact, AT.green, project),
        blue: expectedBox(plain, AT.blue, project),
        yellow: expectedBox(BUILDING, AT.yellow, project),
      };
      let worst = 0;
      // One item at a time: nothing hides another at ×10.
      for (const key of ITEMS) {
        for (const other of ITEMS) {
          world.setVisible(draws[other], other === key);
        }
        engine.renderFrame();
        await engine.gpu.device.queue.onSubmittedWorkDone();
        const pixels = await targets[i]!.read();
        lost();
        const got = measureBox(pixels, COLOURS[key]);
        const want = boxes[key];
        const e = got
          ? Math.max(...got.map((v, k) => Math.abs(v - want[k]!)))
          : Infinity;
        captures[`${label} ${key}: box edge, GPU − route, px (largest of 4)`] =
          e;
        worst = Math.max(worst, e);
        if (key === "yellow") {
          captures[`${label} building's width, px`] = got
            ? got[2] - got[0]
            : -1;
        }
      }
      for (const key of ITEMS) {
        world.setVisible(draws[key], true);
      }
      engine.renderFrame();
      await engine.gpu.device.queue.onSubmittedWorkDone();
      show(`${label}`, await targets[i]!.read());
      return worst;
    };

    let id = 1;
    const measured: Record<string, number> = {};
    const worst = [] as number[];
    for (let i = 0; i < views.length; i++) {
      worst.push(await measure(i, measured, names[i]!));
    }
    checks.push({
      id: id++,
      name: "each view's image against its own route",
      measured,
      limit: `every box within ${LIMIT} px of the route's image, in A (×${K}), B (true) and C (+${LIFT} m)`,
      pass: worst.every((w) => w <= LIMIT),
    });

    const width = (label: string) => measured[`${label} building's width, px`]!;
    // Nearer the camera the building is wider: ×10 puts its top 60 m up, +60 m lifts all of it.
    const wider = width(names[0]!) - width(names[1]!);
    const lifted = width(names[2]!) - width(names[1]!);
    const stats = world.warpStats();
    checks.push({
      id: id++,
      name: "the draws behind the views",
      measured: {
        "groups of views": stats.variants.groups,
        "twin draws (one for each item in B and C)": stats.variants.draws,
        "building's width in A, more than in B, px": wider,
        "building's width in C, more than in B, px": lifted,
        "A, the exact tile (1 = yes)": world.warps.status(draws.green)?.exact
          ? 1
          : 0,
        "A, the building drawn by a compiled route (1 = yes)":
          world.warps.status(draws.yellow)?.routed ? 1 : 0,
      },
      limit:
        "3 groups and 6 twins; the building is wider in A (×10) and in C (+60 m) than in B; A's tile exact and its building routed",
      pass:
        stats.variants.groups === 3 &&
        stats.variants.draws === 6 &&
        wider > 5 &&
        lifted > 1 &&
        world.warps.status(draws.green)?.exact === true &&
        world.warps.status(draws.yellow)?.routed === true,
    });

    // The globe: tiles generated in a worker, each drawn in A by its exact
    // height term and in B and C by twins. Waited by frames until tiles have
    // loaded and none is pending for five frames in a row.
    const ownIndices = new Set<number>();
    const raster = world.raster;
    const sourcesNow = (): DrawHandle[] => {
      const out: DrawHandle[] = [];
      for (let index = 0; index < raster.drawCount; index++) {
        const handle: DrawHandle = {
          index,
          generation: raster.drawGeneration[index]!,
          name: undefined,
        };
        if (
          raster.drawBatches[index] !== undefined &&
          !ownIndices.has(index) &&
          world.warps.variants.sourceOf(handle) === undefined &&
          world.warps.has(handle)
        ) {
          out.push(handle);
        }
      }
      return out;
    };
    for (const d of Object.values(draws)) {
      ownIndices.add(d.index);
      for (const view of [b, c]) {
        ownIndices.add(world.drawForRoute(d, view.anchorRoute(earth)).index);
      }
    }
    const globe = engine.addEllipsoid(world);
    let lastLoaded = -1;
    let quiet = 0;
    for (let frame = 0; frame < FRAME_LIMIT && quiet < 5; frame++) {
      engine.renderFrame();
      await engine.gpu.device.queue.onSubmittedWorkDone();
      lost();
      const loaded = globe.stats.loaded;
      quiet =
        loaded >= 6 &&
        loaded === lastLoaded &&
        world.warpStats().draws.pending === 0
          ? quiet + 1
          : 0;
      lastLoaded = loaded;
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    const maskOf = (d: DrawHandle) =>
      raster.recordsU32[d.index * RECORD_WORDS + VIEW_MASK_WORD]!;
    const bits = views.map((v) => (1 << engine.scene.viewIds.get(v)!) >>> 0);
    const tiles = sourcesNow();
    let exactTiles = 0;
    let leaked = 0;
    let shownB = 0;
    let shownC = 0;
    for (const tile of tiles) {
      exactTiles += world.warps.status(tile)?.exact ? 1 : 0;
      // A source shows in A only.
      leaked += (maskOf(tile) & ((bits[1]! | bits[2]!) >>> 0)) !== 0 ? 1 : 0;
      const forB = world.drawForRoute(tile, b.anchorRoute(earth));
      const forC = world.drawForRoute(tile, c.anchorRoute(earth));
      shownB += forB.index !== tile.index && maskOf(forB) !== 0 ? 1 : 0;
      shownC += forC.index !== tile.index && maskOf(forC) !== 0 ? 1 : 0;
    }
    checks.push({
      id: id++,
      name: "the globe's tiles in three views",
      measured: {
        "tiles loaded": globe.stats.loaded,
        "tile draws (A's)": tiles.length,
        "of them exact in A (no fit)": exactTiles,
        "shown in B by a twin": shownB,
        "shown in C by a twin": shownC,
        "A's draws that also show in B or C": leaked,
        "twin draws in all": world.warpStats().variants.draws,
        "still pending": world.warpStats().draws.pending,
      },
      limit:
        "tiles loaded; every tile exact in A and in no other view; twins show tiles in B and in C; none pending",
      pass:
        globe.stats.loaded >= 6 &&
        tiles.length > 0 &&
        exactTiles === tiles.length &&
        leaked === 0 &&
        shownB > 0 &&
        shownC > 0 &&
        world.warpStats().draws.pending === 0,
    });
    engine.removeTileset(globe);
    await settle(() => twins() === 6);

    // B and C go away: their twins are released and A is as it was.
    const before = await targets[0]!.read();
    engine.removeView(b);
    engine.removeView(c);
    await settle(() => twins() === 0);
    const after = await measureOnly(engine, targets[0]!, lost);
    let differing = 0;
    for (let k = 0; k < before.length; k++) {
      if (Math.abs(before[k]! - after[k]!) > 2) {
        differing++;
      }
    }
    checks.push({
      id: id++,
      name: "the twins are released with their views",
      measured: {
        "twin draws left": world.warpStats().variants.draws,
        "groups left": world.warpStats().variants.groups,
        "A's image, channels that changed": differing,
      },
      limit: "no twin or group is left, and A's image does not change",
      pass:
        world.warpStats().variants.draws === 0 &&
        world.warpStats().variants.groups === 0 &&
        differing === 0,
    });
    void a;
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
        `[warpViews] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    checks,
    pass: checks.length === 4 && checks.every((c) => c.pass),
  };
}

/** A frame, then the target's pixels. */
async function measureOnly(
  engine: Engine,
  target: OffscreenTarget,
  lost: () => void,
): Promise<Uint8ClampedArray> {
  engine.renderFrame();
  await engine.gpu.device.queue.onSubmittedWorkDone();
  const pixels = await target.read();
  lost();
  return pixels;
}

type Box = [number, number, number, number];

/** [left, top, right, bottom] of the route's image of an item's vertices, px. */
function expectedBox(
  mesh: MeshData,
  x: number,
  project: (p: ArrayLike<number>) => [number, number],
): Box {
  let box: Box = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length / 3; i++) {
    const p = project([
      x + mesh.positions[i * 3]!,
      mesh.positions[i * 3 + 1]!,
      POLE + mesh.positions[i * 3 + 2]!,
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
    return { run: runWarpViews, dispose: () => stop(active) };
  },
};
