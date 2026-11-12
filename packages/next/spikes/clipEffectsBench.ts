// GPU time of clips on the globe: world clips (planes, boxes, extruded
// polygons: a per-fragment test in a storage-buffer table) against terrain
// regions (`Globe.terrain.addRegion`: per-tile masks and a per-fragment grid
// of edges), and of what a clip's effect costs: discard, a blended ghost, a
// dithered ghost, a custom shader reading the clip's distance.
//
// Cesium World Terrain with Bing imagery and OSM Buildings over Lower
// Manhattan at 1920 × 1080 (or 3840 × 2160; needs an ion token and the
// network). Every variant is read in five rounds, interleaved (the GPU is
// shared, and what shares it only slows a round: one reading is not a
// measurement), 16 readings 120 ms apart each; the fastest round's median is
// reported, with the median of the rounds' and the slowest's.
// `runClipBench()` has the engine's own shaders; `runClipBenchCustom()` the
// custom shader on terrain and tiles (a fragment stage that reads the clip:
// hatch and fade); `runClipBench4k()` and `runClipBenchCustom4k()` the same at
// 3840 × 2160.
import {
  BingImagery,
  CanvasTarget,
  CustomShader,
  Ellipsoid,
  Engine,
  UNITLESS_EXPOSURE,
  eastNorthUpToFixedFrame,
  fromDegrees,
  ionDefaults,
  resolveIonAsset,
  type ClipSet,
  type ClipShape,
  type Globe,
  type Tileset3D,
  type WorldClip,
} from "../src/index.ts";
import {
  createFrameCatalog,
  createFramesResolver,
  eastNorthUpFrame,
} from "../src/frames/index.ts";
import type { TerrainRegion } from "../src/globe/Globe.ts";
import { NEEDS_TOKEN, userToken } from "../bench/suite/ionToken.ts";

const WIDTHS = { hd: [1920, 1080], uhd: [3840, 2160] } as const;
const DEG = Math.PI / 180;
/** Lower Manhattan, the buildings' densest part. */
const SITE = { longitude: -74.0075, latitude: 40.7128 };
const ROUNDS = 5;
const READINGS = 16;
const SETTLE_MS = 1000;
const READING_MS = 120;

interface Row {
  name: string;
  gpuMs: number;
  min: number;
  max: number;
  translucentMs: number;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const median = (values: number[]) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : Number.NaN;
};

/** The hatch and fade shader: reads what the clip tells it. */
const CLIP_STYLE_WGSL = /* wgsl */ `
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  if (fsInput.clipId == 0xffffffffu) {
    return;
  }
  let d = fsInput.clipDistance;
  let grey = vec3f(dot((*material).baseColor, vec3f(0.2126, 0.7152, 0.0722)));
  let fade = clamp(d / 25.0 + 0.5, 0.0, 1.0);
  (*material).baseColor = mix((*material).baseColor, grey * vec3f(0.6, 0.8, 1.0), fade * 0.85);
  if (d > 0.0 && fract((fsInput.screen.x + fsInput.screen.y) / 8.0) < 0.35) {
    (*material).baseColor = (*material).baseColor * 0.6;
  }
}
`;

type Cleanup = () => void;

/** What a clip set does with what it doesn't keep (`ClipSet.effect`). */
type ClipEffect = NonNullable<ClipSet["effect"]>;

interface Variant {
  name: string;
  /** Applies it; returns what removes it. */
  apply(): Cleanup;
  /** Whether the tileset is drawn (terrain alone, or with the buildings). */
  tileset?: boolean;
}

export async function runBench(
  root: HTMLElement,
  custom = false,
  size: keyof typeof WIDTHS = "hd",
): Promise<{
  adapter: string;
  checks: Array<{ pass: boolean; name: string; measured: unknown }>;
}> {
  const status = root.querySelector<HTMLElement>(".status");
  const say = (text: string) => {
    if (status) {
      status.textContent = text;
    }
  };
  const token = userToken();
  if (!token) {
    throw new Error(`the clip benchmark ${NEEDS_TOKEN}`);
  }
  ionDefaults.accessToken = token;
  const engine = await Engine.create();
  const rows: Row[] = [];
  try {
    const world = engine.createWorld({
      maxDraws: 1 << 16,
      maxMaterials: 1 << 13,
      vertexBytes: 512 << 20,
      indexBytes: 256 << 20,
    });
    // Reference frames: the site's east-north-up (clip shapes are in local
    // metres, polygons extrude along up).
    const catalog = createFrameCatalog();
    const itrf = catalog.get("ITRF");
    const origin = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(SITE.longitude, SITE.latitude, 0),
      new Float64Array(3),
    );
    const local = eastNorthUpFrame("site", itrf, Ellipsoid.WGS84, origin);
    catalog.add(local);
    engine.cameras.setResolver(world, createFramesResolver(catalog));
    const canvas = document.createElement("canvas");
    canvas.width = WIDTHS[size][0];
    canvas.height = WIDTHS[size][1];
    // The target sizes the canvas by its CSS size and the device's pixel
    // ratio: a canvas of its own size, so a pixel is a pixel.
    canvas.style.cssText = `position: fixed; left: 0; top: 0; width: ${WIDTHS[size][0]}px; height: ${WIDTHS[size][1]}px; pointer-events: none`;
    root.append(canvas);
    const view = engine.addView({
      target: new CanvasTarget(canvas),
      world,
      observer: { exposure: UNITLESS_EXPOSURE },
      lighting: { environment: "procedural" },
    });
    view.camera.near = 1;
    view.camera.lookAt(origin, 20 * DEG, -32 * DEG, 650);

    const shader = custom
      ? new CustomShader({ fragment: CLIP_STYLE_WGSL, label: "clip style" })
      : undefined;
    say("loading terrain, imagery and buildings…");
    const [ion, imagery, osm] = await Promise.all([
      resolveIonAsset(1),
      BingImagery.fromIon(2),
      resolveIonAsset(96188),
    ]);
    const globe: Globe = await engine.addTerrain(world, ion.url, {
      headers: ion.headers,
      imagery,
      ...(shader ? { customShader: shader } : {}),
    });
    const buildings: Tileset3D = await engine.addTileset(world, osm.url, {
      headers: osm.headers,
      ...(shader ? { customShader: shader } : {}),
    });
    engine.renderMode = "continuous";
    engine.start();
    const settled = () =>
      [globe, buildings].every(
        (t) => t.idle && t.stats.inFlight === 0 && !(t.imagery?.busy ?? false),
      );
    const t0 = performance.now();
    while (performance.now() - t0 < 150_000) {
      await wait(500);
      if (settled() && performance.now() - t0 > 6000) {
        break;
      }
    }
    // Every clipped pipeline made now: no variant measures a compile.
    console.log(
      `[bench] settled after ${((performance.now() - t0) / 1000).toFixed(0)} s: ${globe.stats.inFlight} in flight; canvas ${canvas.width}×${canvas.height}, view ${JSON.stringify(view.pixelRect())}`,
    );
    await engine.ctx.pipelines.warmClipped();
    await wait(1000);

    // --- shapes about the site, in its east-north-up metres ----------------
    const octagon = (cx: number, cy: number, r: number) =>
      Array.from({ length: 8 }, (_, i) => {
        const a = ((i + 0.5) / 8) * 2 * Math.PI;
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
      });
    /** `n` places in two rings about the site, east-north metres. */
    const places = (n: number): Array<[number, number]> =>
      Array.from({ length: n }, (_, i) => {
        const ring = n <= 4 ? 0 : i % 2;
        const count = n <= 4 ? n : n / 2;
        const k = n <= 4 ? i : (i - ring) / 2;
        const a = (k / count) * 2 * Math.PI + ring * 0.3;
        const r = n === 1 ? 30 : 70 + ring * 70;
        return [r * Math.cos(a), r * Math.sin(a)];
      });
    const shapes = (kind: "plane" | "box" | "polygon", n: number) =>
      places(n).map(([x, y], i): ClipShape => {
        if (kind === "plane") {
          // Beyond 500 m, at an angle about the site: the scene is on the kept side.
          const a = (i / n) * 2 * Math.PI;
          return {
            kind: "plane",
            point: [500 * Math.cos(a), 500 * Math.sin(a), 0],
            normal: [-Math.cos(a), -Math.sin(a), 0],
          };
        }
        if (kind === "box") {
          return {
            kind: "box",
            center: [x, y, 0],
            halfExtents: [20, 20, 300],
          };
        }
        return {
          kind: "polygon",
          ring: octagon(x, y, 20),
          zRange: [-300, 300],
        };
      });
    const set = (
      kind: "plane" | "box" | "polygon",
      n: number,
      effect?: ClipEffect,
    ): ClipSet => ({
      frame: local,
      shapes: shapes(kind, n),
      combine: "union",
      keep: "outside",
      ...(effect ? { effect } : {}),
    });
    const withClip = (s: ClipSet): Cleanup => {
      const clip: WorldClip = world.addClip(s);
      view.setClips([clip]);
      return () => {
        view.setClips([]);
        world.removeClip(clip);
      };
    };
    /** Terrain regions at the same places: octagons in degrees. */
    const withRegions = (n: number, opacity: number): Cleanup => {
      const east = [0, 0, 0];
      const north = [0, 0, 0];
      const m = eastNorthUpToFixedFrame(
        origin,
        Ellipsoid.WGS84,
        new Float64Array(16),
      );
      for (let k = 0; k < 3; k++) {
        east[k] = m[k]!;
        north[k] = m[4 + k]!;
      }
      const regions: TerrainRegion[] = places(n).map(([x, y]) =>
        globe.terrain.addRegion(
          {
            polygon: octagon(x, y, 20).map(([e, nn]) => {
              const p = [0, 1, 2].map(
                (k) => origin[k]! + e * east[k]! + nn * north[k]!,
              );
              const c = Ellipsoid.WGS84.cartesianToCartographic(
                Float64Array.from(p),
                { longitude: 0, latitude: 0, height: 0 },
              )!;
              return {
                longitude: c.longitude / DEG,
                latitude: c.latitude / DEG,
              };
            }),
          },
          { opacity },
        ),
      );
      return () => {
        for (const r of regions) {
          r.remove();
        }
      };
    };

    const ghost = (alpha: number, method?: "stipple"): ClipEffect => ({
      kind: "translucent",
      alpha,
      ...(method ? { method } : {}),
    });
    const variants: Variant[] = [
      { name: "no clip", apply: () => () => {} },
      ...([1, 4, 16] as const).flatMap((n) =>
        (["plane", "box", "polygon"] as const).map((kind): Variant => ({
          name: `world ${kind} ×${n}, discard`,
          apply: () => withClip(set(kind, n)),
        })),
      ),
      ...([1, 4, 16] as const).map((n): Variant => ({
        name: `terrain regions ×${n}, cut`,
        apply: () => withRegions(n, 0),
      })),
      ...([1, 4, 16] as const).map((n): Variant => ({
        name: `terrain regions ×${n}, 30% translucent`,
        apply: () => withRegions(n, 0.3),
      })),
      // Terrain alone: the one the regions can reach.
      {
        name: "terrain only, no clip",
        tileset: false,
        apply: () => () => {},
      },
      {
        name: "terrain only, world box ×1, discard",
        tileset: false,
        apply: () => withClip(set("box", 1)),
      },
      {
        name: "terrain only, terrain region ×1, cut",
        tileset: false,
        apply: () => withRegions(1, 0),
      },
      {
        name: "terrain only, world box ×1, ghost 0.3 (blended)",
        tileset: false,
        apply: () => withClip(set("box", 1, ghost(0.3))),
      },
      {
        name: "terrain only, terrain region ×1, 30% translucent",
        tileset: false,
        apply: () => withRegions(1, 0.3),
      },
      {
        name: "terrain only, world box ×1, ghost 0.3 (stipple)",
        tileset: false,
        apply: () => withClip(set("box", 1, ghost(0.3, "stipple"))),
      },
      // With the buildings: the world clip reaches them too.
      {
        name: "world box ×1, ghost 0.3 (blended)",
        apply: () => withClip(set("box", 1, ghost(0.3))),
      },
      {
        name: "world box ×4, ghost 0.3 (blended)",
        apply: () => withClip(set("box", 4, ghost(0.3))),
      },
      {
        name: "world box ×16, ghost 0.3 (blended)",
        apply: () => withClip(set("box", 16, ghost(0.3))),
      },
      {
        name: "world box ×1, ghost 0.3 (stipple)",
        apply: () => withClip(set("box", 1, ghost(0.3, "stipple"))),
      },
      {
        name: "world box ×1, shade (reports, removes nothing)",
        apply: () => withClip(set("box", 1, { kind: "shade" })),
      },
      {
        name: "world box ×1, discard that reports",
        apply: () => withClip(set("box", 1, { kind: "discard" })),
      },
    ];

    const sample = async (): Promise<{ gpu: number; translucent: number }> => {
      await wait(SETTLE_MS);
      const gpu: number[] = [];
      const translucent: number[] = [];
      for (let i = 0; i < READINGS; i++) {
        await wait(READING_MS);
        gpu.push(engine.stats.gpuMs);
        const passes = engine.gpuPasses;
        translucent.push(
          Object.entries(passes)
            .filter(([k]) => k.startsWith("translucent"))
            .reduce((sum, [, v]) => sum + (Number.isFinite(v) ? v : 0), 0),
        );
      }
      return { gpu: median(gpu), translucent: median(translucent) };
    };

    const byVariant = new Map<
      string,
      Array<{ gpu: number; translucent: number }>
    >();
    for (let round = 0; round < ROUNDS; round++) {
      for (const variant of variants) {
        if (custom && /terrain regions/.test(variant.name)) {
          // The regions have no effect to read: their cost is the default run's.
          continue;
        }
        say(`round ${round + 1} of ${ROUNDS}: ${variant.name}…`);
        buildings.show = variant.tileset !== false;
        const undo = variant.apply();
        const reading = await sample();
        undo();
        buildings.show = true;
        console.log(
          `[bench] round ${round + 1} ${variant.name}: ${reading.gpu.toFixed(2)} ms (translucent ${reading.translucent.toFixed(2)})`,
        );
        byVariant.set(variant.name, [
          ...(byVariant.get(variant.name) ?? []),
          reading,
        ]);
      }
    }
    for (const variant of variants) {
      const readings = byVariant.get(variant.name);
      if (!readings) {
        continue;
      }
      const gpus = readings.map((r) => r.gpu);
      rows.push({
        name: variant.name,
        gpuMs: Math.min(...gpus),
        min: median(gpus),
        max: Math.max(...gpus),
        translucentMs: median(readings.map((r) => r.translucent)),
      });
    }
    say("done");
    const info = engine.gpu.adapter.info;
    const base = rows[0]!.gpuMs;
    return {
      adapter: `${info.vendor} ${info.architecture} ${info.description}`,
      checks: rows.map((r) => ({
        pass: true,
        name: `${custom ? "[custom shader] " : ""}${r.name}`,
        measured: {
          "GPU ms (fastest round)": +r.gpuMs.toFixed(2),
          "vs no clip": `${r.gpuMs - base >= 0 ? "+" : ""}${(r.gpuMs - base).toFixed(2)}`,
          "median of rounds": +r.min.toFixed(2),
          "slowest round": +r.max.toFixed(2),
          "translucent passes ms": +r.translucentMs.toFixed(2),
        },
      })),
    };
  } finally {
    engine.stop();
    engine.destroy();
  }
}
