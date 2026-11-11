// A placed draw's normals and positions on the GPU against the float64 CPU
// twin (plan 13.26, increment 2a; the Node tests are test/placementJacobian
// .test.ts and test/drawPlacement.test.ts). A grid 6,378 km from the
// transform table's origin is drawn under a warp with a known analytic form:
// a lattice fitted (`fitLattice`) to a wave, weighted by `k − 1` for an
// exaggeration k of 10 (then 4: one float written, no refit), plus a second
// weighted term. Its vertices are placed by shaders/placement.slang, which
// also turns each vertex's normal by the placement's Jacobian.
//
// A custom fragment stage (unlit) shows a difference between what the stage
// has and the CPU twin's value of it, interpolated the same way (the twin's
// value is a per-vertex named attribute), as 0.5 + gain × difference, so the
// 8-bit image resolves far below its step. Over the pixels well inside the
// grid, in three modes:
//  - the geometric normal against the twin's cofactor-turned normal: at most
//    0.1 degrees (and the turn must matter: more than 5 degrees from the
//    stored normal);
//  - `fsInput.positionMC` against the vertex's design position (the fragment
//    stage's Pref, varying 8): within 0.1 mm;
//  - `fsInput.positionEC` against the placed vertex's camera-relative
//    position, as the twin places it: within 0.1 mm. A placed draw's is
//    rebuilt from the window position and depth (surface.slang
//    `drawnPosition`); the varying (4) is the pre-placement position.
// The unplaced draw is held to the same three (the fragment's direct path),
// and its lit image's hash is printed to compare before and after the
// change. A placement that moves nothing (a lattice of zeros: J = I) must
// shade as the unplaced draw does, within 2 levels: the rebuilt position
// feeds the lighting.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  CustomShader,
  Engine,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  type MeshData,
  type PlacementParameter,
  type World,
} from "../src/index.ts";
import {
  placeJacobianWithTerms,
  placeWithTerms,
  turnNormalByJacobian,
} from "../src/scene/warpEvaluate.ts";
import { fitLattice } from "../src/scene/warpFit.ts";
import type { CubicLattice, WarpTerms } from "../src/scene/warpTerms.ts";
import { setPlacement } from "../src/scene/world/placements.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";

const TEMPLATE = `
<h1>A placed draw's normals and positions against their CPU twin</h1>
<p>
  A grid under a fitted warp (height wave, exaggeration 10 then 4), drawn
  with a fragment stage that shows its difference from the float64 twin's
  value, amplified: the turned normal (0.1°), the design position the
  fragment stage gets, and the position where it is drawn.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<div data-id="hash"></div>
<table data-id="results"></table>`;

const WIDTH = 256;
const HEIGHT = 256;
/** The grid's origin, m (render space: the transform table's root). */
const ORIGIN: [number, number, number] = [6_378_137, 0, 0];
/** The camera, relative to the origin: 3.2 m in front, looking down −z. */
const EYE = [0.15, -0.1, 3.2] as const;
/** The camera's turn about its axis, radians (7°). */
const TURN = (7 * Math.PI) / 180;
/** Vertices per side of the grid, over [−1, 1]². */
const SIDE = 17;
const SUN = [0.35, 0.25, 0.9];

const NORMAL_GAIN = 100;
const POSITION_GAIN = 1000;
const NORMAL_LIMIT = 0.1; // degrees
const POSITION_LIMIT = 1e-4; // m
const TURN_LEAST = 5; // degrees
const MOVE_LEAST = 0.1; // m
const SHADING_LIMIT = 2; // levels

const MODES = { normal: 0, design: 1, drawn: 2, mask: 3 } as const;

const FRAGMENT = `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  let mode = uniforms.mode;
  var d = vec3f(0.0);
  var gain = ${NORMAL_GAIN}.0;
  if (mode < 0.5) {
    d = fsInput.normal - normalize(fsInput.attributes.expectedNormal);
  } else if (mode < 1.5) {
    gain = ${POSITION_GAIN}.0;
    d = fsInput.positionMC - fsInput.attributes.expectedDesign;
  } else {
    gain = ${POSITION_GAIN}.0;
    d = fsInput.positionEC - fsInput.attributes.expectedDrawn;
  }
  // The mask (mode 3) is white but for blue: told from the default material.
  let shown = clamp(vec3f(0.5) + gain * d, vec3f(0.0), vec3f(1.0));
  (*material).baseColor = select(shown, vec3f(1.0, 1.0, 0.5), mode > 2.5);
  (*material).alpha = 1.0;
  (*material).unlit = true;
}`;

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface PlacementNormalsResult {
  adapter: string;
  checks: Check[];
  /** FNV-1a of the unplaced draw's lit image: compare before and after a shader change. */
  unplacedLitHash: string;
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

/** The analytic warp (model units): a height wave with a little lateral drift. */
function wave(p: ArrayLike<number>, out: Float64Array): void {
  const [x, y] = [p[0]!, p[1]!];
  out[0] = 0.03 * Math.cos(1.3 * y);
  out[1] = 0.02 * Math.sin(1.1 * x);
  out[2] = 0.08 * Math.sin(2 * x + 0.3) * Math.cos(1.5 * y);
}

/** A second, finer wave. */
function ripple(p: ArrayLike<number>, out: Float64Array): void {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0.05 * Math.cos(3 * p[0]!) * Math.sin(2.5 * p[1]!);
}

const TILE = { center: [0, 0, 0], scale: 1.5 };

function lattices(): { wave: CubicLattice; ripple: CubicLattice } {
  return {
    wave: fitLattice(wave, TILE, { tolerance: 1e-4, operation: "wave" }),
    ripple: fitLattice(ripple, TILE, {
      tolerance: 1e-4,
      maxCells: 4,
      operation: "ripple",
    }),
  };
}

/** The grid's design positions (float32, as the mesh stores them). */
function gridPositions(): Float32Array {
  const positions = new Float32Array(SIDE * SIDE * 3);
  for (let j = 0; j < SIDE; j++) {
    for (let i = 0; i < SIDE; i++) {
      positions.set(
        [-1 + (2 * i) / (SIDE - 1), -1 + (2 * j) / (SIDE - 1), 0],
        (j * SIDE + i) * 3,
      );
    }
  }
  return positions;
}

function gridIndices(): Uint32Array {
  const indices: number[] = [];
  for (let j = 0; j + 1 < SIDE; j++) {
    for (let i = 0; i + 1 < SIDE; i++) {
      const a = j * SIDE + i;
      const b = a + 1;
      const c = a + SIDE;
      const d = c + 1;
      indices.push(a, b, d, a, d, c); // counterclockwise from +z
    }
  }
  return Uint32Array.from(indices);
}

/** What the CPU twin says of each vertex under `terms`. */
interface Expected {
  /** Placed position, relative to the camera (the fragment stage's `positionEC`). */
  drawn: Float32Array;
  /** The normal turned by the Jacobian. */
  normal: Float32Array;
  /** The largest turn from the stored normal, degrees. */
  turn: number;
  /** The farthest a vertex moves, m. */
  move: number;
}

function expectedFor(
  positions: Float32Array,
  terms: WarpTerms | undefined,
): Expected {
  const n = positions.length / 3;
  const drawn = new Float32Array(n * 3);
  const normal = new Float32Array(n * 3);
  const p = new Float64Array(3);
  const placed = new Float64Array(3);
  const j = new Float64Array(9);
  const turned = new Float64Array(3);
  let turn = 0;
  let move = 0;
  for (let v = 0; v < n; v++) {
    p.set(positions.subarray(v * 3, v * 3 + 3));
    if (terms) {
      placeWithTerms(terms, p, undefined, placed);
      placeJacobianWithTerms(terms, p, j);
      turnNormalByJacobian(j, [0, 0, 1], turned);
    } else {
      placed.set(p);
      turned.set([0, 0, 1]);
    }
    for (let k = 0; k < 3; k++) {
      drawn[v * 3 + k] = placed[k]! - EYE[k]!;
      normal[v * 3 + k] = turned[k]!;
    }
    turn = Math.max(turn, (Math.acos(Math.min(1, turned[2]!)) * 180) / Math.PI);
    move = Math.max(
      move,
      Math.hypot(placed[0]! - p[0]!, placed[1]! - p[1]!, placed[2]! - p[2]!),
    );
  }
  return { drawn, normal, turn, move };
}

function meshFor(positions: Float32Array, expected: Expected): MeshData {
  const normals = new Float32Array(positions.length);
  for (let v = 0; v < normals.length; v += 3) {
    normals[v + 2] = 1;
  }
  return {
    positions,
    normals,
    indices: gridIndices(),
    attributes: {
      _EXPECT_N: { data: expected.normal, components: 3 },
      _EXPECT_DESIGN: { data: positions, components: 3 },
      _EXPECT_DRAWN: { data: expected.drawn, components: 3 },
    },
  };
}

/** sRGB-encoded 8-bit to linear. */
function linear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hash(pixels: Uint8ClampedArray): string {
  let h = 0x811c9dc5;
  for (const v of pixels) {
    h = Math.imul(h ^ v, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** The pixels whose 3 × 3 neighbourhood the mask (mode 3) covers entirely. */
function interior(mask: Uint8ClampedArray): number[] {
  const full = (x: number, y: number) => mask[(y * WIDTH + x) * 4 + 1]! >= 250;
  const out: number[] = [];
  for (let y = 1; y < HEIGHT - 1; y++) {
    for (let x = 1; x < WIDTH - 1; x++) {
      let all = true;
      for (let dy = -1; dy <= 1 && all; dy++) {
        for (let dx = -1; dx <= 1 && all; dx++) {
          all = full(x + dx, y + dy);
        }
      }
      if (all) {
        out.push(y * WIDTH + x);
      }
    }
  }
  return out;
}

/** The largest decoded difference's length over `pixels`, and whether any channel saturated. */
function worst(
  image: Uint8ClampedArray,
  pixels: readonly number[],
  gain: number,
): { value: number; saturated: boolean } {
  let value = 0;
  let saturated = false;
  for (const at of pixels) {
    let sum = 0;
    for (let k = 0; k < 3; k++) {
      const v = image[at * 4 + k]!;
      saturated ||= v === 0 || v === 255;
      sum += ((linear(v) - 0.5) / gain) ** 2;
    }
    value = Math.max(value, Math.sqrt(sum));
  }
  return { value, saturated };
}

/** The greatest per-channel difference between two images, levels. */
function levelsApart(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let most = 0;
  for (let i = 0; i < a.length; i++) {
    if (i % 4 !== 3) {
      most = Math.max(most, Math.abs(a[i]! - b[i]!));
    }
  }
  return most;
}

async function runPlacementNormals(): Promise<PlacementNormalsResult> {
  const status = root.querySelector(".status")!;
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
  let unplacedLitHash = "";
  try {
    const world: World = engine.createWorld({
      maxDraws: 4,
      vertexBytes: 1 << 20,
      indexBytes: 1 << 16,
    });
    const target = new OffscreenTarget(WIDTH, HEIGHT);
    const view = engine.addView({
      target,
      world,
      background: "color",
      clearColor: [0, 0, 0],
      lighting: {
        sunIlluminance: 2,
        environment: "procedural",
        diffuseIbl: 0.4,
        specularIbl: 0.2,
      },
      observer: { exposure: UNITLESS_EXPOSURE },
    });
    view.camera.position.set(ORIGIN.map((o, i) => o + EYE[i]!));
    view.camera.orient(Float64Array.of(Math.sin(TURN), Math.cos(TURN), 0));
    view.camera.version++;
    const sun = Math.hypot(...SUN);
    engine.sunDirection.set(SUN.map((s) => s / sun));

    const shader = new CustomShader({
      label: "placement normals",
      fragment: FRAGMENT,
      attributes: {
        expectedNormal: { semantic: "_EXPECT_N", type: "vec3f" },
        expectedDesign: { semantic: "_EXPECT_DESIGN", type: "vec3f" },
        expectedDrawn: { semantic: "_EXPECT_DRAWN", type: "vec3f" },
      },
      uniforms: { mode: { type: "f32", value: 0 } },
    });
    const material = world.addMaterial({
      baseColor: [0.8, 0.8, 0.8, 1],
      roughness: 0.7,
    });
    const positions = gridPositions();
    const exaggeration: PlacementParameter = world.createPlacementParameter(10);
    const fits = lattices();
    const warp: WarpTerms = [
      {
        term: fits.wave,
        weight: {
          scale: 1,
          factors: [{ parameter: exaggeration, offset: -1, slope: 1 }],
        },
      },
      {
        term: fits.ripple,
        weight: {
          scale: 0.5,
          factors: [{ parameter: exaggeration, offset: 1, slope: -0.05 }],
        },
      },
    ];
    const zeros = fitLattice((_p, out) => out.fill(0), TILE, {
      tolerance: 1,
      maxCells: 1,
    });
    const nothing: WarpTerms = [
      {
        term: zeros,
        weight: { scale: 1, factors: [] },
      },
    ];

    const readImage = async (): Promise<Uint8ClampedArray> => {
      engine.renderFrame();
      lost();
      const pixels = await target.read();
      lost();
      return pixels;
    };
    /** Draws the grid once, alone, and reads each image asked for. */
    const capture = async (
      terms: WarpTerms | undefined,
      expected: Expected,
      images: ReadonlyArray<keyof typeof MODES | "lit">,
    ): Promise<Map<string, Uint8ClampedArray>> => {
      const out = new Map<string, Uint8ClampedArray>();
      const mesh = world.addMesh(meshFor(positions, expected));
      for (const image of images) {
        const draw: DrawHandle = world.addDraw({
          mesh,
          origin: Float64Array.from(ORIGIN),
          material,
          doubleSided: true,
          ...(image === "lit" ? {} : { shader }),
        });
        if (terms) {
          setPlacement(world, draw, terms);
        }
        if (image === "lit") {
          out.set(image, await readImage());
        } else {
          shader.setUniform("mode", MODES[image]);
          // The shader's pipelines compile in the background: the default
          // material (white) shows until they have.
          const give = Date.now() + 20_000;
          for (;;) {
            const pixels = await readImage();
            const center = (HEIGHT / 2) * WIDTH + WIDTH / 2;
            if (pixels[center * 4 + 2] !== 255 || Date.now() > give) {
              out.set(image, pixels);
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
        world.removeDraw(draw);
      }
      return out;
    };

    let id = 1;
    const modes = ["normal", "design", "drawn", "mask"] as const;
    const measure = async (
      name: string,
      terms: WarpTerms | undefined,
      moves: boolean,
    ): Promise<Map<string, Uint8ClampedArray>> => {
      const expected = expectedFor(positions, terms);
      const images = await capture(terms, expected, [...modes, "lit"]);
      const inside = interior(images.get("mask")!);
      const normal = worst(images.get("normal")!, inside, NORMAL_GAIN);
      const design = worst(images.get("design")!, inside, POSITION_GAIN);
      const drawn = worst(images.get("drawn")!, inside, POSITION_GAIN);
      const degrees = (normal.value * 180) / Math.PI;
      checks.push({
        id: id++,
        name,
        measured: {
          "pixels measured": inside.length,
          "turned normal − twin, degrees": degrees,
          "positionMC − design position, m": design.value,
          "positionEC − drawn position, m": drawn.value,
          "normal turned from the stored, degrees": expected.turn,
          "farthest vertex move, m": expected.move,
        },
        limit: `normal ${NORMAL_LIMIT}°, positions ${POSITION_LIMIT} m, each unsaturated${moves ? `; the turn above ${TURN_LEAST}° and the move above ${MOVE_LEAST} m` : ""}`,
        pass:
          inside.length > 1000 &&
          !normal.saturated &&
          !design.saturated &&
          !drawn.saturated &&
          degrees <= NORMAL_LIMIT &&
          design.value <= POSITION_LIMIT &&
          drawn.value <= POSITION_LIMIT &&
          (!moves ||
            (expected.turn > TURN_LEAST && expected.move > MOVE_LEAST)),
      });
      return images;
    };

    const unplaced = await measure(
      "no placement (the direct path)",
      undefined,
      false,
    );
    unplacedLitHash = hash(unplaced.get("lit")!);
    exaggeration.value = 10;
    await measure("lattice warp, exaggeration 10", warp, true);
    exaggeration.value = 4;
    await measure(
      "the same, exaggeration 4 (one float written, no refit)",
      warp,
      true,
    );
    const identity = await measure(
      "a lattice of zeros (J = I): drawn as unplaced",
      nothing,
      false,
    );
    const apart = levelsApart(unplaced.get("lit")!, identity.get("lit")!);
    checks.push({
      id: id++,
      name: "lit: a placement that moves nothing shades as the unplaced draw",
      measured: { "greatest difference, levels": apart },
      limit: `at most ${SHADING_LIMIT} levels`,
      pass: apart <= SHADING_LIMIT,
    });
    checks.push({
      id: id++,
      name: "fit of the wave (informational: its error bound, then the Jacobian's against the analytic wave)",
      measured: {
        "wave fit error bound, m": fits.wave.errorBound,
        "wave cells": fits.wave.cells,
        "ripple fit error bound, m": fits.ripple.errorBound,
        "analytic normal − twin normal, degrees": analyticAgainstTwin(
          warp,
          exaggeration,
        ),
      },
      limit: "none: reported",
      pass: true,
    });
  } finally {
    $("adapter").textContent = `Adapter: ${describe(engine)}`;
    $("hash").textContent = `Unplaced lit image hash: ${unplacedLitHash}`;
    stop(engine);
    render(checks);
    const failed = checks.filter((c) => !c.pass);
    status.textContent = failed.length
      ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
      : `pass: all ${checks.length} checks`;
    if (failed.length) {
      console.error(
        `[placementNormals] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    checks,
    unplacedLitHash,
    pass: checks.length === 6 && checks.every((c) => c.pass),
  };
}

/**
 * The twin's normal against the analytic surface's, at the grid's vertices,
 * degrees: the surface `p + k₁·wave(p) + k₂·ripple(p)` has tangents by
 * central differences of the analytic functions, and a normal from them.
 */
function analyticAgainstTwin(
  terms: WarpTerms,
  parameter: PlacementParameter,
): number {
  parameter.value = 10;
  const weights = terms.map(({ weight }) => {
    let w = weight.scale;
    for (const f of weight.factors) {
      w *= f.offset + f.slope * f.parameter.value;
    }
    return w;
  });
  const functions = [wave, ripple];
  const surface = (x: number, y: number, out: Float64Array): void => {
    const d = new Float64Array(3);
    out.set([x, y, 0]);
    functions.forEach((f, i) => {
      f([x, y, 0], d);
      for (let k = 0; k < 3; k++) {
        out[k]! += weights[i]! * d[k]!;
      }
    });
  };
  const positions = gridPositions();
  const j = new Float64Array(9);
  const twin = new Float64Array(3);
  const a = new Float64Array(3);
  const b = new Float64Array(3);
  const c = new Float64Array(3);
  const e = new Float64Array(3);
  const h = 1e-5;
  let worstAngle = 0;
  for (let v = 0; v < positions.length; v += 3) {
    const x = positions[v]!;
    const y = positions[v + 1]!;
    placeJacobianWithTerms(terms, [x, y, 0], j);
    turnNormalByJacobian(j, [0, 0, 1], twin);
    surface(x + h, y, a);
    surface(x - h, y, b);
    surface(x, y + h, c);
    surface(x, y - h, e);
    const tx = [0, 1, 2].map((k) => a[k]! - b[k]!);
    const ty = [0, 1, 2].map((k) => c[k]! - e[k]!);
    const n = [
      tx[1]! * ty[2]! - tx[2]! * ty[1]!,
      tx[2]! * ty[0]! - tx[0]! * ty[2]!,
      tx[0]! * ty[1]! - tx[1]! * ty[0]!,
    ];
    const length = Math.hypot(n[0]!, n[1]!, n[2]!);
    const cos =
      (n[0]! * twin[0]! + n[1]! * twin[1]! + n[2]! * twin[2]!) / length;
    worstAngle = Math.max(
      worstAngle,
      (Math.acos(Math.min(1, cos)) * 180) / Math.PI,
    );
  }
  return worstAngle;
}

function describe(engine: Engine): string {
  const info = engine.gpu.adapter.info;
  return `${info.vendor} ${info.architecture} ${info.description}`;
}

function format(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }
  return Math.abs(value) < 0.01 ? value.toExponential(2) : value.toFixed(3);
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
    return { run: runPlacementNormals, dispose: () => stop(active) };
  },
};
