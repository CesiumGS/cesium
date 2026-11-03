// 2.0's image-based lighting against the reference (plan §4.2): material
// balls rendered by the engine (spherical harmonics for diffuse, GGX-
// prefiltered specular, split-sum BRDF table, Fdez-Agüera multiple
// scattering) and by Monte Carlo integration of the glTF BRDF under the
// same environment cube (src/lighting/iblReference.wgsl). Plus a white
// furnace: in uniform light a white metal reflects exactly all of it at any
// roughness, which single-scattering microfacet models fall short of.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  differenceMap,
  figure,
  luminance,
  picture,
  type HdrPixels,
} from "../lab/hdr.ts";
import { Engine, environmentFrame } from "../src/scene/Engine.ts";
import { OffscreenTarget, type HdrImage } from "../src/scene/View.ts";
import {
  IblReference,
  type ReferenceSphere,
} from "../src/lighting/IblReference.ts";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../src/math/transforms.ts";
import * as v3 from "../src/math/vec3.ts";
import * as m4 from "../src/math/mat4.ts";
import type { MeshData } from "../src/scene/meshes.ts";
import type { SkyOptions } from "../src/gpu/Environment.ts";

const TEMPLATE = `
  <h1>Image-based lighting vs reference</h1>
  <p>Material balls lit only by the environment: 2.0's real-time image-based
  lighting (left) against a Monte Carlo integral of the glTF BRDF under the
  same environment cube (middle), and their relative difference (right:
  red where 2.0 is brighter, blue darker, full color at ±25%). Rows: a
  dielectric and a metal; roughness 0.05 to 1 left to right.</p>
  <div id="status">…</div>
  <div id="images"></div>
  <h2>Per ball</h2>
  <table id="balls"></table>
  <h2>White furnace</h2>
  <p>Uniform white environment, white metal: physically every ball
  reflects exactly 1. The glTF BRDF integrated exactly (single scattering)
  loses energy as roughness grows; 2.0's multiple-scattering compensation
  puts it back.</p>
  <table id="furnace"></table>
`;

let root: HTMLElement;
const $ = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;

const WIDTH = 720;
const HEIGHT = 300;
const ROUGHNESS = [0.05, 0.2, 0.35, 0.5, 0.75, 1];
const SPACING = 2.4;

function uvSphere(segments = 64, rings = 32): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const theta = (r / rings) * Math.PI;
    for (let s = 0; s <= segments; s++) {
      const phi = (s / segments) * 2 * Math.PI;
      const n = [
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta),
      ];
      positions.push(...n);
      normals.push(...n);
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
  };
}

interface Ball extends ReferenceSphere {
  label: string;
}

async function runIbl() {
  const status = $("status");
  const engine = await Engine.create();
  const reference = await IblReference.create(engine.gpu.device);
  const world = engine.createWorld({
    maxDraws: 64,
    vertexBytes: 8 << 20,
    indexBytes: 4 << 20,
  });
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const view = engine.addView({
    target,
    world,
    clearColor: [0, 0, 0],
    lighting: { sunIntensity: 0, diffuseIbl: 1, specularIbl: 1 },
  });

  // Balls in a row east-west, two rows, at a place on the globe.
  const center = Ellipsoid.WGS84.cartographicToCartesian(
    fromDegrees(-75.1652, 39.9526, 50),
    v3.vec3(),
  );
  const enu = eastNorthUpToFixedFrame(center, Ellipsoid.WGS84, m4.mat4());
  const east = [enu[0]!, enu[1]!, enu[2]!];
  const up = [enu[8]!, enu[9]!, enu[10]!];
  const at = (x: number, z: number): Float64Array =>
    Float64Array.from(
      [0, 1, 2].map((k) => center[k]! + east[k]! * x + up[k]! * z),
    );
  const mesh = world.addMesh(uvSphere());
  const place = (balls: Ball[]) => {
    const handles = balls.map((b) =>
      world.addDraw({
        mesh,
        origin: Float64Array.from(b.center),
        radius: b.radius,
        material: world.addMaterial({
          baseColor: [...b.baseColor, 1],
          metallic: b.metallic,
          roughness: b.roughness,
        }),
      }),
    );
    return () => handles.forEach((h) => world.removeDraw(h));
  };

  const camera = view.camera;
  const aspect = WIDTH / HEIGHT;
  const tanY = Math.tan(camera.fovy(aspect) / 2);
  const tanX = tanY * aspect;
  const width = (ROUGHNESS.length - 1) * SPACING + 2.4;
  camera.lookAt(center, 0, 0, width / 2 / tanX);

  const results: Record<string, unknown> = {};
  const rows = (
    dielectric: readonly [number, number, number],
    metal: readonly [number, number, number],
  ): Ball[] => [
    ...ROUGHNESS.map((roughness, i) => ({
      label: `dielectric ${roughness}`,
      center: at((i - (ROUGHNESS.length - 1) / 2) * SPACING, 1.25),
      radius: 1,
      baseColor: dielectric,
      metallic: 0,
      roughness,
    })),
    ...ROUGHNESS.map((roughness, i) => ({
      label: `metal ${roughness}`,
      center: at((i - (ROUGHNESS.length - 1) / 2) * SPACING, -1.25),
      radius: 1,
      baseColor: metal,
      metallic: 1,
      roughness,
    })),
  ];

  /** Renders the balls with the engine and the reference, under `sky`. */
  const compare = async (sky: SkyOptions, balls: Ball[]) => {
    engine.environment.setSky(sky);
    const remove = place(balls);
    const hdr = view.readHdr();
    engine.renderFrame();
    const engineImage: HdrImage = await hdr;
    const referenceImage = await reference.render({
      width: WIDTH,
      height: HEIGHT,
      camera: {
        position: camera.position,
        direction: camera.direction,
        up: camera.up,
        right: camera.right,
        tanX,
        tanY,
      },
      environmentFrame: environmentFrame(camera.position),
      environment: engine.environment.skyCube,
      spheres: balls,
      samples: 512,
    });
    remove();
    return { engineImage, referenceImage };
  };

  // Which ball each pixel sees, and whether it is well inside it (no
  // silhouette pixels, where tessellation and anti-aliasing differ).
  const ballAt = (balls: Ball[]) => {
    const id = new Int16Array(WIDTH * HEIGHT).fill(-1);
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const nx = ((x + 0.5) / WIDTH) * 2 - 1;
        const ny = 1 - ((y + 0.5) / HEIGHT) * 2;
        const d = [0, 1, 2].map(
          (k) =>
            camera.direction[k]! +
            nx * tanX * camera.right[k]! +
            ny * tanY * camera.up[k]!,
        );
        const len = Math.hypot(d[0]!, d[1]!, d[2]!);
        balls.forEach((b, i) => {
          const c = [0, 1, 2].map((k) => b.center[k]! - camera.position[k]!);
          const t = (c[0]! * d[0]! + c[1]! * d[1]! + c[2]! * d[2]!) / len;
          const miss = Math.sqrt(
            Math.max(0, c[0]! ** 2 + c[1]! ** 2 + c[2]! ** 2 - t * t),
          );
          if (miss < 0.92 * b.radius) {
            id[y * WIDTH + x] = i;
          }
        });
      }
    }
    return id;
  };

  const perBall = (
    balls: Ball[],
    engineImage: HdrImage,
    referenceImage: { data: Float32Array },
  ) => {
    const id = ballAt(balls);
    const sums = balls.map(() => ({ e: 0, r: 0, n: 0 }));
    for (let i = 0; i < id.length; i++) {
      const b = id[i]!;
      if (b >= 0) {
        const e = engineImage.data;
        const r = referenceImage.data;
        sums[b]!.e += luminance(e[i * 4]!, e[i * 4 + 1]!, e[i * 4 + 2]!);
        sums[b]!.r += luminance(r[i * 4]!, r[i * 4 + 1]!, r[i * 4 + 2]!);
        sums[b]!.n++;
      }
    }
    return balls.map((b, i) => {
      const s = sums[i]!;
      return {
        ball: b.label,
        reference: Number((s.r / s.n).toFixed(4)),
        engine: Number((s.e / s.n).toFixed(4)),
        difference: `${(((s.e - s.r) / s.r) * 100).toFixed(1)}%`,
      };
    });
  };

  // 1. The default sky, colored balls.
  status.textContent = "sky…";
  const skyBalls = rows([0.8, 0.35, 0.1], [1, 0.766, 0.336]);
  const sky = await compare(
    {
      zenith: [0.18, 0.32, 0.65],
      horizon: [0.62, 0.72, 0.85],
      ground: [0.2, 0.18, 0.15],
    },
    skyBalls,
  );
  const engineHdr: HdrPixels = {
    width: WIDTH,
    height: HEIGHT,
    data: sky.engineImage.data,
    stride: 4,
  };
  const referenceHdr: HdrPixels = {
    width: WIDTH,
    height: HEIGHT,
    data: sky.referenceImage.data,
    stride: 4,
    mask: (i) => sky.referenceImage.data[i * 4 + 3]! > 0,
  };
  const exposure =
    0.5 /
    Math.max(
      ...perBall(skyBalls, sky.engineImage, sky.referenceImage).map(
        (b) => b.reference,
      ),
    );
  $("images").append(
    figure(
      "default sky · 2.0 · reference · difference",
      picture(engineHdr, exposure),
      picture(referenceHdr, exposure),
      differenceMap(
        referenceHdr,
        { ...engineHdr, mask: referenceHdr.mask },
        0.25,
      ),
    ),
  );
  const balls = perBall(skyBalls, sky.engineImage, sky.referenceImage);
  results.balls = balls;
  $("balls").innerHTML = table(balls);

  // 2. White furnace.
  status.textContent = "furnace…";
  const white: SkyOptions = {
    zenith: [1, 1, 1],
    horizon: [1, 1, 1],
    ground: [1, 1, 1],
    belowHorizon: [1, 1, 1],
  };
  const furnaceBalls = rows([1, 1, 1], [1, 1, 1]);
  const furnace = await compare(white, furnaceBalls);
  const furnaceRows = perBall(
    furnaceBalls,
    furnace.engineImage,
    furnace.referenceImage,
  ).map((r) => ({
    ...r,
    physical: r.ball.startsWith("metal") ? 1 : "—",
  }));
  results.furnace = furnaceRows;
  $("furnace").innerHTML = table(furnaceRows);
  const furnaceEngine: HdrPixels = {
    width: WIDTH,
    height: HEIGHT,
    data: furnace.engineImage.data,
    stride: 4,
  };
  const furnaceReference: HdrPixels = {
    width: WIDTH,
    height: HEIGHT,
    data: furnace.referenceImage.data,
    stride: 4,
    mask: (i) => furnace.referenceImage.data[i * 4 + 3]! > 0,
  };
  $("images").append(
    figure(
      "white furnace · 2.0 · reference (single scattering) · difference",
      picture(furnaceEngine, 0.7),
      picture(furnaceReference, 0.7),
      differenceMap(
        furnaceReference,
        { ...furnaceEngine, mask: furnaceReference.mask },
        0.25,
      ),
    ),
  );

  // The default sky again, for whatever else shares the engine.
  engine.environment.setSky();
  status.textContent = "done";
  engine.destroy();
  return results;
}

function table(rows: Array<Record<string, number | string>>): string {
  const keys = Object.keys(rows[0] ?? {});
  return `<tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr>${rows
    .map((r) => `<tr>${keys.map((k) => `<td>${r[k]}</td>`).join("")}</tr>`)
    .join("")}`;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runIbl };
  },
};
