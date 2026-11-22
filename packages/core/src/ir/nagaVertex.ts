// CS-777: one emitted WGSL module as a vertex stage naga can write GLSL ES 3.00
// for. naga's GLSL ES back end has no compute stage, so the module's function
// is called from a vertex entry. Its parameters come in as `@location`
// attributes and its outputs leave as `@location` varyings, one per output
// field, so the browser half can read them back through transform feedback
// (`gl_Position` is not capturable in WebGL 2). Every lane is a float32, the
// way the kernels carry them (a bool as 0 or 1, an int as a float).
//
// Not exported from the entry point: it is test support, shared by the Node
// test (`test/irGlsl.test.ts`) and the browser page (`bench/irGlsl.ts`). It
// names no naga package; the caller drives naga.

import type { EmittedWgsl } from "./wgsl.ts";
import { width, type Type } from "./types.ts";

/** The vertex entry's name in the wrapped module. */
export const NAGA_VERTEX_ENTRY = "cir_vs";

/** One attribute or varying of the wrapped entry. */
export interface NagaVertexLane {
  /** The `@location` in the wrapped WGSL, which naga keeps in the GLSL. */
  readonly location: number;
  /** The program parameter or output it carries. */
  readonly name: string;
  readonly type: Type;
  /** Float lanes: 1 to 4. */
  readonly lanes: number;
}

export interface NagaVertex {
  /** The emitted module and a vertex entry over its function. */
  readonly wgsl: string;
  readonly entry: string;
  readonly attributes: readonly NagaVertexLane[];
  readonly varyings: readonly NagaVertexLane[];
}

const FLOAT_TYPE = ["", "f32", "vec2f", "vec3f", "vec4f"] as const;

/** The lanes a value of `type` takes in the kernels' float32 buffers. */
const lanesOf = (type: Type): number =>
  type === "bool" || type === "int" ? 1 : width(type);

/** The emitted module with a vertex entry that calls its function. */
export function nagaVertex(e: EmittedWgsl): NagaVertex {
  const attributes = e.params.map((q, location) => ({
    location,
    name: q.name,
    type: q.type,
    lanes: lanesOf(q.type),
  }));
  const varyings = e.outputs.map((o, location) => ({
    location,
    name: o.name,
    type: o.type,
    lanes: lanesOf(o.type),
  }));
  const parameters = attributes.map(
    (a) => `@location(${a.location}) a${a.location}: ${FLOAT_TYPE[a.lanes]}`,
  );
  const args = attributes.map((a) =>
    a.type === "bool"
      ? `a${a.location} != 0.0`
      : a.type === "int"
        ? `i32(a${a.location})`
        : `a${a.location}`,
  );
  const fields = varyings.map(
    (v) => `  @location(${v.location}) o${v.location}: ${FLOAT_TYPE[v.lanes]},`,
  );
  const writes = varyings.map((v) => {
    const value = `r.${v.name}`;
    return v.type === "bool"
      ? `select(0.0, 1.0, ${value})`
      : v.type === "int"
        ? `f32(${value})`
        : value;
  });
  const wgsl = [
    e.code,
    `struct CirVsOut {`,
    `  @builtin(position) position: vec4f,`,
    ...fields,
    `}`,
    `@vertex fn ${NAGA_VERTEX_ENTRY}(${parameters.join(", ")}) -> CirVsOut {`,
    `  let r = ${e.fn}(${args.join(", ")});`,
    `  return CirVsOut(vec4f(0.0, 0.0, 0.0, 1.0)${writes.map((w) => `, ${w}`).join("")});`,
    `}`,
  ].join("\n");
  return { wgsl, entry: NAGA_VERTEX_ENTRY, attributes, varyings };
}

/** The slice of naga-wasm this file drives, so no package is imported here. */
export interface NagaApi {
  parseWgsl(source: string): unknown;
  validate(module: unknown): unknown;
  writeGlsl(
    module: unknown,
    info: unknown,
    options: {
      version: string;
      stage: "vertex";
      entryPoint: string;
      reflect: true;
    },
  ): {
    code: string;
    reflection: {
      uniforms: Record<string, { group: number; binding: number } | undefined>;
    };
  };
}

/** naga's GLSL ES 3.00 for one emitted module, and the names to bind it by. */
export interface NagaGlsl extends NagaVertex {
  readonly code: string;
  /**
   * The std140 block naga made for the uniform buffer (WGSL `@group(0)
   * @binding(0)`), from its reflection; absent when the program has none.
   */
  readonly uniformBlock: string | undefined;
  /** The transform feedback varyings, in `varyings` order. */
  readonly varyingNames: readonly string[];
}

/**
 * Write the emitted module as a GLSL ES 3.00 vertex shader through naga.
 * Throws naga's error when it refuses the module. naga generates every name:
 * the vertex inputs keep their `@location` (`layout(location = n)`), the
 * uniform block's name comes from `reflect`, and the outputs are
 * `_vs2fs_location<n>`, which `reflect` doesn't list for a vertex stage.
 * The `gl_Position.yz` clip-space fix naga appends is left on: the outputs
 * are read from the varyings, never from `gl_Position`.
 */
export function nagaGlsl(naga: NagaApi, e: EmittedWgsl): NagaGlsl {
  const v = nagaVertex(e);
  const module = naga.parseWgsl(v.wgsl);
  const info = naga.validate(module);
  const { code, reflection } = naga.writeGlsl(module, info, {
    version: "300 es",
    stage: "vertex",
    entryPoint: v.entry,
    reflect: true,
  });
  const blocks = Object.keys(reflection.uniforms);
  if (blocks.length > 1) {
    throw new Error(`naga made ${blocks.length} uniform blocks, expected one`);
  }
  return {
    ...v,
    code,
    uniformBlock: blocks[0],
    varyingNames: v.varyings.map((q) => `_vs2fs_location${q.location}`),
  };
}
