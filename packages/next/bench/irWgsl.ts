// CS-51's browser half: every emitted test module is compiled by Chrome
// (`getCompilationInfo` must report no errors), run on the GPU over its
// edge-case rows and read back, and compared with the float64 evaluator to
// the case's stated tolerance (src/ir/wgslCases.ts).
import { emitWgslKernel, packUniforms } from "../src/ir/index.ts";
import {
  compareReadback,
  newReadbackRow,
  packRows,
  type ReadbackRow,
} from "../src/ir/readback.ts";
import { wgslCases } from "../src/ir/wgslCases.ts";

export type IrWgslRow = ReadbackRow;

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
  if (lost) {
    throw new Error(`The WebGPU device was lost: ${lost}`);
  }
  document.querySelector("#out")!.textContent = JSON.stringify(out, null, 1);
  return out;
}

Object.assign(globalThis, { runIrWgsl });
