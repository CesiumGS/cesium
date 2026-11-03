import {
  Camera,
  CustomShader,
  Ellipsoid,
  Engine,
  MaterialFlags,
  OffscreenTarget,
  createBox,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type MeshData,
  type World,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";
import { flip } from "./flip.ts";

const TEMPLATE = `
<h1>Custom shaders</h1>
<p>
  Boxes on a ground plane, drawn with the engine's shader and with a custom
  shader's stages (plan §3.4, "Custom shading"): every pass that draws them
  (opaque, depth, shadow, ambient occlusion, translucent) compiles from the
  custom module. Stages that change nothing, and a shader that fails to
  compile (the content keeps the default), must match the default exactly;
  the others must differ. Click a row to see its images.
</p>
<div class="status">Run to render every case both ways.</div>
<div class="images">
  <figure>
    <figcaption>Default</figcaption>
    <canvas class="out" data-id="default"></canvas>
  </figure>
  <figure>
    <figcaption>Custom</figcaption>
    <canvas class="out" data-id="custom"></canvas>
  </figure>
</div>
<table data-id="results"></table>`;

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const WIDTH = 640;
const HEIGHT = 400;
const deg = Math.PI / 180;
const SITE = fromDegrees(-75.1652, 39.9526, 0);

interface Case {
  name: string;
  shader: CustomShader;
  /** Must match the default exactly (else must differ). */
  same: boolean;
  /** Compiling must fail. */
  fails?: boolean;
  /** The boxes blended (alpha 0.5). */
  blended?: boolean;
}

const CASES: Case[] = [
  {
    name: "identity (both stages)",
    same: true,
    shader: new CustomShader({
      label: "identity",
      vertex: `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  (*vsOutput).positionMC = vsInput.positionMC;
}`,
      fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor = (*material).baseColor;
}`,
    }),
  },
  {
    name: "compile error (falls back)",
    same: true,
    fails: true,
    shader: new CustomShader({
      label: "broken",
      fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).nope = 1.0;
}`,
    }),
  },
  {
    name: "fragment: color by height",
    same: false,
    shader: new CustomShader({
      label: "height",
      fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  let t = clamp(fsInput.positionMC.z + 0.5, 0.0, 1.0);
  (*material).baseColor = mix(vec3f(0.1, 0.2, 0.9), vec3f(0.95, 0.3, 0.1), t);
}`,
    }),
  },
  {
    name: "vertex: twist about up",
    same: false,
    shader: new CustomShader({
      label: "twist",
      vertex: `fn twist(v: vec3f, a: f32) -> vec3f {
  let c = cos(a);
  let s = sin(a);
  return vec3f(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
}
fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  let a = vsInput.positionMC.z * 1.5;
  (*vsOutput).positionMC = twist(vsInput.positionMC, a);
  (*vsOutput).normalMC = twist(vsInput.normalMC, a);
}`,
    }),
  },
  {
    name: "fragment: unlit red",
    same: false,
    shader: new CustomShader({
      label: "unlit",
      fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor = vec3f(1.0, 0.0, 0.0);
  (*material).unlit = true;
}`,
    }),
  },
  {
    name: "translucent: tint green",
    same: false,
    blended: true,
    shader: new CustomShader({
      label: "tint",
      fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor = (*material).baseColor * vec3f(0.2, 1.0, 0.2);
}`,
    }),
  },
];

/** A unit square in its xy-plane, facing +z. */
function square(): MeshData {
  return {
    positions: new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}

/** A ground plane and three boxes; the boxes with `shader`. */
function build(world: World, c: Case, shader: CustomShader | undefined): void {
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  mat4.setTranslation(enu, vec3.vec3());
  const ground = world.addMaterial({
    baseColor: [0.6, 0.6, 0.55, 1],
    roughness: 0.9,
  });
  world.addDraw({
    mesh: world.addMesh(square()),
    origin,
    model: mat4.multiply(
      mat4.mat4(),
      enu,
      mat4.fromScale(mat4.mat4(), 40, 40, 1),
    ),
    material: ground,
  });
  const box = world.addMesh(createBox());
  const colors = [
    [0.8, 0.2, 0.2],
    [0.2, 0.7, 0.3],
    [0.2, 0.4, 0.9],
  ] as const;
  colors.forEach((color, i) => {
    const material = world.addMaterial({
      baseColor: [...color, c.blended ? 0.5 : 1],
      roughness: 0.5,
      flags: c.blended ? MaterialFlags.alphaBlend : 0,
    });
    const local = mat4.fromScale(mat4.mat4(), 4, 4, 8);
    mat4.setTranslation(local, vec3.vec3((i - 1) * 9, 0, 4));
    world.addDraw({
      mesh: box,
      origin,
      model: mat4.multiply(mat4.mat4(), enu, local),
      material,
      doubleSided: c.blended ?? false,
      ...(shader ? { shader } : {}),
    });
  });
}

const frame = () => new Promise((resolve) => setTimeout(resolve, 30));

async function render(
  engine: Engine,
  target: OffscreenTarget,
  c: Case,
  shader: CustomShader | undefined,
): Promise<ImageData> {
  const world = engine.createWorld({
    maxDraws: 16,
    maxMaterials: 16,
    vertexBytes: 1 << 20,
    indexBytes: 1 << 20,
  });
  build(world, c, shader);
  const camera = new Camera();
  camera.near = 0.1;
  const center = Ellipsoid.WGS84.cartographicToCartesian(
    { ...SITE, height: 4 },
    vec3.vec3(),
  );
  camera.lookAt(center, 25 * deg, -25 * deg, 45);
  const view = engine.addView({
    target,
    world,
    camera,
    background: "color",
    clearColor: [0.03, 0.04, 0.06],
    lighting: { environment: "procedural" },
    // Every pass the custom module drives: casters and the AO prepass too.
    shadows: true,
    ambientOcclusion: true,
  });
  for (let i = 0; i < 4; i++) {
    engine.renderFrame();
    await frame();
  }
  const image = new ImageData(await target.read(), WIDTH, HEIGHT);
  engine.removeView(view);
  engine.worlds.splice(engine.worlds.indexOf(world), 1);
  world.destroy();
  return image;
}

interface Row {
  case: string;
  expected: string;
  compiled: string;
  flipMean: number;
  pass: boolean;
}

let lastImages: { default: ImageData; custom: ImageData }[] = [];

async function runCustomShader(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const engine = await Engine.create();
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  // The sun 35° up in the southwest, so the boxes cast long shadows.
  const ellipsoid = Ellipsoid.WGS84;
  const enu = eastNorthUpToFixedFrame(
    ellipsoid.cartographicToCartesian(SITE, vec3.vec3()),
    ellipsoid,
    mat4.mat4(),
  );
  const elevation = 35 * deg;
  const azimuth = 225 * deg; // clockwise from north
  const local = [
    Math.cos(elevation) * Math.sin(azimuth),
    Math.cos(elevation) * Math.cos(azimuth),
    Math.sin(elevation),
  ];
  for (let k = 0; k < 3; k++) {
    engine.sunDirection[k] =
      enu[k]! * local[0]! + enu[4 + k]! * local[1]! + enu[8 + k]! * local[2]!;
  }
  const rows: Row[] = [];
  lastImages = [];
  for (const c of CASES) {
    status.textContent = `${c.name}…`;
    let compiled = "yes";
    try {
      await engine.compileShader(c.shader);
    } catch (error) {
      compiled = `failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    const base = await render(engine, target, c, undefined);
    const custom = await render(engine, target, c, c.shader);
    const f = flip(base.data, custom.data, WIDTH, HEIGHT);
    const failed = compiled !== "yes";
    rows.push({
      case: c.name,
      expected: c.same ? "same" : "differs",
      compiled,
      flipMean: f.mean,
      pass:
        failed === (c.fails ?? false) &&
        (c.same ? f.mean === 0 : f.mean > 0.005),
    });
    lastImages.push({ default: base, custom });
    renderTable(rows);
  }
  if (lastImages.length) {
    showImages(lastImages[0]!);
  }
  const passed = rows.filter((r) => r.pass).length;
  status.textContent = `Done: ${passed} of ${rows.length} pass.`;
  target.destroy();
  engine.destroy();
  return rows;
}

function showImages(images: { default: ImageData; custom: ImageData }): void {
  for (const id of ["default", "custom"] as const) {
    const canvas = $<HTMLCanvasElement>(id);
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext("2d")!.putImageData(images[id], 0, 0);
  }
}

function renderTable(rows: Row[]): void {
  const table = $("results");
  table.innerHTML = `<tr><th>Case</th><th>Expected</th><th>Compiled</th><th>FLIP mean vs default</th><th>Pass</th></tr>${rows
    .map(
      (r, i) =>
        `<tr class="row" data-index="${i}"><td>${r.case}</td><td>${r.expected}</td><td>${r.compiled}</td><td>${r.flipMean.toFixed(4)}</td><td>${r.pass ? "yes" : "NO"}</td></tr>`,
    )
    .join("")}`;
  table.querySelectorAll<HTMLTableRowElement>("tr.row").forEach((tr) =>
    tr.addEventListener("click", () => {
      table.querySelector("tr.selected")?.classList.remove("selected");
      tr.classList.add("selected");
      showImages(lastImages[Number(tr.dataset.index)]!);
    }),
  );
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runCustomShader };
  },
};
