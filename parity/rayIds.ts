// Ray hits' stable IDs against the pick pass's (CS-815), on this GPU: the
// real shaders, raycast.slang's `rayFeature` and surface.slang's pick IDs.
//
// Flat quads at known heights in a site's east-north-up frame, under a
// camera that looks straight down, so a float64 reference on the CPU says
// what each pixel's ray meets. For each sampled pixel, the ray through its
// center (as `View.pick` reads it, `render/view/picks.ts`) is cast with
// `Engine.queries.castRays` and the pixel picked with `View.pick`:
//
//   - interior pixels (one quad nearest, the same 0.75 px around): the hit's
//     `id`, the pick's and the reference's agree;
//   - misses (nothing within 0.75 px): no hit, no `id`, no pick;
//   - edge pixels (the nearest quad changes within 0.75 px, as along the
//     shared edge of two draws): the hit's and the pick's are each one of the
//     quads there, never one behind or a crack's;
//   - ties (two quads at one height): the hit's is the lowest pickable slot's
//     (raycast.slang's rule), never 0's; the pick's is one of the two.
//
// Draws: a ground, a quad behind and one in front of it, two quads sharing an
// edge, a draw with two per-vertex features, an instanced draw with a feature
// per instance, and two coplanar pairs (pickable with unpickable, pickable
// with pickable).
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  Camera,
  Ellipsoid,
  Engine,
  OffscreenTarget,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type DrawHandle,
  type MeshData,
  type StableId,
  type View,
  type World,
} from "../packages/core/src/index.ts";

const TEMPLATE = `
<h1>Ray hits' IDs against picks</h1>
<p>
  Every sampled pixel's ray, cast on the GPU, against the pick pass at that
  pixel: the same stable ID inside each quad, none where both miss, one of
  the quads along an edge, and the lowest pickable slot where two quads are
  coplanar.
</p>
<div class="status">Run to check on this GPU.</div>
<table data-id="results"></table>`;

/** The view, px: square, so the ray through pixel 62's center meets x = 4.5 m at z = 4 m. */
const SIZE = 100;
/** The camera's height over the site, m, and tan(fov / 2). */
const EYE = 40;
const TAN = 0.5;
/** How far around a pixel's center the reference looks, px. */
const MARGIN = 0.75;
const NO_FEATURE = 0xffffffff;
const SITE = fromDegrees(-75.6, 40.04, 0);

/** An axis-aligned quad, east (x) and north (y) in m, at height z. */
interface Quad {
  readonly name: string;
  readonly x: readonly [number, number];
  readonly y: readonly [number, number];
  readonly z: number;
  /** Its draw's slot offset for this quad (per-vertex or instance feature). */
  readonly local?: number;
  /** Not pickable: its vertices have no feature. */
  readonly none?: boolean;
}

/** Two triangles facing up (counterclockwise from above). */
function quadMesh(quads: readonly Quad[], features: boolean): MeshData {
  const positions: number[] = [];
  const indices: number[] = [];
  const featureIds: number[] = [];
  for (const q of quads) {
    const base = positions.length / 3;
    const [x0, x1] = q.x;
    const [y0, y1] = q.y;
    positions.push(x0, y0, q.z, x1, y0, q.z, x1, y1, q.z, x0, y1, q.z);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    const feature = q.none ? NO_FEATURE : (q.local ?? 0);
    featureIds.push(feature, feature, feature, feature);
  }
  const normals = positions.map((_, i) => (i % 3 === 2 ? 1 : 0));
  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
    ...(features && {
      featureIds: Uint32Array.from(featureIds),
      featureCount: Math.max(1, ...quads.map((q) => (q.local ?? 0) + 1)),
    }),
  };
}

/** What a reference quad stands for: its draw and the slot it reads. */
interface Placed extends Quad {
  readonly draw: DrawHandle;
  /** The slot the pick pass writes for it (0: nothing pickable). */
  slot: number;
}

interface Row {
  check: string;
  pixels: number;
  passed: number;
  note: string;
}

let root: HTMLElement;

const frame = () => new Promise((resolve) => setTimeout(resolve, 30));

function build(world: World): Placed[] {
  const placed: Placed[] = [];
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  mat4.setTranslation(enu, vec3.vec3());
  const material = (gray: number) =>
    world.addMaterial({ baseColor: [gray, gray, gray, 1], roughness: 0.8 });
  const add = (quads: Quad[], features = false) => {
    const draw = world.addDraw({
      mesh: world.addMesh(quadMesh(quads, features)),
      origin,
      model: enu,
      material: material(0.3 + 0.1 * (placed.length % 6)),
    });
    for (const q of quads) {
      placed.push({ ...q, draw, slot: 0 });
    }
    return draw;
  };
  add([{ name: "ground", x: [-15, 15], y: [-15, 15], z: 0 }]);
  add([{ name: "behind", x: [-12, -2], y: [-10, 10], z: 2 }]);
  add([{ name: "in front", x: [-9, -5], y: [-6, 6], z: 6 }]);
  // The shared edge, x = 4.5: right first, so its slot is the lower.
  add([{ name: "edge right", x: [4.5, 8], y: [-8, 0], z: 4 }]);
  add([{ name: "edge left", x: [1, 4.5], y: [-8, 0], z: 4 }]);
  add(
    [
      { name: "feature 0", x: [1, 4.5], y: [3, 7], z: 3, local: 0 },
      { name: "feature 1", x: [4.5, 8], y: [3, 7], z: 3, local: 1 },
    ],
    true,
  );
  // An instanced draw: a unit quad, two instances, a feature each.
  const unit = world.addMesh(
    quadMesh([{ name: "unit", x: [0, 1], y: [0, 1], z: 0 }], false),
  );
  const at = (x: number, y: number) => {
    const m = mat4.fromScale(mat4.mat4(), 3, 3, 1);
    mat4.setTranslation(m, vec3.vec3(x, y, 5));
    return [...m];
  };
  const instanced = world.addDraw({
    mesh: unit,
    origin,
    model: enu,
    material: material(0.7),
    instances: {
      matrices: [...at(10, -13), ...at(10, -7)],
      featureIds: [0, 1],
    },
  });
  placed.push(
    {
      name: "instance 0",
      x: [10, 13],
      y: [-13, -10],
      z: 5,
      local: 0,
      draw: instanced,
      slot: 0,
    },
    {
      name: "instance 1",
      x: [10, 13],
      y: [-7, -4],
      z: 5,
      local: 1,
      draw: instanced,
      slot: 0,
    },
  );
  // Coplanar: an unpickable quad first, then a pickable one over it.
  add(
    [{ name: "tie unpickable", x: [-12, -4], y: [11, 14], z: 1, none: true }],
    true,
  );
  add([{ name: "tie pickable", x: [-12, -4], y: [11, 14], z: 1 }]);
  // Coplanar, both pickable.
  add([{ name: "tie first", x: [1, 9], y: [10, 14], z: 1 }]);
  add([{ name: "tie second", x: [1, 9], y: [10, 14], z: 1 }]);
  for (const p of placed) {
    p.slot = p.none ? 0 : world.featureIdOf(p.draw) + (p.local ?? 0);
  }
  return placed;
}

/** Where the ray through (ndcX, ndcY) meets height z, in the site's east and north, m. */
function meet(ndcX: number, ndcY: number, z: number): [number, number] {
  return [ndcX * TAN * (EYE - z), ndcY * TAN * (EYE - z)];
}

/** The quads nearest the camera along a ray (several when coplanar). */
function nearest(
  placed: readonly Placed[],
  ndcX: number,
  ndcY: number,
): Placed[] {
  let best: Placed[] = [];
  for (const q of placed) {
    const [x, y] = meet(ndcX, ndcY, q.z);
    if (x < q.x[0] || x > q.x[1] || y < q.y[0] || y > q.y[1]) {
      continue;
    }
    if (best.length === 0 || q.z > best[0]!.z) {
      best = [q];
    } else if (q.z === best[0]!.z) {
      best.push(q);
    }
  }
  return best;
}

const ndcOf = (px: number, py: number) => [
  ((px + 0.5) / SIZE) * 2 - 1,
  1 - ((py + 0.5) / SIZE) * 2,
];

/** The pixels sampled: every fourth in each direction, and the shared edge's columns in full. */
function samples(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      if ((px % 4 === 0 && py % 4 === 0) || (px >= 61 && px <= 63)) {
        out.push([px, py]);
      }
    }
  }
  return out;
}

type Kind = "interior" | "miss" | "edge" | "tie";

/** A pixel's kind and the quads it may show, by the reference. */
function classify(
  placed: readonly Placed[],
  px: number,
  py: number,
): { kind: Kind; candidates: Placed[]; sky: boolean } {
  const seen = new Set<Placed | undefined>();
  const near: Placed[][] = [];
  const step = (MARGIN / SIZE) * 2;
  const [cx, cy] = ndcOf(px, py);
  for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) {
      const n = nearest(placed, cx! + dx * step, cy! + dy * step);
      near.push(n);
      if (n.length === 0) {
        seen.add(undefined);
      }
      n.forEach((q) => seen.add(q));
    }
  }
  const center = near[4]!;
  const candidates = [...seen].filter((q): q is Placed => q !== undefined);
  const sky = seen.has(undefined);
  if (sky && candidates.length === 0) {
    return { kind: "miss", candidates, sky };
  }
  if (center.length > 1 && near.every((n) => n.length === center.length)) {
    return { kind: "tie", candidates: center, sky };
  }
  if (seen.size === 1) {
    return { kind: "interior", candidates, sky };
  }
  return { kind: "edge", candidates, sky };
}

async function pickAll(
  engine: Engine,
  view: View,
  pixels: ReadonlyArray<[number, number]>,
  progress: (picked: number) => void,
): Promise<Array<StableId | undefined | null>> {
  const out: Array<StableId | undefined | null> = [];
  for (let i = 0; i < pixels.length; i += 256) {
    let resolved = 0;
    const batch = pixels.slice(i, i + 256).map(([x, y]) =>
      view.pick(x, y).then((p) => {
        resolved++;
        return p;
      }),
    );
    // The engine answers one pick a tick.
    const ticks = batch.length * 2 + 60;
    for (let k = 0; k < ticks && resolved < batch.length; k++) {
      engine.renderFrame();
      await frame();
    }
    if (resolved < batch.length) {
      throw new Error(
        `picks: ${resolved} of ${batch.length} resolved after ${ticks} ticks`,
      );
    }
    // null: over the sky (no pick); undefined: a pick with no ID.
    out.push(
      ...(await Promise.all(batch)).map((p) => (p === undefined ? null : p.id)),
    );
    progress(out.length);
  }
  return out;
}

const name = (
  placed: readonly Placed[],
  id: StableId | undefined | null,
  ids: Map<Placed, StableId | undefined>,
) => {
  if (id === null) {
    return "sky";
  }
  if (id === undefined) {
    return "no id";
  }
  return placed.find((q) => ids.get(q) === id)?.name ?? `unknown ${id}`;
};

async function runRayIds() {
  const status = root.querySelector<HTMLElement>(".status")!;
  status.textContent = "running…";
  const engine = await Engine.create();
  const target = new OffscreenTarget(SIZE, SIZE);
  const world = engine.createWorld({
    maxDraws: 32,
    maxMaterials: 32,
    vertexBytes: 1 << 20,
    indexBytes: 1 << 20,
  });
  const placed = build(world);
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  const axis = (k: number) =>
    vec3.vec3(enu[4 * k]!, enu[4 * k + 1]!, enu[4 * k + 2]!);
  const [east, north, up] = [axis(0), axis(1), axis(2)];
  const camera = new Camera();
  camera.fov = 2 * Math.atan(TAN);
  camera.near = 0.5;
  for (let k = 0; k < 3; k++) {
    camera.position[k] = origin[k]! + up[k]! * EYE;
    camera.direction[k] = -up[k]!;
    camera.up[k] = north[k]!;
    camera.right[k] = east[k]!;
  }
  camera.version++;
  const view = engine.addView({
    target,
    world,
    camera,
    background: "color",
    clearColor: [0.03, 0.04, 0.06],
    lighting: { environment: "procedural" },
  });
  for (let i = 0; i < 4; i++) {
    engine.renderFrame();
    await frame();
  }
  const ids = new Map<Placed, StableId | undefined>(
    placed.map((q) => [
      q,
      q.slot === 0 ? undefined : world.identities.idOfSlot(q.slot),
    ]),
  );

  const pixels = samples();
  // Each pixel's ray: from the camera through its center, 100 m.
  const rays = pixels.map(([px, py]) => {
    const [x, y] = ndcOf(px, py);
    const to = [0, 1, 2].map(
      (k) =>
        camera.position[k]! +
        100 *
          (camera.direction[k]! + x! * TAN * east[k]! + y! * TAN * north[k]!),
    );
    return { from: Float64Array.from(camera.position), to };
  });
  status.textContent = `casting ${rays.length} rays…`;
  const answer = await engine.queries.castRays({
    anchor: undefined,
    view,
    seconds: 0,
    rays,
    targets: ["draws"],
  });
  const picks = await pickAll(engine, view, pixels, (n) => {
    status.textContent = `picked ${n} of ${pixels.length} pixels…`;
  });

  const counts = new Map<Kind, { pixels: number; passed: number }>();
  const failures: string[] = [];
  const cracks: string[] = [];
  let edgeAgree = 0;
  let edgeRays = 0;
  let tieAgree = 0;
  pixels.forEach(([px, py], i) => {
    const { kind, candidates, sky } = classify(placed, px, py);
    const hit = answer.rays[i]!.hit;
    const rayId = hit === undefined ? null : hit.id;
    const pickId = picks[i];
    const idsOf = candidates.map((q) => ids.get(q));
    let ok: boolean;
    switch (kind) {
      case "interior":
        ok = rayId === idsOf[0] && pickId === idsOf[0];
        break;
      case "miss":
        ok = hit === undefined && pickId === null;
        break;
      case "edge": {
        // The pick: one of the quads there, or the sky where it is there too.
        const may = new Set<StableId | undefined | null>(idsOf);
        if (sky) {
          may.add(null);
        }
        // The hit's ID names the quad at the hit's own distance (its height,
        // EYE − 100 t, as the ray runs 100 m down per unit of t), wherever
        // the distance kernel put it.
        const [cx, cy] = ndcOf(px, py) as [number, number];
        const at =
          hit === undefined
            ? []
            : placed.filter((q) => {
                const z = EYE - 100 * hit.t;
                const [x, y] = meet(cx, cy, q.z);
                const near = 0.01;
                return (
                  Math.abs(q.z - z) < near &&
                  x >= q.x[0] - near &&
                  x <= q.x[1] + near &&
                  y >= q.y[0] - near &&
                  y <= q.y[1] + near
                );
              });
        // One of the pickable quads there, or none when none is: on an
        // edge, float32 may accept one triangle or both (the tie rule is
        // checked where faces overlap, the "tie" pixels).
        const pickable = at.filter((q) => q.slot !== 0).map((q) => ids.get(q));
        const idOk =
          hit === undefined
            ? sky
            : at.length > 0 &&
              (pickable.length === 0
                ? rayId === undefined
                : pickable.includes(rayId ?? undefined));
        ok = idOk && may.has(pickId);
        // Through the gap between two draws' triangles (`main`'s distance).
        if (hit !== undefined && !may.has(rayId)) {
          cracks.push(`(${px}, ${py}): ${name(placed, rayId, ids)}`);
        }
        if (px === 62 && candidates.some((q) => q.name.startsWith("edge"))) {
          edgeRays++;
          edgeAgree += rayId === pickId ? 1 : 0;
        }
        break;
      }
      case "tie": {
        const pickable = candidates.filter((q) => q.slot !== 0);
        const lowest = pickable.reduce((a, b) => (b.slot < a.slot ? b : a));
        ok =
          rayId === ids.get(lowest) &&
          pickId !== null &&
          idsOf.includes(pickId);
        tieAgree += rayId === pickId ? 1 : 0;
        break;
      }
    }
    const c = counts.get(kind) ?? { pixels: 0, passed: 0 };
    c.pixels++;
    c.passed += ok ? 1 : 0;
    counts.set(kind, c);
    if (!ok && failures.length < 20) {
      failures.push(
        `${kind} (${px}, ${py}): ray ${name(placed, rayId, ids)}, pick ${name(placed, pickId, ids)}, expected ${candidates.map((q) => q.name).join(" or ") || "sky"}`,
      );
    }
  });

  const rows: Row[] = [
    {
      check: "interior: ray = pick = reference",
      ...(counts.get("interior") ?? { pixels: 0, passed: 0 }),
      note: "every quad, front over behind",
    },
    {
      check: "miss: no hit, no id, no pick",
      ...(counts.get("miss") ?? { pixels: 0, passed: 0 }),
      note: "the sky past the ground",
    },
    {
      check: "edge: the hit's quad at its distance; the pick's one there",
      ...(counts.get("edge") ?? { pixels: 0, passed: 0 }),
      note: `the shared edge's column: ray = pick at ${edgeAgree} of ${edgeRays}; ${cracks.length} rays through a gap between draws`,
    },
    {
      check: "tie: lowest pickable slot",
      ...(counts.get("tie") ?? { pixels: 0, passed: 0 }),
      note: `ray = pick at ${tieAgree} (the pick pass's tie follows draw order)`,
    },
  ];
  const covered = new Set(
    pixels
      .map(([px, py], i) =>
        classify(placed, px, py).kind === "interior" ? picks[i] : undefined,
      )
      .filter((id): id is StableId => id !== undefined && id !== null),
  );
  const unseen = placed.filter(
    (q) =>
      q.slot !== 0 && !q.name.startsWith("tie") && !covered.has(ids.get(q)!),
  );
  if (unseen.length > 0) {
    failures.push(
      `quads with no interior pixel: ${unseen.map((q) => q.name).join(", ")}`,
    );
  }
  const pass =
    failures.length === 0 &&
    rows.every((r) => r.pixels > 0 && r.passed === r.pixels);
  renderTable(rows);
  status.textContent = pass
    ? `pass: ${pixels.length} pixels`
    : `fail: ${failures[0] ?? "a check has no pixels"}`;

  engine.removeView(view);
  engine.worlds.splice(engine.worlds.indexOf(world), 1);
  world.destroy();
  engine.destroy();
  return {
    pass,
    pixels: pixels.length,
    rows,
    failures,
    // Rays that passed between two draws' triangles to what lies behind:
    // the distance kernel's (`main`), not the ID's; their IDs are checked.
    cracks,
    // The slots the quads read, to read a failure by.
    slots: Object.fromEntries(placed.map((q) => [q.name, q.slot])),
  };
}

function renderTable(rows: Row[]): void {
  const table = root.querySelector<HTMLTableElement>('[data-id="results"]')!;
  table.replaceChildren();
  const line = (cells: Array<string | number>, tag: "th" | "td") => {
    const tr = table.insertRow();
    for (const cell of cells) {
      const el = document.createElement(tag);
      el.textContent = String(cell);
      tr.append(el);
    }
  };
  line(["Check", "Pixels", "Passed", "Note"], "th");
  for (const r of rows) {
    line([r.check, r.pixels, r.passed, r.note], "td");
  }
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runRayIds };
  },
};
