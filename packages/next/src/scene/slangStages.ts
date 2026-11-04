/**
 * Slang custom shader stages (plan §3.4) onto the WGSL contract: shared by
 * runtime compilation (`CustomShader.fromSlang`) and the build-time CLI
 * (scripts/slangShader.mjs). No browser or bundler APIs here.
 *
 * A user module imports `cesium` (shaders/cesium.slang) and defines
 * `vertexMain`, `fragmentMain` or both. Slang compiles functions only
 * from an entry point, so a stub fragment entry point (`slangStub`) calls
 * the stages; Slang keeps them as functions (`vertexMain_0`, …) with its
 * own copies of the contract's structs (`VertexInput_0`, fields renamed
 * `positionMC_0`, … in declaration order). `adaptSlangStages` appends the
 * contract's `vertexMain`/`fragmentMain`, converting by position. The
 * stub's entry point stays in the module, unused.
 */

import { uniformsSlang, type UniformDeclaration } from "./uniforms.ts";

/** Types of named attributes and metadata (`CustomShaderOptions`). */
export type NamedType = "f32" | "vec2f" | "vec3f" | "vec4f" | "mat2x2f";

/** A shader's named attributes and metadata: types by field name. */
export interface NamedDeclarations {
  attributes: Record<string, NamedType>;
  metadata: Record<string, NamedType>;
  /** Each attribute's glTF semantic. */
  semantics: Record<string, string>;
}

const SLANG_TYPES: Record<NamedType, string> = {
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
    /** Its uniforms' types (`CustomShaderOptions.uniforms`). */
    uniforms?: Record<string, { type: UniformDeclaration["type"] }>;
  },
): string {
  if (!source.includes(SLANG_NAMED)) {
    throw new Error("cesium.slang has no named structs marker.");
  }
  const struct = (name: string, fields: Record<string, NamedType>) => {
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
    `${struct("Attributes", named.attributes)}\n${struct("Metadata", named.metadata)}\n${uniformsSlang(named.uniforms ?? {})}`,
  );
}

/** Contract fields that are structs of named values, converted by name. */
const NESTED = new Set(["attributes", "metadata"]);

/** The contract's structs' fields in order (opaque.wgsl, cesium.slang). */
const FIELDS = {
  VertexInput: [
    "positionMC",
    "normalMC",
    "texCoord0",
    "color0",
    "featureId0",
    "vertexIndex",
    "instanceIndex",
    "time",
    "attributes",
    "metadata",
  ],
  VertexOutput: ["positionMC", "normalMC"],
  FragmentInput: [
    "positionMC",
    "positionEC",
    "positionWC",
    "normal",
    "texCoord0",
    "color0",
    "featureId",
    "screen",
    "time",
    "attributes",
    "metadata",
  ],
  MaterialOutput: [
    "baseColor",
    "alpha",
    "metallic",
    "roughness",
    "normal",
    "occlusion",
    "emissive",
    "unlit",
  ],
} as const;

/** The stub's entry point (`slangStub`), left unused in the module. */
export const SLANG_STUB_ENTRY = "cesiumStages";

export interface SlangStages {
  vertex: boolean;
  fragment: boolean;
}

/** Which stages a Slang source defines. */
export function slangStages(source: string): SlangStages {
  return {
    vertex: /\bvertexMain\s*\(/.test(source),
    fragment: /\bfragmentMain\s*\(/.test(source),
  };
}

/**
 * The stub module (`stages`) whose fragment entry point calls the user
 * module's (`user`) stages, so Slang emits them.
 */
export function slangStub(stages: SlangStages): string {
  const lines = [
    "import cesium;",
    "import user;",
    '[shader("fragment")]',
    `float4 ${SLANG_STUB_ENTRY}(float4 p : SV_Position) : SV_Target {`,
    "  float4 result = float4(0.0);",
  ];
  if (stages.vertex) {
    lines.push(
      "  VertexInput vi = (VertexInput)0;",
      "  VertexOutput vo = (VertexOutput)0;",
      "  vertexMain(vi, vo);",
      "  result.xyz += vo.positionMC + vo.normalMC;",
    );
  }
  if (stages.fragment) {
    lines.push(
      "  FragmentInput fi = (FragmentInput)0;",
      "  MaterialOutput mo = (MaterialOutput)0;",
      "  fragmentMain(fi, mo);",
      "  result += float4(mo.baseColor, mo.alpha);",
    );
  }
  lines.push("  return result;", "}", "");
  return lines.join("\n");
}

/** Each struct's fields in order, with their types. */
function structFields(
  wgsl: string,
): Map<string, Array<{ name: string; type: string }>> {
  const structs = new Map<string, Array<{ name: string; type: string }>>();
  for (const match of wgsl.matchAll(/struct\s+(\w+)\s*\{([^}]*)\}/g)) {
    const fields = [
      ...match[2]!.matchAll(/(\w+)\s*:\s*([\w<>, ]+?)\s*(?:,|$)/gm),
    ].map((m) => ({ name: m[1]!, type: m[2]!.trim() }));
    structs.set(match[1]!, fields);
  }
  return structs;
}

/** A Slang field's source name: Slang appends `_N` to each. */
function sourceName(name: string): string {
  return name.replace(/_\d+$/, "");
}

/**
 * The adapter for one stage: the contract's function calling Slang's
 * (`name`), its input built and its output read back by position.
 */
function adapter(
  wgsl: string,
  structs: Map<string, Array<{ name: string; type: string }>>,
  stage: "vertexMain" | "fragmentMain",
): string {
  const header = new RegExp(
    `fn\\s+(${stage}_\\d+)\\s*\\(\\s*\\w+\\s*:\\s*(\\w+)\\s*,\\s*\\w+\\s*:\\s*ptr<function,\\s*(\\w+)>\\s*\\)`,
  ).exec(wgsl);
  if (!header) {
    throw new Error(`Slang output has no ${stage} function.`);
  }
  const [, name, inType, outType] = header as unknown as [
    string,
    string,
    string,
    string,
  ];
  const [inStruct, outStruct, input, output] =
    stage === "vertexMain"
      ? (["VertexInput", "VertexOutput", "vsInput", "vsOutput"] as const)
      : (["FragmentInput", "MaterialOutput", "fsInput", "material"] as const);
  const inFields = FIELDS[inStruct];
  const outFields = FIELDS[outStruct];
  const inSlang = structs.get(inType);
  const outNames = structs.get(outType)?.map((f) => f.name);
  if (
    inSlang?.length !== inFields.length ||
    outNames?.length !== outFields.length
  ) {
    throw new Error(
      `Slang output's ${inStruct} or ${outStruct} doesn't match the contract (cesium.slang out of date?).`,
    );
  }
  return [
    `fn ${stage}(${input}: ${inStruct}, ${output}: ptr<function, ${outStruct}>) {`,
    `  var staged = ${outType}(${outFields.map((f) => `(*${output}).${f}`).join(", ")});`,
    `  ${name}(${inType}(${inFields
      .map((f, i) => {
        // Slang's copy of `Attributes`/`Metadata`, field by field by name.
        if (!NESTED.has(f)) {
          return `${input}.${f}`;
        }
        const type = inSlang[i]!.type;
        const fields = structs.get(type) ?? [];
        // Matrices transposed: Slang's are row-major in meaning (`m[0]` a
        // row, `mul(m, v)`), so `mul(m, v)` there is glTF's M v, as
        // WGSL's `m * v` is.
        return `${type}(${fields
          .map((g) => {
            const value = `${input}.${f}.${sourceName(g.name)}`;
            return g.type.startsWith("mat") ? `transpose(${value})` : value;
          })
          .join(", ")})`;
      })
      .join(", ")}), &staged);`,
    ...outFields.map((f, i) => `  (*${output}).${f} = staged.${outNames[i]};`),
    "}",
  ].join("\n");
}

/**
 * Slang's WGSL for the stub (`slangStub`) as custom shader code: its
 * functions and structs, then the contract's stages that the source
 * defines (`CustomShader` fills in the others).
 */
export function adaptSlangStages(wgsl: string, stages: SlangStages): string {
  const structs = structFields(wgsl);
  const parts = [wgsl.trim()];
  if (stages.vertex) {
    parts.push(adapter(wgsl, structs, "vertexMain"));
  }
  if (stages.fragment) {
    parts.push(adapter(wgsl, structs, "fragmentMain"));
  }
  return `${parts.join("\n\n")}\n`;
}
