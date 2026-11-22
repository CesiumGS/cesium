// CS-52's browser half, WebGL 2: every emitted test program is compiled and
// linked in a WebGL 2 context, run on the GPU over its edge-case rows and read
// back through transform feedback, and compared with the float64 evaluator to
// the case's stated tolerance (src/ir/wgslCases.ts), the same numbers as
// CS-51's WebGPU suite (bench/irWgsl.ts).
//
// CS-777 runs a second kernel beside each one: naga's GLSL ES 3.00 for the
// same emitted WGSL module (naga-wasm, through src/ir/nagaVertex.ts), compiled,
// linked and read back the same way and held to the same tolerance. naga's
// names are generated, so they are bound from the entry's own `@location`s
// (the vertex inputs), naga's reflection (the uniform block) and the
// `_vs2fs_location<n>` outputs (see nagaGlsl).
import * as naga from "naga-wasm";
import wasmUrl from "naga-wasm/naga_bg.wasm?url";
import {
  GLSL_KERNEL_FRAGMENT,
  emitGlslKernel,
  emitWgsl,
  packUniforms,
  width,
  type Type,
} from "../packages/next/src/ir/index.ts";
import { nagaGlsl, type NagaApi } from "../packages/next/src/ir/nagaVertex.ts";
import {
  compareReadback,
  newReadbackRow,
  packRows,
  type ReadbackRow,
} from "../packages/next/src/ir/readback.ts";
import { wgslCases, type WgslCase } from "../packages/next/src/ir/wgslCases.ts";

/** One case: our kernel's result, and naga's beside it. */
export interface IrGlslRow extends ReadbackRow {
  naga: ReadbackRow & {
    /** naga's message when it refused the module (the case isn't run then). */
    refused: string | null;
    /** The std140 block's name and the varyings it was bound by. */
    uniformBlock: string | null;
    varyings: string[];
  };
}

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  messages: string[],
  label: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    messages.push(`${label}: ${gl.getShaderInfoLog(shader) ?? "(no log)"}`);
  }
  return shader;
}

/** What to run: one vertex shader and how its names are bound. */
interface Kernel {
  label: string;
  /** The vertex shader (the fragment shader is GLSL_KERNEL_FRAGMENT). */
  vertex: string;
  /** Attribute names bound to locations 0..n; none when the source sets them. */
  attributeNames?: readonly string[];
  /** The transform feedback varyings, in output order. */
  varyings: readonly string[];
  uniformBlock: string | undefined;
  params: readonly { readonly name: string; readonly type: Type }[];
  outputs: readonly { readonly name: string; readonly type: Type }[];
  /** Float32 lanes per row in the input and output buffers. */
  inStride: number;
  outStride: number;
}

/** The lanes a parameter or output takes: bools and ints are one float32. */
const lanes = (type: Type): number =>
  type === "bool" || type === "int" ? 1 : width(type);

/**
 * Compile, link and run `k` over the case's rows, and compare the answers with
 * the float64 evaluator into `row`. Failures are messages in the row.
 */
function runKernel(
  gl: WebGL2RenderingContext,
  c: WgslCase,
  k: Kernel,
  row: ReadbackRow,
): void {
  const vs = compile(
    gl,
    gl.VERTEX_SHADER,
    k.vertex,
    row.compileMessages,
    k.label,
  );
  const fs = compile(
    gl,
    gl.FRAGMENT_SHADER,
    GLSL_KERNEL_FRAGMENT,
    row.compileMessages,
    "fragment",
  );
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  k.attributeNames?.forEach((name, i) =>
    gl.bindAttribLocation(program, i, name),
  );
  gl.transformFeedbackVaryings(
    program,
    [...k.varyings],
    gl.INTERLEAVED_ATTRIBS,
  );
  if (row.compileMessages.length === 0) {
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      row.compileMessages.push(
        `${k.label} link: ${gl.getProgramInfoLog(program) ?? "(no log)"}`,
      );
    }
  }
  if (row.compileMessages.length > 0) {
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return;
  }
  gl.useProgram(program);

  // Inputs: one interleaved buffer, a vertex attribute per parameter.
  const input = packRows(c, k.params, k.inStride);
  const inBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, inBuf);
  gl.bufferData(gl.ARRAY_BUFFER, input, gl.STATIC_DRAW);
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  let off = 0;
  k.params.forEach((q, i) => {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(
      i,
      lanes(q.type),
      gl.FLOAT,
      false,
      k.inStride * 4,
      off * 4,
    );
    off += lanes(q.type);
  });

  // The uniform block, std140, bound at index 0.
  let uniBuf: WebGLBuffer | undefined;
  if (k.uniformBlock !== undefined) {
    const index = gl.getUniformBlockIndex(program, k.uniformBlock);
    if (index === gl.INVALID_INDEX) {
      row.compileMessages.push(`no uniform block '${k.uniformBlock}'`);
    } else {
      const need = gl.getActiveUniformBlockParameter(
        program,
        index,
        gl.UNIFORM_BLOCK_DATA_SIZE,
      ) as number;
      const data = packUniforms(c.program, c.uniforms);
      if (need !== data.byteLength) {
        row.compileMessages.push(
          `block is ${need} bytes, packUniforms gives ${data.byteLength}`,
        );
      }
      uniBuf = gl.createBuffer()!;
      gl.bindBuffer(gl.UNIFORM_BUFFER, uniBuf);
      gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_DRAW);
      gl.uniformBlockBinding(program, index, 0);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uniBuf);
    }
  }
  if (row.compileMessages.length === 0) {
    // Outputs: interleaved transform feedback, one point per row.
    const bytes = Math.max(k.outStride * c.rows.length, 1) * 4;
    const outBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, outBuf);
    gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, bytes, gl.STREAM_READ);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outBuf);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, c.rows.length);
    gl.endTransformFeedback();
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      row.compileMessages.push(`${k.label} GL error 0x${error.toString(16)}`);
    } else {
      const gpu = new Float32Array(bytes / 4);
      gl.bindBuffer(gl.ARRAY_BUFFER, outBuf);
      gl.getBufferSubData(gl.ARRAY_BUFFER, 0, gpu);
      compareReadback(row, c, k.outputs, k.outStride, gpu);
    }
    gl.deleteBuffer(outBuf);
  }
  gl.bindVertexArray(null);
  gl.deleteVertexArray(vao);
  gl.deleteBuffer(inBuf);
  if (uniBuf) {
    gl.deleteBuffer(uniBuf);
  }
  gl.deleteProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
}

async function runIrGlsl(): Promise<IrGlslRow[]> {
  await naga.init({ module_or_path: wasmUrl });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const gl = canvas.getContext("webgl2", { antialias: false });
  if (!gl) {
    throw new Error("No WebGL 2 context in this browser.");
  }
  let lost = false;
  canvas.addEventListener("webglcontextlost", () => {
    lost = true;
  });
  const checkLost = () => {
    if (lost || gl.isContextLost()) {
      throw new Error("The WebGL context was lost.");
    }
  };
  const out: IrGlslRow[] = [];
  gl.enable(gl.RASTERIZER_DISCARD);
  for (const c of wgslCases()) {
    checkLost();
    const k = emitGlslKernel(c.program);
    const ours = newReadbackRow(c);
    const row: IrGlslRow = {
      ...ours,
      naga: {
        ...newReadbackRow(c),
        refused: null,
        uniformBlock: null,
        varyings: [],
      },
    };
    out.push(row);
    runKernel(
      gl,
      c,
      {
        label: "vertex",
        vertex: k.code,
        attributeNames: k.attributes,
        varyings: k.varyings,
        uniformBlock: k.uniforms.length > 0 ? k.uniformBlock : undefined,
        params: k.params,
        outputs: k.outputs,
        inStride: k.inStride,
        outStride: k.outStride,
      },
      row,
    );
    checkLost();
    // naga's GLSL ES 3.00 for the same emitted module, beside ours.
    let g;
    try {
      g = nagaGlsl(naga as unknown as NagaApi, emitWgsl(c.program));
    } catch (error) {
      row.naga.refused = error instanceof Error ? error.message : String(error);
      row.naga.compileMessages.push(`naga refused: ${row.naga.refused}`);
      continue;
    }
    row.naga.uniformBlock = g.uniformBlock ?? null;
    row.naga.varyings = [...g.varyingNames];
    runKernel(
      gl,
      c,
      {
        label: "naga vertex",
        vertex: g.code,
        varyings: g.varyingNames,
        uniformBlock: g.uniformBlock,
        params: g.attributes,
        outputs: g.varyings,
        inStride: k.inStride,
        outStride: k.outStride,
      },
      row.naga,
    );
  }
  checkLost();
  document.querySelector("#out")!.textContent = JSON.stringify(out, null, 1);
  return out;
}

Object.assign(globalThis, { runIrGlsl });
