// CS-51's browser half: every emitted test module is compiled by Chrome
// (`getCompilationInfo` must report no errors), run on the GPU over its
// edge-case rows and read back, and compared with the float64 evaluator to
// the case's stated tolerance (src/ir/wgslCases.ts).
//
// CS-54 adds the compiled routes: every built-in's `CompiledRoute.wgsl` in a
// compute kernel, read back against the route's float64 map, and two prefixed
// routes in one kernel (src/transform/routeReadback.ts). bench/irGlsl.ts runs
// the same cases on WebGL 2 with the same bounds.
import { emitWgslKernel, packUniforms } from "../packages/core/src/ir/index.ts";
import {
  compareReadback,
  newReadbackRow,
  packRows,
  type ReadbackRow,
} from "../packages/core/src/ir/readback.ts";
import { wgslCases } from "../packages/core/src/ir/wgslCases.ts";
import {
  compareRoute,
  newRouteRow,
  packRouteRows,
  routeKernelWgsl,
  routeOutStride,
  type RouteCase,
  type RouteReadbackRow,
} from "../packages/core/src/transform/routeReadback.ts";
import { routeCases } from "../packages/core/src/transforms/routeCases.ts";

export type IrWgslRow = ReadbackRow | RouteReadbackRow;

/** One route case: compile its kernel, run it over the rows, compare. */
async function runRoute(
  device: GPUDevice,
  c: RouteCase,
): Promise<RouteReadbackRow> {
  const row = newRouteRow(c);
  const k = routeKernelWgsl(c);
  const module = device.createShaderModule({ code: k.code });
  const info = await module.getCompilationInfo();
  row.compileMessages = info.messages
    .filter((m) => m.type === "error")
    .map((m) => `${m.lineNum}:${m.linePos} ${m.message}`);
  if (row.compileMessages.length > 0) {
    return row;
  }
  const input = packRouteRows(c);
  const bytes = Math.max(routeOutStride(c) * c.rows.length, 1) * 4;
  const buffers: GPUBuffer[] = [];
  const mk = (usage: number, size: number) => {
    const b = device.createBuffer({ size, usage });
    buffers.push(b);
    return b;
  };
  const inBuf = mk(
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    input.byteLength,
  );
  const outBuf = mk(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, bytes);
  const readBuf = mk(GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST, bytes);
  device.queue.writeBuffer(inBuf, 0, input);
  const entries: GPUBindGroupEntry[] = [
    { binding: 0, resource: { buffer: inBuf } },
    { binding: 1, resource: { buffer: outBuf } },
  ];
  c.routes.forEach((u, i) => {
    for (const [j, data] of [u.record, u.uniforms].entries()) {
      const b = mk(
        GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        data.byteLength,
      );
      device.queue.writeBuffer(b, 0, data);
      entries.push({ binding: 2 + 2 * i + j, resource: { buffer: b } });
    }
  });
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
  for (const b of buffers) {
    b.destroy();
  }
  compareRoute(row, c, gpu);
  return row;
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
    const row: IrWgslRow = newReadbackRow(c);
    row.compileMessages = compileMessages;
    out.push(row);
    if (compileMessages.length > 0) {
      continue;
    }
    // Inputs, row by row, in parameter order.
    const input = packRows(c, k.params, k.inStride);
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

    compareReadback(row, c, k.outputs, k.outStride, gpu);
  }
  for (const c of routeCases()) {
    if (lost) {
      throw new Error(`The WebGPU device was lost: ${lost}`);
    }
    out.push(await runRoute(device, c));
  }
  if (lost) {
    throw new Error(`The WebGPU device was lost: ${lost}`);
  }
  document.querySelector("#out")!.textContent = JSON.stringify(out, null, 1);
  return out;
}

Object.assign(globalThis, { runIrWgsl });
