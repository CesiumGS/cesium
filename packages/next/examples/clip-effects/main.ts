import {
  BingImagery,
  CustomShader,
  Ellipsoid,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  resolveIonAsset,
  vec3,
  type ClipSet,
  type DrawHandle,
  type Globe,
  type MeshData,
  type WorldClip,
} from "@cesium/next";
import { eastNorthUpFrame, type Frame } from "@cesium/next/frames";
import type { Dispose, ExampleContext } from "../types.ts";

/**
 * Clip effects: what a clip does with what it doesn't keep.
 *
 * The scene is the classic underground one: a gas main, a water main, a duct
 * bank and a tank buried a few metres under a street's ground, and a clip box
 * (the excavation) around them. Cesium World Terrain is the ground, drawn with
 * a custom shader that reads what the clips tell it. Two clips:
 *
 *  - The excavation, a box that removes what is inside it, with the effect
 *    you choose: a hole (the default, as clipping has been), the ground as a
 *    blended ghost (translucent, so the pipes show through it at their true
 *    depths), the ground as a stippled ghost (the cheap one, no extra pass),
 *    or nothing removed.
 *  - A section plane through the site, whose effect is a custom shader's:
 *    hatching and fading by the distance from the plane (`fsInput.clipDistance`),
 *    on the side the plane removes (shade: nothing is removed; ghost: drawn
 *    translucent, fading out), or a glowing edge on the side it keeps.
 *
 * The pipes are exempt from clips (`DrawOptions.clipExempt`): the box would
 * remove them too, being inside it. The buildings, if you add them, are not,
 * and the clips cut and ghost them with the ground.
 *
 * The same hole in the terrain is `Globe.terrain.addRegion`'s job today; the
 * panel's readout says what the effects cost on this GPU.
 */

const SITE = { longitude: -95.3698, latitude: 29.7604 };
const DEG = Math.PI / 180;
const OSM_BUILDINGS = 96188;

/** The terrain's custom shader: what the clips tell it, as a style. */
const TERRAIN_WGSL = /* wgsl */ `
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  if (fsInput.clipId == 0xffffffffu) {
    return;
  }
  // clipParams: x the style (1 hatch and fade, 2 a glowing edge), y how far the
  // fade reaches (m), z the hatching's period (pixels).
  let style = u32(fsInput.clipParams.x + 0.5);
  let d = fsInput.clipDistance;
  if (style == 1u && d > 0.0) {
    let reach = max(fsInput.clipParams.y, 0.1);
    let k = clamp(d / reach, 0.0, 1.0);
    let grey = vec3f(dot((*material).baseColor, vec3f(0.2126, 0.7152, 0.0722)));
    (*material).baseColor = mix((*material).baseColor, grey * vec3f(0.55, 0.75, 1.0), 0.35 + 0.5 * k);
    let period = max(fsInput.clipParams.z, 2.0);
    if (fract((fsInput.screen.x + fsInput.screen.y) / period) < 0.4) {
      (*material).baseColor = (*material).baseColor * 0.45;
    }
    if ((fsInput.clipFlags & 2u) != 0u) {
      (*material).alpha = (*material).alpha * (1.0 - 0.9 * k);
    }
  }
  if (style == 2u && d <= 0.0 && d > -0.8) {
    (*material).emissive = vec3f(1.0, 0.62, 0.1) * (1.0 + 4.0 * (0.8 + d));
    (*material).baseColor = vec3f(1.0, 0.7, 0.2);
  }
}
`;

type V3 = [number, number, number];

/** A cylinder along +x from 0 to `length`, of `radius`, with smooth normals. */
function cylinder(radius: number, length: number, segments = 28): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    const y = Math.cos(a);
    const z = Math.sin(a);
    positions.push(0, radius * y, radius * z, length, radius * y, radius * z);
    normals.push(0, y, z, 0, y, z);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  for (const [x, nx] of [
    [0, -1],
    [length, 1],
  ] as const) {
    const center = positions.length / 3;
    positions.push(x, 0, 0);
    normals.push(nx, 0, 0);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * 2 * Math.PI;
      positions.push(x, radius * Math.cos(a), radius * Math.sin(a));
      normals.push(nx, 0, 0);
    }
    for (let i = 0; i < segments; i++) {
      if (nx > 0) {
        indices.push(center, center + 1 + i, center + 2 + i);
      } else {
        indices.push(center, center + 2 + i, center + 1 + i);
      }
    }
  }
  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
  };
}

/** An axis-aligned box of half extents `h`, its faces' normals out. */
function box(h: V3): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const faces: Array<[V3, V3, V3]> = [
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [-1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ],
    [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ],
    [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, -1],
      [0, 1, 0],
      [1, 0, 0],
    ],
  ];
  for (const [n, u, v] of faces) {
    const base = positions.length / 3;
    for (const [su, sv] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      for (let k = 0; k < 3; k++) {
        positions.push(h[k]! * (n[k]! + su * u[k]! + sv * v[k]!));
      }
      normals.push(...n);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
  };
}

/** The excavation's floor and four walls, facing in: `half` (x, y) and from `floor` up to `top`. */
function pitWalls(
  half: [number, number],
  floor: number,
  top: number,
): MeshData {
  const [hx, hy] = half;
  const quads: Array<[V3, V3, V3, V3, V3]> = [
    [
      [-hx, -hy, floor],
      [hx, -hy, floor],
      [hx, hy, floor],
      [-hx, hy, floor],
      [0, 0, 1],
    ],
    [
      [hx, -hy, floor],
      [hx, -hy, top],
      [hx, hy, top],
      [hx, hy, floor],
      [-1, 0, 0],
    ],
    [
      [-hx, hy, floor],
      [-hx, hy, top],
      [-hx, -hy, top],
      [-hx, -hy, floor],
      [1, 0, 0],
    ],
    [
      [hx, hy, floor],
      [hx, hy, top],
      [-hx, hy, top],
      [-hx, hy, floor],
      [0, -1, 0],
    ],
    [
      [-hx, -hy, floor],
      [-hx, -hy, top],
      [hx, -hy, top],
      [hx, -hy, floor],
      [0, 1, 0],
    ],
  ];
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (const [a, b, c, d, n] of quads) {
    const base = positions.length / 3;
    for (const p of [a, b, c, d]) {
      positions.push(...p);
      normals.push(...n);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
  };
}

/** What a clip set does with what it doesn't keep (`ClipSet.effect`). */
type ClipEffect = NonNullable<ClipSet["effect"]>;
type PitEffect = "discard" | "ghost" | "stipple" | "shade";
type PlaneEffect = "hatch" | "ghost" | "glow" | "cut";

export async function run({
  viewer,
  panel,
  scope,
  signal,
  accessToken,
  params,
}: ExampleContext): Promise<Dispose> {
  const { engine, world, view } = viewer;
  viewer.creditsShown = false;
  viewer.setControls("orbit");
  view.lighting.environment = "procedural";
  viewer.setSun(140, 38);

  const state = {
    pit: (params.effect as PitEffect | undefined) ?? "ghost",
    alpha: 0.3,
    tint: true,
    width: 56,
    depth: 12,
    walls: true,
    exempt: true,
    buildings: false,
    plane: params.plane === "1",
    planeEffect: (params.planeEffect as PlaneEffect | undefined) ?? "hatch",
    planeOffset: 14,
    planeTurn: 20,
    fade: 18,
  };

  // ---------------------------------------------------------------- terrain
  const loading = document.createElement("p");
  loading.textContent = "Loading the terrain…";
  panel.append(loading);
  if (!accessToken) {
    loading.textContent =
      "This example needs a Cesium ion access token (for Cesium World Terrain and Bing imagery).";
    return () => {};
  }
  const terrainShader = new CustomShader({
    fragment: TERRAIN_WGSL,
    label: "clip style",
  });
  const [ion, imagery] = await Promise.all([
    resolveIonAsset(1, { accessToken }),
    BingImagery.fromIon(2, { accessToken }),
  ]);
  const globe: Globe = await engine.addTerrain(world, ion.url, {
    headers: ion.headers,
    imagery,
    customShader: terrainShader,
  });
  if (signal.aborted) {
    engine.removeTileset(globe);
    return () => {};
  }
  scope.defer(() => engine.removeTileset(globe));
  viewer.addAttributions(globe, ion.attributions);
  scope.defer(() => viewer.addAttributions(globe, []));

  // The site's ground: the finest terrain tile's height once it has loaded.
  // The gallery draws nothing until `run` returns (the globe loads no tile),
  // so the scene is made after it, once the terrain is there (`populate`).
  let apply: () => void = () => {};
  const groundNote = document.createElement("p");
  groundNote.textContent = "Waiting for the terrain…";
  const populate = async (): Promise<void> => {
    const lon = SITE.longitude * DEG;
    const lat = SITE.latitude * DEG;
    const flat = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(SITE.longitude, SITE.latitude, 0),
      new Float64Array(3),
    );
    viewer.zoomTo({ center: flat, radius: 60 }, 28 * DEG, -30 * DEG);
    // Coarse tiles come first and their heights are far from the finest's: wait
    // for the tiles the view asks for.
    let ground: number | undefined;
    for (let i = 0; i < 600 && !signal.aborted; i++) {
      // A camera that hasn't moved asks for no tiles: nudge it until they come.
      if (ground === undefined && i % 16 === 0) {
        viewer.zoomTo(
          { center: flat, radius: 60 + ((i / 16) % 2) },
          28 * DEG,
          -30 * DEG,
        );
      }
      engine.requestRender();
      await new Promise((r) => setTimeout(r, 250));
      ground = globe.surfaceHeight(lon, lat);
      if (
        ground !== undefined &&
        globe.idle &&
        globe.stats.inFlight === 0 &&
        i > 16
      ) {
        break;
      }
    }
    if (signal.aborted) {
      return;
    }
    const groundKnown = ground !== undefined;
    ground ??= 12;
    groundNote.textContent = groundKnown
      ? `The ground at the site is ${ground.toFixed(1)} m above the ellipsoid.`
      : "The terrain's height at the site didn't load: the pipes are placed at 12 m.";
    const origin = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(SITE.longitude, SITE.latitude, ground),
      new Float64Array(3),
    );
    viewer.zoomTo({ center: origin, radius: 42 }, 28 * DEG, -34 * DEG);

    // ------------------------------------------------------------------ frames
    const itrf = viewer.frames.get("ITRF") as Frame;
    const site = eastNorthUpFrame("pit site", itrf, Ellipsoid.WGS84, origin);
    viewer.frames.add(site);

    // ---------------------------------------------------------- buried content
    const enu = eastNorthUpToFixedFrame(origin, Ellipsoid.WGS84, mat4.mat4());
    mat4.setTranslation(enu, vec3.vec3());
    const place = (local: mat4.Mat4) => mat4.multiply(mat4.mat4(), enu, local);
    const materials = {
      gas: world.addMaterial({
        baseColor: [0.95, 0.75, 0.1, 1],
        roughness: 0.45,
      }),
      water: world.addMaterial({
        baseColor: [0.1, 0.35, 0.95, 1],
        roughness: 0.4,
      }),
      duct: world.addMaterial({
        baseColor: [0.85, 0.2, 0.15, 1],
        roughness: 0.6,
      }),
      steel: world.addMaterial({
        baseColor: [0.62, 0.64, 0.68, 1],
        metallic: 0.8,
        roughness: 0.35,
      }),
      soil: world.addMaterial({
        baseColor: [0.38, 0.27, 0.18, 1],
        roughness: 0.95,
      }),
    };
    const buried: DrawHandle[] = [];
    const addPart = (
      mesh: MeshData,
      material: number,
      at: V3,
      turn = 0,
      name = "buried",
    ) => {
      const local = mat4.mat4();
      local[0] = Math.cos(turn * DEG);
      local[1] = Math.sin(turn * DEG);
      local[4] = -Math.sin(turn * DEG);
      local[5] = Math.cos(turn * DEG);
      mat4.setTranslation(local, vec3.vec3(...at));
      const draw = world.addDraw({
        mesh: world.addMesh(mesh),
        material,
        origin,
        model: place(local),
        doubleSided: true,
        name,
        ...(state.exempt ? { clipExempt: true } : {}),
      });
      buried.push(draw);
      scope.defer(() => world.removeDraw(draw));
      return draw;
    };
    // A gas main along the street (east-west) and a water main across it, a
    // duct bank beside, a valve chamber at the crossing and a tank, deep enough
    // that the terrain's few metres of relief don't uncover them.
    addPart(cylinder(0.35, 110), materials.gas, [-55, 2, -5.2]);
    addPart(cylinder(0.55, 100), materials.water, [4, -50, -7.2], 90);
    addPart(box([45, 0.9, 0.5]), materials.duct, [0, -6, -3.6]);
    addPart(
      box([1.8, 1.8, 1.4]),
      materials.steel,
      [4, 2, -5.6],
      0,
      "valve chamber",
    );
    addPart(cylinder(2.4, 7), materials.steel, [-20, 10, -8.8], 90, "tank");
    // The pit's walls and floor, a unit box scaled to the clip's, put back when
    // its size changes.
    const wallMesh = world.addMesh(pitWalls([1, 1], -1, 0));
    let walls: DrawHandle | undefined;
    let wallsFor = "";
    const placeWalls = () => {
      const key = `${state.width}|${state.depth}`;
      if (walls && key === wallsFor) {
        return;
      }
      if (walls) {
        world.removeDraw(walls);
      }
      wallsFor = key;
      const top = 1;
      const local = mat4.fromScale(
        mat4.mat4(),
        state.width / 2,
        state.width * 0.32,
        state.depth + top,
      );
      mat4.setTranslation(local, vec3.vec3(0, 0, top));
      walls = world.addDraw({
        mesh: wallMesh,
        material: materials.soil,
        origin,
        model: place(local),
        doubleSided: true,
        name: "pit walls",
        clipExempt: true,
      });
    };
    scope.defer(() => {
      if (walls) {
        world.removeDraw(walls);
      }
    });

    // ------------------------------------------------------------------- clips
    const pitSet = (): ClipSet => {
      const effect: ClipEffect =
        state.pit === "discard"
          ? "discard"
          : state.pit === "shade"
            ? { kind: "shade" }
            : {
                kind: "translucent",
                alpha: state.alpha,
                ...(state.tint
                  ? { tint: [0.35, 0.62, 1] as V3, tintStrength: 0.35 }
                  : {}),
                ...(state.pit === "stipple"
                  ? { method: "stipple" as const }
                  : {}),
              };
      return {
        frame: site,
        shapes: [
          {
            kind: "box",
            center: [0, 0, (4 - state.depth) / 2],
            halfExtents: [
              state.width / 2,
              state.width * 0.32,
              (state.depth + 4) / 2,
            ],
          },
        ],
        keep: "outside",
        effect,
      };
    };
    const planeSet = (): ClipSet => {
      const a = state.planeTurn * DEG;
      const normal: V3 = [Math.cos(a), Math.sin(a), 0];
      const style = [1, state.fade, 8, 0] as const;
      const effect: ClipEffect =
        state.planeEffect === "hatch"
          ? { kind: "shade", params: style }
          : state.planeEffect === "ghost"
            ? { kind: "translucent", alpha: 0.7, params: style }
            : state.planeEffect === "glow"
              ? { kind: "discard", params: [2, 0, 0, 0] }
              : "discard";
      return {
        frame: site,
        shapes: [
          {
            kind: "plane",
            point: [
              normal[0] * state.planeOffset,
              normal[1] * state.planeOffset,
              0,
            ],
            normal,
          },
        ],
        effect,
      };
    };
    const pit: WorldClip = world.addClip(pitSet());
    const plane: WorldClip = world.addClip(planeSet());
    scope.defer(() => {
      view.setClips([]);
      world.removeClip(pit);
      world.removeClip(plane);
    });
    apply = () => {
      world.setClip(pit, pitSet());
      world.setClip(plane, planeSet());
      view.setClips(state.plane ? [pit, plane] : [pit]);
      for (const draw of buried) {
        world.setClipExempt(draw, state.exempt);
      }
      placeWalls();
      world.setVisible(walls!, state.walls);
      engine.requestRender();
    };
    apply();
  };

  // --------------------------------------------------------------- buildings
  let buildings: Awaited<ReturnType<typeof viewer.addTileset>> | undefined;
  let loadingBuildings = false;
  const setBuildings = async (on: boolean) => {
    if (buildings) {
      viewer.remove(buildings);
      buildings = undefined;
    }
    if (on && !loadingBuildings) {
      loadingBuildings = true;
      try {
        buildings = await viewer.addTileset({ ion: OSM_BUILDINGS });
      } finally {
        loadingBuildings = false;
      }
    }
  };
  scope.defer(() => {
    if (buildings) {
      viewer.remove(buildings);
    }
  });

  // ------------------------------------------------------------------- panel
  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, unknown> = {},
    ...children: Array<Node | string>
  ): HTMLElementTagNameMap[K] => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  };
  const slider = (
    label: string,
    range: { min: number; max: number; step: number },
    get: () => number,
    set: (v: number) => void,
    format: (v: number) => string = (v) => v.toFixed(2),
  ) => {
    const value = el("output", {}, format(get()));
    const input = el("input", {
      type: "range",
      min: String(range.min),
      max: String(range.max),
      step: String(range.step),
      value: String(get()),
      oninput: () => {
        set(Number(input.value));
        value.textContent = format(Number(input.value));
        apply();
      },
    });
    return el("label", { className: "slider" }, label, input, value);
  };
  const check = (
    label: string,
    get: () => boolean,
    set: (v: boolean) => void,
  ) => {
    const input = el("input", {
      type: "checkbox",
      checked: get(),
      onchange: () => {
        set(input.checked);
        apply();
      },
    });
    return el("label", {}, label, input);
  };
  const select = <T extends string>(
    label: string,
    options: Array<[T, string]>,
    get: () => T,
    set: (v: T) => void,
  ) => {
    const input = el(
      "select",
      {
        onchange: () => {
          set(input.value as T);
          apply();
        },
      },
      ...options.map(([value, text]) =>
        el("option", { value, selected: get() === value }, text),
      ),
    );
    return el("label", {}, label, input);
  };
  const readout = el("dl");
  loading.remove();
  panel.append(
    groundNote,
    el("h3", {}, "Excavation (a box that removes what is inside)"),
    select(
      "The ground inside",
      [
        ["discard", "Hole (discard)"],
        ["ghost", "Translucent ghost (blended)"],
        ["stipple", "Translucent ghost (stippled)"],
        ["shade", "Left whole (shade only)"],
      ],
      () => state.pit,
      (v) => (state.pit = v),
    ),
    slider(
      "Ghost alpha",
      { min: 0.05, max: 0.9, step: 0.05 },
      () => state.alpha,
      (v) => (state.alpha = v),
    ),
    check(
      "Tint the ghost",
      () => state.tint,
      (on) => (state.tint = on),
    ),
    slider(
      "Width",
      { min: 20, max: 90, step: 2 },
      () => state.width,
      (v) => (state.width = v),
      (v) => `${v} m`,
    ),
    slider(
      "Depth",
      { min: 6, max: 16, step: 0.5 },
      () => state.depth,
      (v) => (state.depth = v),
      (v) => `${v} m`,
    ),
    check(
      "Pit walls and floor",
      () => state.walls,
      (on) => (state.walls = on),
    ),
    check(
      "Pipes exempt from clips",
      () => state.exempt,
      (on) => (state.exempt = on),
    ),
    check(
      "OSM buildings (not exempt)",
      () => state.buildings,
      (on) => {
        state.buildings = on;
        void setBuildings(on);
      },
    ),
    el("h3", {}, "Section plane (a custom shader reads its distance)"),
    check(
      "Plane on",
      () => state.plane,
      (on) => (state.plane = on),
    ),
    select(
      "Effect",
      [
        ["hatch", "Hatch and fade (shade: nothing removed)"],
        ["ghost", "Ghost that fades with distance"],
        ["glow", "Cut, with a glowing edge"],
        ["cut", "Cut (discard)"],
      ],
      () => state.planeEffect,
      (v) => (state.planeEffect = v),
    ),
    slider(
      "Offset",
      { min: -40, max: 60, step: 1 },
      () => state.planeOffset,
      (v) => (state.planeOffset = v),
      (v) => `${v} m`,
    ),
    slider(
      "Turn",
      { min: 0, max: 180, step: 5 },
      () => state.planeTurn,
      (v) => (state.planeTurn = v),
      (v) => `${v}°`,
    ),
    slider(
      "Fade reach",
      { min: 4, max: 60, step: 2 },
      () => state.fade,
      (v) => (state.fade = v),
      (v) => `${v} m`,
    ),
    el("h3", {}, "GPU"),
    readout,
    el(
      "p",
      {},
      "A blended ghost draws every opaque triangle again in the translucent passes, keeping only what a ghost removes; a stippled one is a dither in the opaque pass and costs next to nothing. The hole costs what any clip does.",
    ),
  );
  const tick = setInterval(() => {
    const ms = engine.stats.gpuMs;
    const translucent = Object.entries(engine.gpuPasses)
      .filter(([k]) => k.startsWith("translucent"))
      .reduce((sum, [, v]) => sum + (Number.isFinite(v) ? v : 0), 0);
    readout.replaceChildren(
      el("dt", {}, "Frame"),
      el("dd", {}, Number.isFinite(ms) ? `${ms.toFixed(2)} ms` : "n/a"),
      el("dt", {}, "Translucent passes"),
      el("dd", {}, `${translucent.toFixed(2)} ms`),
    );
  }, 500);
  scope.defer(() => clearInterval(tick));
  if (params.buildings === "1") {
    state.buildings = true;
    void setBuildings(true);
  }
  engine.requestRender();
  void populate();
  return () => {};
}
