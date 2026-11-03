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

/** Each struct's field names in order. */
function structFields(wgsl: string): Map<string, string[]> {
  const structs = new Map<string, string[]>();
  for (const match of wgsl.matchAll(/struct\s+(\w+)\s*\{([^}]*)\}/g)) {
    const fields = [...match[2]!.matchAll(/(\w+)\s*:/g)].map((m) => m[1]!);
    structs.set(match[1]!, fields);
  }
  return structs;
}

/**
 * The adapter for one stage: the contract's function calling Slang's
 * (`name`), its input built and its output read back by position.
 */
function adapter(
  wgsl: string,
  structs: Map<string, string[]>,
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
  const outNames = structs.get(outType);
  if (
    structs.get(inType)?.length !== inFields.length ||
    outNames?.length !== outFields.length
  ) {
    throw new Error(
      `Slang output's ${inStruct} or ${outStruct} doesn't match the contract (cesium.slang out of date?).`,
    );
  }
  return [
    `fn ${stage}(${input}: ${inStruct}, ${output}: ptr<function, ${outStruct}>) {`,
    `  var staged = ${outType}(${outFields.map((f) => `(*${output}).${f}`).join(", ")});`,
    `  ${name}(${inType}(${inFields.map((f) => `${input}.${f}`).join(", ")}), &staged);`,
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
