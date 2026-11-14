// The browser half of the core IR spike (spikes/coreIr.html): a live
// MaterialX preview, per-edit timings, and WebGPU / WebGL 2 checks of what
// the emitters write. Results land in `window.coreIrResults`.
// Plain JS so the package's type check never needs this folder's
// node_modules (naga-wasm is a spike-only dependency).

import { materialXProgram, mtlxEdit } from "./fromMaterialX.ts";
import { styleProgram } from "./fromStyle.ts";
import { transformProgram } from "./fromTransform.ts";
import { jacobianProgram } from "./ad.ts";
import { emit } from "./emit.ts";
import { hoistLiterals } from "./passes.ts";
import { encodeOnnx, toOnnx } from "./onnx.ts";
import { fromSpirv } from "./fromSpirv.ts";
import { alignmentProgram } from "./fromAlignment.ts";
import { MTLX, STYLE, TWIST_SOURCE, WGSL_FN } from "./samples.ts";

const results = {};
window.coreIrResults = results;
const tbody = document.querySelector("#results tbody");

function row(what, value, notes = "", cls = "") {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td></td><td class="num ${cls}"></td><td></td>`;
  tr.children[0].textContent = what;
  tr.children[1].textContent = value;
  tr.children[2].textContent = notes;
  tbody.append(tr);
}

// Browsers coarsen performance.now() (100 µs here, without cross-origin
// isolation), so each sample times a batch long enough to resolve.
function median(f) {
  for (let i = 0; i < 20; i++) {
    f();
  }
  let k = 1;
  for (;;) {
    const s = performance.now();
    for (let i = 0; i < k; i++) {
      f();
    }
    if (performance.now() - s >= 8 || k >= 4096) {
      break;
    }
    k *= 2;
  }
  const t = [];
  for (let j = 0; j < 15; j++) {
    const s = performance.now();
    for (let i = 0; i < k; i++) {
      f();
    }
    t.push((performance.now() - s) / k);
  }
  t.sort((a, b) => a - b);
  return t[t.length >> 1];
}
const us = (ms) => `${(ms * 1000).toFixed(1)} µs`;
const msf = (ms) => `${ms.toFixed(2)} ms`;

// ------------------------------------------------ CPU stages, in the browser
const styleUs = median(() =>
  emit(hoistLiterals(styleProgram(STYLE)).program, "wgsl"),
);
const mxEdit = mtlxEdit.category(MTLX, "stripes_in", "add");
const mxUs = median(() =>
  emit(hoistLiterals(materialXProgram(mxEdit)).program, "wgsl"),
);
const mxGlslUs = median(() =>
  emit(hoistLiterals(materialXProgram(mxEdit)).program, "glsl"),
);
const twistUs = median(() =>
  emit(jacobianProgram(transformProgram(TWIST_SOURCE), "q", "p"), "wgsl"),
);
const onnxUs = median(() =>
  encodeOnnx(toOnnx(hoistLiterals(materialXProgram(mxEdit)).program)),
);
Object.assign(results, {
  styleUs: styleUs * 1000,
  mxUs: mxUs * 1000,
  mxGlslUs: mxGlslUs * 1000,
  twistJacobianUs: twistUs * 1000,
  onnxEncodeUs: onnxUs * 1000,
});
row(
  "(a) style: parse, lower, hoist, WGSL",
  us(styleUs),
  "1.x expression, show and color",
);
row(
  "(a) MaterialX edit: parse, lower, hoist, WGSL",
  us(mxUs),
  "11 literals become uniforms",
);
row("(a) MaterialX edit to GLSL ES 3.00", us(mxGlslUs));
row(
  "(a) twist: parse, lower, Jacobian, WGSL",
  us(twistUs),
  "J as 3 jvp passes",
);
row(
  "(b) MaterialX to an ONNX model (protobuf)",
  us(onnxUs),
  "encode only; a runtime is extra",
);

// ------------------------------------------------ naga in the browser
let naga;
try {
  const t0 = performance.now();
  const mod = await import("naga-wasm");
  const wasmUrl = (await import("naga-wasm/naga_bg.wasm?url")).default;
  await mod.init({ module_or_path: wasmUrl });
  naga = mod;
  const initMs = performance.now() - t0;
  const parseToIr = median(() => {
    const m = naga.parseWgsl(WGSL_FN);
    return fromSpirv(
      naga.writeSpirv(m, naga.validate(m), { flags: { debug: true } }),
      "falloff",
    );
  });
  Object.assign(results, { nagaInitMs: initMs, nagaWgslToIrMs: parseToIr });
  row(
    "naga-wasm load and instantiate",
    msf(initMs),
    "2.05 MB wasm (592 KB brotli)",
  );
  row(
    "WGSL fn via naga to SPIR-V to CesiumIR",
    msf(parseToIr),
    "parse, validate, write SPIR-V, read",
  );
} catch (e) {
  row("naga-wasm", "failed", String(e), "no");
}

// ------------------------------------------------ WebGPU: shader modules and pipelines
const canvas = document.getElementById("view");
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
const editLog = document.getElementById("editLog");
const wgslOut = document.getElementById("wgsl");

const format = navigator.gpu?.getPreferredCanvasFormat();
const ctx = device ? canvas.getContext("webgpu") : null;
ctx?.configure({ device, format, alphaMode: "opaque" });

const layout = device?.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: "uniform" },
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: "uniform" },
    },
  ],
});
const featureBuf = device?.createBuffer({
  size: 16,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const pipelines = new Map(); // shape key -> { pipeline, uniformBuf, slots }

// Chrome caches compiled pipelines across loads; a per-load constant the
// shader uses keeps every load's compiles cold.
const NONCE = Math.random().toFixed(6);
function previewWgsl(emitted) {
  const args = emitted.params.map((p) =>
    p.name === "texcoord" ? "v.uv" : p.name === "Height" ? "feat.x" : "0.0",
  );
  return `${emitted.code.replace("CIR_GROUP", "0").replace("CIR_BINDING", "0")}
@group(0) @binding(1) var<uniform> feat: vec4f;
struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> V {
  let xy = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return V(vec4f(xy * 2.0 - 1.0, 0.0, 1.0), vec2f(xy.x, 1.0 - xy.y));
}
@fragment fn fs(v: V) -> @location(0) vec4f {
  let r = cir_main(${args.join(", ")});
  return vec4f(r.base_color, 1.0) + vec4f(0.0, 0.0, 0.0, feat.w * ${NONCE});
}`;
}

function packValues(hoisted, slots) {
  const data = new Float32Array(Math.max(4, Object.keys(slots).length * 4));
  for (const [name, slot] of Object.entries(slots)) {
    const v = hoisted.values[name] ?? 0;
    const lanes =
      typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : v;
    data.set(lanes, slot * 4);
  }
  return data;
}

let mtlx = MTLX;
const editTimes = { value: [], shape: [] };

async function applyGraph(kind) {
  const t0 = performance.now();
  const hoisted = hoistLiterals(materialXProgram(mtlx));
  let entry = pipelines.get(hoisted.key);
  const tIr = performance.now();
  let tModule = tIr;
  let tPipe = tIr;
  if (!entry) {
    const emitted = emit(hoisted.program, "wgsl");
    const code = previewWgsl(emitted);
    const module = device.createShaderModule({ code });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === "error");
    if (errors.length) {
      throw new Error(errors.map((m) => m.message).join("\n"));
    }
    tModule = performance.now();
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format }] },
    });
    tPipe = performance.now();
    const uniformBuf = device.createBuffer({
      size: Math.max(16, Object.keys(emitted.slots).length * 16),
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    entry = {
      pipeline,
      uniformBuf,
      slots: emitted.slots,
      code: emitted.code,
      bind: device.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: uniformBuf } },
          { binding: 1, resource: { buffer: featureBuf } },
        ],
      }),
    };
    pipelines.set(hoisted.key, entry);
  }
  wgslOut.textContent = entry.code;
  device.queue.writeBuffer(
    entry.uniformBuf,
    0,
    packValues(hoisted, entry.slots),
  );
  device.queue.writeBuffer(
    featureBuf,
    0,
    new Float32Array([
      Number(document.getElementById("height").value),
      0,
      0,
      0,
    ]),
  );
  const enc = device.createCommandEncoder();
  const pass = enc.beginRenderPass({
    colorAttachments: [
      {
        view: ctx.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: [0, 0, 0, 1],
      },
    ],
  });
  pass.setPipeline(entry.pipeline);
  pass.setBindGroup(0, entry.bind);
  pass.draw(3);
  pass.end();
  device.queue.submit([enc.finish()]);
  const tEnd = performance.now();
  const shape = tModule !== tIr;
  const record = {
    kind,
    ir: tIr - t0,
    module: tModule - tIr,
    pipeline: tPipe - tModule,
    total: tEnd - t0,
    newPipeline: shape,
  };
  if (kind !== "init" && kind !== "feature") {
    editTimes[shape ? "shape" : "value"].push(record);
  }
  editLog.textContent = shape
    ? `${kind}: new shape. IR + WGSL ${us(record.ir)}, module ${msf(record.module)}, pipeline ${msf(record.pipeline)}`
    : `${kind}: same shape, uniform write. IR ${us(record.ir)}, total ${msf(record.total)}`;
  return record;
}

if (device) {
  await applyGraph("init");
  document
    .getElementById("height")
    .addEventListener("input", () => applyGraph("feature"));
  document.getElementById("stripes").addEventListener("input", (e) => {
    mtlx = mtlxEdit.value(mtlx, "stripes_in", "in2", `${e.target.value}.0`);
    applyGraph("value edit");
  });
  document.getElementById("category").addEventListener("change", (e) => {
    mtlx = mtlxEdit.category(mtlx, "stripes_in", e.target.value);
    applyGraph("category edit");
  });
  document.getElementById("wire").addEventListener("change", (e) => {
    mtlx = mtlxEdit.wire(mtlx, "base", "mix", e.target.value);
    applyGraph("wiring edit");
  });

  // Scripted edits for the record: values (uniform writes) and shapes (new pipelines).
  const values = [];
  for (const v of [9, 10, 11, 12, 13, 14, 15, 16]) {
    mtlx = mtlxEdit.value(mtlx, "stripes_in", "in2", `${v}.0`);
    values.push(await applyGraph("scripted value"));
  }
  const shapes = [];
  for (const [cat, wire] of [
    ["add", "hclamp"],
    ["subtract", "hclamp"],
    ["power", "edge"],
    ["multiply", "edge"],
    ["add", "edge"],
    ["subtract", "edge"],
  ]) {
    mtlx = mtlxEdit.wire(
      mtlxEdit.category(mtlx, "stripes_in", cat),
      "base",
      "mix",
      wire,
    );
    shapes.push(await applyGraph("scripted shape"));
  }
  mtlx = MTLX;
  await applyGraph("init");
  const med = (xs, k) =>
    xs.map((x) => x[k]).sort((a, b) => a - b)[xs.length >> 1];
  Object.assign(results, {
    valueEditTotalMs: med(values, "total"),
    shapeEditIrMs: med(shapes, "ir"),
    shapeEditModuleMs: med(shapes, "module"),
    shapeEditPipelineMs: med(shapes, "pipeline"),
    shapeEditTotalMs: med(shapes, "total"),
  });
  row(
    "Value edit, end to end (uniform write)",
    msf(results.valueEditTotalMs),
    "no module, no pipeline",
  );
  row("Shape edit: IR and WGSL", us(results.shapeEditIrMs), "");
  row(
    "Shape edit: shader module (compile info)",
    msf(results.shapeEditModuleMs),
    "Tint's front end",
  );
  row(
    "Shape edit: render pipeline (async)",
    msf(results.shapeEditPipelineMs),
    "the driver's compile",
  );

  // Every emitted WGSL module is accepted by this browser?
  const check = async (name, code) => {
    const info = await device.createShaderModule({ code }).getCompilationInfo();
    const errs = info.messages.filter((m) => m.type === "error");
    results[`webgpu_${name}`] = errs.length
      ? errs.map((m) => m.message).join("; ")
      : "ok";
    row(
      `WebGPU accepts the ${name} WGSL`,
      errs.length ? "no" : "yes",
      errs.map((m) => m.message).join("; "),
      errs.length ? "no" : "ok",
    );
  };
  const fix = (c) => c.replace("CIR_GROUP", "0").replace("CIR_BINDING", "0");
  await check(
    "style",
    fix(emit(hoistLiterals(styleProgram(STYLE)).program, "wgsl").code),
  );
  await check(
    "twist Jacobian",
    fix(
      emit(jacobianProgram(transformProgram(TWIST_SOURCE), "q", "p"), "wgsl")
        .code,
    ),
  );
  await check(
    "alignment (tables, bounded search)",
    emit(alignmentProgram(5, 3), "wgsl")
      .code.replaceAll("CIR_GROUP", "0")
      .replace("CIR_TABLE_plan", "1")
      .replace("CIR_TABLE_profile", "2"),
  );
  if (naga) {
    const m = naga.parseWgsl(WGSL_FN);
    const p = fromSpirv(
      naga.writeSpirv(m, naga.validate(m), { flags: { debug: true } }),
      "falloff",
      { p: "vertex", r: "uniform", k: "uniform" },
    );
    await check(
      "falloff (via naga)",
      fix(emit(hoistLiterals(p).program, "wgsl").code),
    );
  }
} else {
  row("WebGPU", "unavailable", "", "no");
}

// ------------------------------------------------ WebGL 2: our GLSL ES 3.00, and naga's
const gl = document.createElement("canvas").getContext("webgl2");
function compileGlsl(fragment, varying = "v") {
  const t0 = performance.now();
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(
    vs,
    `#version 300 es\nin vec2 a; smooth out vec4 ${varying}; void main(){ ${varying} = vec4(a, 0.0, 1.0); gl_Position = vec4(a, 0.0, 1.0); }`,
  );
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fragment);
  gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  const ok = gl.getProgramParameter(prog, gl.LINK_STATUS);
  const log = ok
    ? ""
    : `${gl.getShaderInfoLog(fs)} ${gl.getProgramInfoLog(prog)}`;
  return { ok, log, ms: performance.now() - t0 };
}
const GLSL_TYPES = {
  float: "float",
  float2: "vec2",
  float3: "vec3",
  float4: "vec4",
  bool: "bool",
};
function glslWrapper(emitted, outExpr) {
  const decls = emitted.params
    .map((p) => `uniform ${GLSL_TYPES[p.type]} u_${p.name};`)
    .join("\n");
  const call = `cir_main(${emitted.params.map((p) => `u_${p.name}`).join(", ")})`;
  return `#version 300 es\nprecision highp float;\n${emitted.code}\n${decls}\nin vec4 v; out vec4 o;\nvoid main() { CirOut r = ${call}; o = ${outExpr}; }\n`;
}
if (gl) {
  const styleGlsl = emit(hoistLiterals(styleProgram(STYLE)).program, "glsl");
  document.getElementById("glsl").textContent = styleGlsl.code;
  const a = compileGlsl(glslWrapper(styleGlsl, "r.show ? r.color : vec4(0.0)"));
  results.webgl2Style = a;
  row(
    "WebGL 2 compiles our style GLSL ES 3.00",
    a.ok ? "yes" : "no",
    a.ok ? `${msf(a.ms)} compile and link` : a.log,
    a.ok ? "ok" : "no",
  );
  const mxGlsl = emit(hoistLiterals(materialXProgram(MTLX)).program, "glsl");
  const al = emit(alignmentProgram(5, 3), "glsl");
  const alc = compileGlsl(glslWrapper(al, "vec4(r.q, 1.0)"));
  results.webgl2Alignment = alc;
  row(
    "WebGL 2 compiles the alignment's GLSL (tables as uniform blocks, bounded search)",
    alc.ok ? "yes" : "no",
    alc.ok ? `${msf(alc.ms)} compile and link` : alc.log,
    alc.ok ? "ok" : "no",
  );
  const b = compileGlsl(glslWrapper(mxGlsl, "vec4(r.base_color, 1.0)"));
  results.webgl2MaterialX = b;
  row(
    "WebGL 2 compiles our MaterialX GLSL",
    b.ok ? "yes" : "no",
    b.ok ? `${msf(b.ms)} compile and link` : b.log,
    b.ok ? "ok" : "no",
  );
  if (naga) {
    const wg = emit(hoistLiterals(styleProgram(STYLE)).program, "wgsl")
      .code.replace("CIR_GROUP", "0")
      .replace("CIR_BINDING", "0");
    const wrapped = `${wg}\n@fragment fn cir_entry(@location(0) a: vec4f) -> @location(0) vec4f {\n  let r = cir_main(a.x, a.y);\n  return select(vec4f(0.0), r.color, r.show);\n}\n`;
    const t0 = performance.now();
    const m = naga.parseWgsl(wrapped);
    const text = naga.writeGlsl(m, naga.validate(m), {
      version: "300 es",
      stage: "fragment",
      entryPoint: "cir_entry",
    });
    const nagaMs = performance.now() - t0;
    const c = compileGlsl(text, "_vs2fs_location0");
    results.webgl2NagaStyle = { ...c, nagaMs };
    row(
      "naga: style WGSL to GLSL ES 3.00",
      msf(nagaMs),
      "parse, validate, write",
    );
    row(
      "WebGL 2 compiles naga's GLSL",
      c.ok ? "yes" : "no",
      c.ok ? `${msf(c.ms)} compile and link` : c.log,
      c.ok ? "ok" : "no",
    );
  }
} else {
  row("WebGL 2", "unavailable", "", "no");
}
results.done = true;
