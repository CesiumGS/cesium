// CS-51's browser half: every emitted test module is compiled by Chrome
// (`getCompilationInfo` must report no errors), run on the GPU over its
// edge-case rows and read back, and compared with the float64 evaluator to
// the case's stated tolerance (src/ir/wgslCases.ts).
import {
  evaluate,
  emitWgslKernel,
  packUniforms,
  width,
  type Value,
} from "../src/ir/index.ts";
import { wgslCases } from "../src/ir/wgslCases.ts";

const lanesOf = (v: Value): number[] =>
  typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : [...v];

export interface IrWgslRow {
  name: string;
  rows: number;
  compared: number;
  skipped: number;
  tolerance: { abs: number; rel: number };
  /** Largest |gpu - float64| and the largest |gpu - float64| / |float64|. */
  maxAbs: number;
  maxRel: number;
  /** Largest error as a fraction of what the tolerance allows (pass when <= 1). */
  worstRatio: number;
  worst: { row: number; lane: number; gpu: number; cpu: number } | null;
  compileMessages: string[];
  pass: boolean;
}

async function runIrWgsl(): Promise<IrWgslRow[]> {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    throw new Error("No WebGPU adapter in this browser.");
  }
  const device = await adapter.requestDevice();
  let lost: string | undefined;
  void device.lost.then((info) => {
    lost = `${info.reason}: ${info.message}`;
  });
  const out: IrWgslRow[] = [];
  for (const c of wgslCases()) {
    if (lost) {
      throw new Error(`The WebGPU device was lost: ${lost}`);
    }
    const k = emitWgslKernel(c.program);
    const module = device.createShaderModule({ code: k.code });
    const info = await module.getCompilationInfo();
    const compileMessages = info.messages
      .filter((m) => m.type === "error")
      .map((m) => `${m.lineNum}:${m.linePos} ${m.message}`);
    const row: IrWgslRow = {
      name: c.name,
      rows: c.rows.length,
      compared: 0,
      skipped: 0,
      tolerance: c.tolerance,
      maxAbs: 0,
      maxRel: 0,
      worstRatio: 0,
      worst: null,
      compileMessages,
      pass: false,
    };
    out.push(row);
    if (compileMessages.length > 0) {
      continue;
    }
    // Inputs, row by row, in parameter order.
    const input = new Float32Array(Math.max(k.inStride * c.rows.length, 1));
    c.rows.forEach((r, i) => {
      let off = i * k.inStride;
      for (const q of k.params) {
        const lanes = lanesOf(r[q.name]!);
        input.set(lanes, off);
        off += width(q.type);
      }
    });
    const bytes = Math.max(k.outStride * c.rows.length, 1) * 4;
    const mk = (usage: number, size: number) =>
      device.createBuffer({ size, usage });
    const inBuf = mk(
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      input.byteLength,
    );
    const outBuf = mk(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, bytes);
    const readBuf = mk(
      GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      bytes,
    );
    device.queue.writeBuffer(inBuf, 0, input);
    const entries: GPUBindGroupEntry[] = [
      { binding: 1, resource: { buffer: inBuf } },
      { binding: 2, resource: { buffer: outBuf } },
    ];
    let uniBuf: GPUBuffer | undefined;
    if (k.uniforms.length > 0) {
      const data = packUniforms(c.program, c.uniforms);
      uniBuf = mk(
        GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        data.byteLength,
      );
      device.queue.writeBuffer(uniBuf, 0, data);
      entries.push({ binding: 0, resource: { buffer: uniBuf } });
    }
    const pipeline = device.createComputePipeline({
      layout: "auto",
      compute: { module, entryPoint: k.entry },
    });
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries,
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(c.rows.length / 64));
    pass.end();
    encoder.copyBufferToBuffer(outBuf, 0, readBuf, 0, bytes);
    device.queue.submit([encoder.finish()]);
    await readBuf.mapAsync(GPUMapMode.READ);
    const gpu = new Float32Array(readBuf.getMappedRange().slice(0));
    readBuf.unmap();
    for (const b of [inBuf, outBuf, readBuf, uniBuf]) {
      b?.destroy();
    }

    c.rows.forEach((r, i) => {
      const expected = evaluate(c.program, { ...r, ...c.uniforms });
      let off = i * k.outStride;
      for (const o of k.outputs) {
        const base = off;
        lanesOf(expected[o.name]!).forEach((cpu, lane) => {
          const g = gpu[base + lane]!;
          if (!Number.isFinite(cpu) || Math.abs(cpu) > 3e38) {
            row.skipped++;
            return;
          }
          row.compared++;
          const err = Math.abs(g - cpu);
          const allowed = c.tolerance.abs + c.tolerance.rel * Math.abs(cpu);
          // NaN on the GPU against a finite answer is an error.
          const ratio = Number.isNaN(err)
            ? Infinity
            : allowed === 0
              ? err === 0
                ? 0
                : Infinity
              : err / allowed;
          row.maxAbs = Math.max(row.maxAbs, err);
          if (cpu !== 0) {
            row.maxRel = Math.max(row.maxRel, err / Math.abs(cpu));
          }
          if (ratio > row.worstRatio || row.worst === null) {
            row.worstRatio = Math.max(ratio, row.worstRatio);
            row.worst = { row: i, lane, gpu: g, cpu };
          }
        });
        off += width(o.type);
      }
    });
    row.pass = row.worstRatio <= 1;
  }
  if (lost) {
    throw new Error(`The WebGPU device was lost: ${lost}`);
  }
  document.querySelector("#out")!.textContent = JSON.stringify(out, null, 1);
  return out;
}

Object.assign(globalThis, { runIrWgsl });
