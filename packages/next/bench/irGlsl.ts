// CS-52's browser half, WebGL 2: every emitted test program is compiled and
// linked in a WebGL 2 context, run on the GPU over its edge-case rows and read
// back through transform feedback, and compared with the float64 evaluator to
// the case's stated tolerance (src/ir/wgslCases.ts), the same numbers as
// CS-51's WebGPU suite (bench/irWgsl.ts).
import {
  GLSL_KERNEL_FRAGMENT,
  emitGlslKernel,
  packUniforms,
  width,
} from "../src/ir/index.ts";
import {
  compareReadback,
  newReadbackRow,
  packRows,
  type ReadbackRow,
} from "../src/ir/readback.ts";
import { wgslCases } from "../src/ir/wgslCases.ts";

export type IrGlslRow = ReadbackRow;

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

async function runIrGlsl(): Promise<IrGlslRow[]> {
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
    const row = newReadbackRow(c);
    out.push(row);
    const vs = compile(
      gl,
      gl.VERTEX_SHADER,
      k.code,
      row.compileMessages,
      "vertex",
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
    k.attributes.forEach((name, i) => gl.bindAttribLocation(program, i, name));
    gl.transformFeedbackVaryings(
      program,
      [...k.varyings],
      gl.INTERLEAVED_ATTRIBS,
    );
    if (row.compileMessages.length === 0) {
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        row.compileMessages.push(
          `link: ${gl.getProgramInfoLog(program) ?? "(no log)"}`,
        );
      }
    }
    if (row.compileMessages.length > 0) {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      continue;
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
        width(q.type),
        gl.FLOAT,
        false,
        k.inStride * 4,
        off * 4,
      );
      off += width(q.type);
    });

    // The uniform block, std140, bound at index 0.
    let uniBuf: WebGLBuffer | undefined;
    if (k.uniforms.length > 0) {
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
        row.compileMessages.push(`GL error 0x${error.toString(16)}`);
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
  checkLost();
  document.querySelector("#out")!.textContent = JSON.stringify(out, null, 1);
  return out;
}

Object.assign(globalThis, { runIrGlsl });
