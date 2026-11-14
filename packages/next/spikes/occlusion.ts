// Occlusion feedback's GPU passes (plan Task 12, fix 7): the depth pyramid and
// the tile queries (shaders/hzb.slang, occlusionQuery.slang;
// render/view/occlusionPass.ts), on a scene whose depth is known.
//
// The scene is a multisampled reverse-Z depth buffer: a wall 2 m from the eye
// over the middle of the view, a floor 100 m away below the horizon, and sky
// above. Checks:
//   1. every level of the pyramid is the farthest-depth reduction of the
//      scene (against the CPU's `buildPyramid`), on a frame of odd size;
//   2. a box behind the wall reads hidden and one beside it visible, and the
//      GPU's bit agrees with the CPU reference (`boxHidden`) for thousands of
//      random boxes;
//   3. what the two passes cost at 1920 × 1080 with a full list (8,192 boxes).
//
// Run: node scripts/runSpike.mjs "http://127.0.0.1:5190/spikes/occlusion.html?bench" runOcclusion
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import hzbWgsl from "../src/shaders/generated/hzb.wgsl?raw";
import occlusionQueryWgsl from "../src/shaders/generated/occlusionQuery.wgsl?raw";
import { FrameOcclusion } from "../src/render/view/occlusionPass.ts";
import {
  boxHidden,
  buildPyramid,
  pyramidShape,
  type PyramidCamera,
} from "../src/render/view/occlusionMath.ts";
import { OcclusionQueries } from "../src/scene/occlusionFeedback.ts";
import { MAX_QUERIES, QUERY_FLOATS } from "../src/streaming/occlusion.ts";

const TEMPLATE = `
<h1>Occlusion feedback: depth pyramid and tile queries</h1>
<p>
  The pyramid's levels and the query kernel's bits, against the CPU reference,
  on a multisampled reverse-Z depth buffer with a wall, a floor and sky; then
  their GPU time at 1920 × 1080 with 8,192 boxes.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>`;

interface Check {
  name: string;
  measured: Record<string, number | string>;
  pass: boolean;
}

let root: HTMLElement;
const SAMPLES = 4;

/** The scene's depth at a pixel (pixel-aligned edges: every sample of a pixel agrees). */
function sceneDepth(width: number, height: number) {
  const skyRows = Math.round(height / 3);
  const wallFrom = Math.round((width * 11) / 32);
  const wallTo = Math.round((width * 21) / 32);
  return {
    skyRows,
    wallFrom,
    wallTo,
    depth: (x: number, y: number) =>
      y < skyRows ? 0 : x >= wallFrom && x < wallTo ? 0.5 : 0.01,
  };
}

const DEPTH_ONLY = /* wgsl */ `
struct Rect { rect: vec4f, depth: f32 }
@group(0) @binding(0) var<uniform> q: Rect;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var corners = array<vec2f, 6>(
    vec2f(0, 0), vec2f(1, 0), vec2f(0, 1), vec2f(1, 1), vec2f(0, 1), vec2f(1, 0));
  let p = mix(q.rect.xy, q.rect.zw, corners[i]);
  return vec4f(p, q.depth, 1);
}
@fragment fn fs() {}
`;

/** Draws the scene into a new multisampled depth texture. */
async function drawScene(device: GPUDevice, width: number, height: number) {
  const scene = sceneDepth(width, height);
  const depth = device.createTexture({
    label: "spike.depth",
    size: [width, height],
    format: "depth32float",
    sampleCount: SAMPLES,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  const module = device.createShaderModule({ code: DEPTH_ONLY });
  const pipeline = await device.createRenderPipelineAsync({
    layout: "auto",
    vertex: { module, entryPoint: "vs" },
    fragment: { module, entryPoint: "fs", targets: [] },
    depthStencil: {
      format: "depth32float",
      depthWriteEnabled: true,
      depthCompare: "greater",
    },
    multisample: { count: SAMPLES },
  });
  const ndcX = (x: number) => -1 + (2 * x) / width;
  const ndcY = (y: number) => 1 - (2 * y) / height;
  const rects: Array<[number, number, number, number, number]> = [
    // The floor below the sky, then the wall over its middle (nearer wins).
    [-1, ndcY(height), 1, ndcY(scene.skyRows), 0.01],
    [
      ndcX(scene.wallFrom),
      ndcY(height),
      ndcX(scene.wallTo),
      ndcY(scene.skyRows),
      0.5,
    ],
  ];
  const enc = device.createCommandEncoder();
  const pass = enc.beginRenderPass({
    colorAttachments: [],
    depthStencilAttachment: {
      view: depth.createView(),
      depthClearValue: 0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  });
  pass.setPipeline(pipeline);
  for (const [x0, y0, x1, y1, d] of rects) {
    const buffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(
      buffer,
      0,
      new Float32Array([x0, y0, x1, y1, d, 0, 0, 0]),
    );
    pass.setBindGroup(
      0,
      device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer } }],
      }),
    );
    pass.draw(6);
  }
  pass.end();
  device.queue.submit([enc.finish()]);
  return { depth, scene };
}

async function readBuffer(device: GPUDevice, buffer: GPUBuffer, bytes: number) {
  const copy = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const enc = device.createCommandEncoder();
  enc.copyBufferToBuffer(buffer, 0, copy, 0, bytes);
  device.queue.submit([enc.finish()]);
  await copy.mapAsync(GPUMapMode.READ);
  const data = copy.getMappedRange().slice(0);
  copy.destroy();
  return data;
}

function random(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function boxes(
  count: number,
  camera: PyramidCamera,
  seed: number,
): OcclusionQueries {
  const rand = random(seed);
  const list = new OcclusionQueries(0);
  for (let i = 0; i < count; i++) {
    const z = 2 ** (rand() * 9); // 1 to 512 m
    const spreadX = z * camera.tanX * 1.2;
    const spreadY = z * camera.tanY * 1.2;
    const size = z * 2 ** (-1 - rand() * 4);
    const at = i * QUERY_FLOATS;
    list.data.set(
      [
        (rand() * 2 - 1) * spreadX,
        (rand() * 2 - 1) * spreadY,
        z,
        size * (0.2 + rand()),
        0,
        0,
        0,
        size * (0.2 + rand()),
        0,
        0,
        0,
        size * (0.2 + rand()),
      ],
      at,
    );
    list.tiles[i] = undefined;
  }
  list.count = count;
  return list;
}

async function runOcclusion() {
  const status = root.querySelector(".status")!;
  status.textContent = "checking…";
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    throw new Error("no WebGPU adapter");
  }
  const timestamps = adapter.features.has("timestamp-query");
  const device = await adapter.requestDevice({
    requiredFeatures: timestamps ? ["timestamp-query"] : [],
  });
  let lost = false;
  void device.lost.then((info) => {
    lost = true;
    console.error("[occlusion] device lost:", info.reason, info.message);
  });
  device.addEventListener("uncapturederror", (e) =>
    console.error(
      "[occlusion] GPU error:",
      (e as GPUUncapturedErrorEvent).error.message,
    ),
  );
  const hzb = device.createShaderModule({ code: hzbWgsl });
  const query = device.createShaderModule({ code: occlusionQueryWgsl });
  const [hzbLevel0, hzbReduce, occlusionQuery] = await Promise.all([
    device.createComputePipelineAsync({
      layout: "auto",
      compute: { module: hzb, entryPoint: "level0" },
    }),
    device.createComputePipelineAsync({
      layout: "auto",
      compute: { module: hzb, entryPoint: "reduce" },
    }),
    device.createComputePipelineAsync({
      layout: "auto",
      compute: { module: query, entryPoint: "main" },
    }),
  ]);
  const pipelines = {
    hzbLevel0,
    hzbReduce,
    occlusionQuery,
  } as unknown as ConstructorParameters<typeof FrameOcclusion>[1];
  const checks: Check[] = [];

  // 1 and 2: an odd-sized frame, so the edge folds are exercised.
  for (const [width, height] of [
    [641, 361],
    [640, 360],
  ] as const) {
    const { depth, scene } = await drawScene(device, width, height);
    const occlusion = new FrameOcclusion(
      device,
      pipelines,
      depth.createView(),
      width,
      height,
    );
    const camera: PyramidCamera = {
      frameWidth: width,
      frameHeight: height,
      tanX: 1,
      tanY: height / width,
      near: 1,
    };
    const list = boxes(MAX_QUERIES, camera, 12345);
    const built = {
      tanX: camera.tanX,
      tanY: camera.tanY,
      near: camera.near,
      position: new Float64Array(3),
      direction: Float64Array.of(0, 0, 1),
      up: Float64Array.of(0, 1, 0),
      right: Float64Array.of(1, 0, 0),
    };
    const enc = device.createCommandEncoder();
    const { readback, words } = occlusion.encode(enc, pipelines, list, built);
    device.queue.submit([enc.finish()]);
    await readback.mapAsync(GPUMapMode.READ, 0, words * 4);
    const bits = new Uint32Array(
      readback.getMappedRange(0, words * 4).slice(0),
    );
    readback.unmap();

    // The pyramid, level by level.
    const shape = pyramidShape(width, height);
    const expected = buildPyramid(width, height, scene.depth);
    let worst = 0;
    let wrong = 0;
    for (let level = 0; level < shape.levels; level++) {
      const w = expected[level]!.width;
      const h = expected[level]!.height;
      const bytesPerRow = Math.ceil((w * 4) / 256) * 256;
      const copy = device.createBuffer({
        size: bytesPerRow * h,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      const e = device.createCommandEncoder();
      e.copyTextureToBuffer(
        { texture: occlusion.pyramid.texture, mipLevel: level },
        { buffer: copy, bytesPerRow },
        [w, h],
      );
      device.queue.submit([e.finish()]);
      await copy.mapAsync(GPUMapMode.READ);
      const raw = new Float32Array(copy.getMappedRange().slice(0));
      copy.destroy();
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const got = raw[y * (bytesPerRow / 4) + x]!;
          const want = expected[level]!.texels[y * w + x]!;
          worst = Math.max(worst, Math.abs(got - want));
          if (got !== want) {
            wrong++;
          }
        }
      }
    }
    checks.push({
      name: `pyramid levels vs the farthest-depth reduction, ${width} × ${height} (${shape.width} × ${shape.height}, ${shape.levels} levels)`,
      measured: { "texels differing": wrong, "worst difference": worst },
      pass: wrong === 0,
    });

    // The boxes: GPU against the CPU reference.
    const levels = expected;
    let disagree = 0;
    let hidden = 0;
    for (let i = 0; i < list.count; i++) {
      const at = i * QUERY_FLOATS;
      const cpu = boxHidden(levels, camera, {
        centre: Array.from(list.data.slice(at, at + 3)),
        axes: Array.from(list.data.slice(at + 3, at + 12)),
      });
      const gpu = ((bits[i >> 5]! >>> (i & 31)) & 1) === 1;
      hidden += gpu ? 1 : 0;
      if (cpu !== gpu) {
        disagree++;
      }
    }
    checks.push({
      name: `${list.count} random boxes, GPU bit vs CPU reference, ${width} × ${height}`,
      measured: {
        disagree,
        "hidden by the GPU": hidden,
        "share hidden %": Math.round((100 * hidden) / list.count),
      },
      pass: disagree <= 2 && hidden > 0,
    });

    // The named cases, one list of 4: behind the wall, beside it, in the sky, in front of it.
    const named = new OcclusionQueries(0);
    const cases: Array<[string, number[], boolean]> = [
      ["behind the wall", [0, -0.5, 50, 2, 0, 0, 0, 0.5, 0, 0, 0, 2], true],
      ["beside the wall", [40, -0.5, 50, 2, 0, 0, 0, 0.5, 0, 0, 0, 2], false],
      [
        "above the horizon (sky)",
        [0, 20, 50, 2, 0, 0, 0, 2, 0, 0, 0, 2],
        false,
      ],
      [
        "in front of the wall",
        [0, -0.5, 1.5, 0.2, 0, 0, 0, 0.2, 0, 0, 0, 0.2],
        false,
      ],
      ["on the floor", [30, -2, 100, 4, 0, 0, 0, 0.5, 0, 0, 0, 0.5], false],
      ["behind the floor", [30, -2, 140, 4, 0, 0, 0, 0.5, 0, 0, 0, 0.5], true],
    ];
    cases.forEach(([, data], i) => named.data.set(data, i * QUERY_FLOATS));
    named.count = cases.length;
    const enc2 = device.createCommandEncoder();
    const second = occlusion.encode(enc2, pipelines, named, built);
    device.queue.submit([enc2.finish()]);
    await second.readback.mapAsync(GPUMapMode.READ, 0, 4);
    const named_bits = new Uint32Array(
      second.readback.getMappedRange(0, 4).slice(0),
    )[0]!;
    second.readback.unmap();
    const measured: Record<string, string> = {};
    let ok = true;
    cases.forEach(([name, , want], i) => {
      const got = ((named_bits >>> i) & 1) === 1;
      measured[name] =
        `${got ? "hidden" : "visible"} (want ${want ? "hidden" : "visible"})`;
      ok &&= got === want;
    });
    checks.push({
      name: `named cases, ${width} × ${height}`,
      measured,
      pass: ok,
    });
    occlusion.destroy();
    depth.destroy();
  }

  // 3: cost at 1080p.
  if (timestamps && !lost) {
    const width = 1920;
    const height = 1080;
    const { depth } = await drawScene(device, width, height);
    const occlusion = new FrameOcclusion(
      device,
      pipelines,
      depth.createView(),
      width,
      height,
    );
    const camera: PyramidCamera = {
      frameWidth: width,
      frameHeight: height,
      tanX: (16 / 9) * 0.6,
      tanY: 0.6,
      near: 1,
    };
    const list = boxes(MAX_QUERIES, camera, 99);
    const built = {
      tanX: camera.tanX,
      tanY: camera.tanY,
      near: 1,
      position: new Float64Array(3),
      direction: Float64Array.of(0, 0, 1),
      up: Float64Array.of(0, 1, 0),
      right: Float64Array.of(1, 0, 0),
    };
    const querySet = device.createQuerySet({ type: "timestamp", count: 4 });
    const resolve = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });
    const times: number[][] = [[], []];
    for (let round = 0; round < 40; round++) {
      const enc = device.createCommandEncoder();
      occlusion.encode(enc, pipelines, list, built, {
        hzb: { querySet, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 },
        query: {
          querySet,
          beginningOfPassWriteIndex: 2,
          endOfPassWriteIndex: 3,
        },
      });
      enc.resolveQuerySet(querySet, 0, 4, resolve, 0);
      device.queue.submit([enc.finish()]);
      const ticks = new BigUint64Array(await readBuffer(device, resolve, 32));
      if (round >= 8) {
        times[0]!.push(Number(ticks[1]! - ticks[0]!) / 1e6);
        times[1]!.push(Number(ticks[3]! - ticks[2]!) / 1e6);
      }
    }
    const median = (v: number[]) =>
      v.slice().sort((a, b) => a - b)[v.length >> 1]!;
    const hzbMs = median(times[0]!);
    const queryMs = median(times[1]!);
    checks.push({
      name: "GPU time at 1920 × 1080, 4× multisampled depth, 8,192 boxes (median of 32)",
      measured: {
        "pyramid ms": Number(hzbMs.toFixed(3)),
        "queries ms": Number(queryMs.toFixed(3)),
      },
      // The design's aim is about 0.5 ms for the pyramid; it is reported, and
      // a pyramid over 2 ms fails the check.
      pass: hzbMs < 2,
    });
    occlusion.destroy();
    depth.destroy();
  }
  checks.push({
    name: "no device loss",
    measured: { lost: String(lost) },
    pass: !lost,
  });

  const info = adapter.info;
  const label = `${info.vendor} ${info.architecture} ${info.description}${timestamps ? "" : " (no timestamp-query)"}`;
  status.textContent = checks.every((c) => c.pass) ? "all pass" : "FAIL";
  root.querySelector('[data-id="adapter"]')!.textContent = label;
  return { adapter: label, checks };
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runOcclusion };
  },
};
