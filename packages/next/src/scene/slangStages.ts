/**
 * Slang custom shader stages' sources (plan §3.4): the `cesium` module
 * for a shader's declarations, and which stages a source defines. Shared
 * by runtime compilation (`CustomShader.fromSlang`) and the build-time CLI
 * (scripts/slangShader.mjs). No browser or bundler APIs here.
 *
 * A user module imports `cesium` (shaders/cesium.slang) and defines
 * `vertexMain`, `fragmentMain` or both; it is compiled with the bridge
 * (contract.ts `slangBridge`), which is how its stages are called.
 */

import { uniformsSlang, type UniformDeclaration } from "./uniforms.ts";

import type { InstanceType, NamedType, SlangStages } from "./contract.ts";

export type { InstanceType, NamedType } from "./contract.ts";

/** A shader's named attributes and metadata: types by field name. */
export interface NamedDeclarations {
  attributes: Record<string, NamedType>;
  metadata: Record<string, NamedType>;
  /** Each attribute's glTF semantic. */
  semantics: Record<string, string>;
  /** Each metadata field's property ID (its name where absent). */
  properties: Record<string, string>;
  /** Metadata fields only the vertex stage reads (no varying of their own). */
  vertexOnly?: readonly string[];
  /** Per-instance values (`CustomShaderOptions.instance`). */
  instance: Record<string, InstanceType>;
}

const SLANG_TYPES: Record<InstanceType, string> = {
  u32: "uint",
  i32: "int",
  f32: "float",
  vec2f: "float2",
  vec3f: "float3",
  vec4f: "float4",
  mat2x2f: "float2x2",
};

/** Where cesium.slang takes the generated `Attributes` and `Metadata`. */
const SLANG_NAMED = "// @named";

/**
 * The `cesium` module's source with a shader's `Attributes` and
 * `Metadata` structs (`none` alone without any, as in WGSL).
 */
export function cesiumModule(
  source: string,
  named: Pick<NamedDeclarations, "attributes" | "metadata"> & {
    /** Its per-instance values' types (`CustomShaderOptions.instance`). */
    instance?: Record<string, InstanceType>;
    /** Its uniforms' types (`CustomShaderOptions.uniforms`). */
    uniforms?: Record<string, { type: UniformDeclaration["type"] }>;
  },
): string {
  if (!source.includes(SLANG_NAMED)) {
    throw new Error("cesium.slang has no named structs marker.");
  }
  const struct = (name: string, fields: Record<string, InstanceType>) => {
    const entries = Object.entries(fields);
    const body =
      entries.length === 0
        ? "  public uint none;"
        : entries
            .map(([field, type]) => `  public ${SLANG_TYPES[type]} ${field};`)
            .join("\n");
    return `public struct ${name} {\n${body}\n};`;
  };
  return source.replace(
    SLANG_NAMED,
    `${struct("Attributes", named.attributes)}\n${struct("Metadata", named.metadata)}\n${struct("InstanceValues", named.instance ?? {})}\n${uniformsSlang(named.uniforms ?? {})}`,
  );
}

export type { SlangStages } from "./contract.ts";

/**
 * Which stages a Slang source defines: a `void vertexMain(` or
 * `void fragmentMain(` outside comments (a comment naming a stage, as a
 * template's, defines nothing).
 */
export function slangStages(source: string): SlangStages {
  const code = withoutComments(source);
  return {
    vertex: /\bvoid\s+vertexMain\s*\(/.test(code),
    fragment: /\bvoid\s+fragmentMain\s*\(/.test(code),
  };
}

/** C-style source without its `//` and `/* *\/` comments. */
export function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, " ");
}
