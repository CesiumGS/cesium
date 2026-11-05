/**
 * The custom shader contract's code (plan §3.4, step 5), generated from the
 * boundary's description (shaders/generated/boundary.ts, Slang's reflection
 * of surfaceBoundary.slang and cesium.slang): no struct is written twice by
 * hand, and nothing reads the compiler's output.
 *
 * - WGSL shaders get the contract's structs (`VertexInput`, `VertexOutput`,
 *   `FragmentInput`) and the stage functions the engine calls
 *   (`cesiumVertexStage`, `cesiumFragmentStage`), which build them from the
 *   engine's `CesiumVertex` and `CesiumFragment` field by field by name.
 * - Slang shaders are compiled with a bridge (`slangBridge`): functions
 *   `__extern_cpp` names keep, over built-in types only, that build the
 *   contract's structs in Slang and call the shader's stages. The WGSL side
 *   (`slangAdapter`) calls them from `vertexMain` and `fragmentMain`, and
 *   their signatures are a boundary the link checks (`slangBridgeBoundary`).
 *   Slang's own names for the shader's structs never cross: each compile
 *   names its internals its own way.
 *
 * Node-safe: scripts/slangShader.mjs uses it.
 */

import {
  CONTRACT_STRUCTS,
  ENGINE_STRUCTS,
  type BoundaryField,
} from "../shaders/generated/boundary.ts";
import type { Boundary } from "../shaders/link/boundary.ts";

/** Types of named attributes and metadata (`CustomShaderOptions`). */
export type NamedType = "f32" | "vec2f" | "vec3f" | "vec4f" | "mat2x2f";

/** Types of per-instance values: the named types, and integers. */
export type InstanceType = NamedType | "u32" | "i32";

/** A shader's named values by field name, as the bridge passes them. */
export interface NamedFields {
  attributes: Record<string, NamedType>;
  metadata: Record<string, NamedType>;
  instance?: Record<string, InstanceType>;
}

/** Which stages a shader defines. */
export interface SlangStages {
  vertex: boolean;
  fragment: boolean;
}

/** The bridge's functions, by stage. */
export const SLANG_BRIDGE = {
  vertex: "cesiumSlangVertex",
  fragment: "cesiumSlangFragment",
} as const;

/** The bridge module's entry point: Slang compiles from one; unused. */
export const SLANG_STUB_ENTRY = "cesiumStages";

/** Contract fields holding a shader's named values, and where from. */
const NAMED_FIELDS = {
  attributes: "attributes",
  metadata: "metadata",
  instance: "instance",
} as const satisfies Record<string, keyof NamedFields>;

type NamedField = keyof typeof NAMED_FIELDS;

/** Per stage, the WGSL building each named-value field from the engine's. */
const NAMED_VALUES: Record<
  "vertex" | "fragment",
  Record<NamedField, string>
> = {
  vertex: {
    attributes: "vertexAttributes(v.directory, v.vertexIndex, v.tableFeature)",
    metadata: "vertexMetadata(v.directory, v.vertexIndex, v.tableFeature)",
    instance: "instanceValues(v.draw, v.instanceIndex)",
  },
  fragment: {
    attributes: "fragmentAttributes(f)",
    metadata: "fragmentMetadata(f)",
    instance: "instanceValues(f.draw, f.instanceIndex)",
  },
};

function isNamed(field: BoundaryField): field is BoundaryField & {
  name: NamedField;
} {
  return field.struct === true && field.name in NAMED_FIELDS;
}

/**
 * A contract struct built from an engine struct (`engine`, held in
 * `source`): each field from the engine's of the same name and type, the
 * named values from `named`. Throws if cesium.slang has a field the engine
 * doesn't pass (the boundary's two sides disagree).
 */
function construct(
  contract: readonly BoundaryField[],
  engine: readonly BoundaryField[],
  source: string,
  named: Record<NamedField, string>,
  what: string,
): string {
  return contract
    .map((f) => {
      if (isNamed(f)) {
        return named[f.name];
      }
      const from = engine.find((g) => g.name === f.name);
      if (from?.type !== f.type) {
        throw new Error(
          `cesium.slang's ${what}.${f.name} (${f.type}) has no field of that type in what the engine passes.`,
        );
      }
      return `${source}.${f.name}`;
    })
    .join(", ");
}

const wgslStruct = (name: string, fields: readonly BoundaryField[]) =>
  `struct ${name} {\n${fields.map((f) => `  ${f.name}: ${f.type},`).join("\n")}\n};`;

/**
 * The WGSL contract: its structs and the stage functions the engine calls,
 * which build them from the engine's and call the shader's stages. Same for
 * every shader; the named values' structs and readers are the shader's own
 * (CustomShader.ts `namedCode`).
 */
export const CONTRACT_WGSL = (() => {
  const { VertexInput, VertexOutput, FragmentInput } = CONTRACT_STRUCTS;
  const { CesiumVertex, CesiumVertexResult, CesiumFragment } = ENGINE_STRUCTS;
  // The vertex stage's result: what it may change, the named slots zero
  // (`packNamed` fills them).
  const result = CesiumVertexResult.map((f) => {
    const changed = VertexOutput.find((g) => g.name === f.name);
    if (changed && changed.type !== f.type) {
      throw new Error(`cesium.slang's VertexOutput.${f.name} isn't ${f.type}.`);
    }
    return changed ? `vsOutput.${f.name}` : `${f.type}()`;
  }).join(", ");
  return `// The custom shader contract (cesium.slang documents its fields),
// generated from the boundary's description (scene/contract.ts).
${wgslStruct("VertexInput", VertexInput)}
${wgslStruct("VertexOutput", VertexOutput)}
${wgslStruct("FragmentInput", FragmentInput)}
fn cesiumVertexStage(v: CesiumVertex) -> CesiumVertexResult {
  let vsInput = VertexInput(${construct(VertexInput, CesiumVertex, "v", NAMED_VALUES.vertex, "VertexInput")});
  var vsOutput = VertexOutput(${construct(VertexOutput, VertexInput, "vsInput", NAMED_VALUES.vertex, "VertexOutput")});
  vertexMain(vsInput, &vsOutput);
  var result = CesiumVertexResult(${result});
  packNamed(vsInput.attributes, vsInput.metadata, &result);
  return result;
}
fn cesiumFragmentStage(f: CesiumFragment, material: ptr<function, MaterialOutput>) {
  let fsInput = FragmentInput(${construct(FragmentInput, CesiumFragment, "f", NAMED_VALUES.fragment, "FragmentInput")});
  fragmentMain(fsInput, material);
}
`;
})();

// --- Slang stages: the bridge ----------------------------------------------------

const SLANG_SCALARS: Record<string, string> = {
  f: "float",
  u: "uint",
  i: "int",
};

/** A WGSL type of the boundary in Slang. */
function slangType(type: string): string {
  const scalar = { f32: "float", u32: "uint", i32: "int", bool: "bool" }[type];
  if (scalar) {
    return scalar;
  }
  const vector = /^vec(\d)([fui])$/.exec(type);
  if (vector) {
    return `${SLANG_SCALARS[vector[2]!]}${vector[1]}`;
  }
  const matrix = /^mat(\d)x(\d)f$/.exec(type);
  if (matrix) {
    // WGSL's matCxR is C columns of R: Slang's floatRxC.
    return `float${matrix[2]}x${matrix[1]}`;
  }
  throw new Error(`No Slang type for the boundary's ${type}.`);
}

/** One value crossing the bridge: its parameter and where it goes. */
interface Crossing {
  /** The parameter's name in the bridge. */
  param: string;
  /** Its WGSL type. */
  type: string;
  /** The contract field it is (`i.positionMC`, `i.attributes.heat`). */
  path: string;
  /** A matrix among the named values: passed transposed (see below). */
  matrix: boolean;
}

/**
 * The values of a contract struct crossing the bridge, in order: its
 * fields, the named values' structs' fields each (by name, so the bridge
 * and its caller agree however the declarations were ordered). A named
 * values' struct with no fields crosses nothing (its `none` stays zero).
 */
function crossings(
  fields: readonly BoundaryField[],
  named: NamedFields,
  prefix: string,
): Crossing[] {
  return fields.flatMap((f): Crossing[] => {
    if (!isNamed(f)) {
      return [
        {
          param: `${prefix}_${f.name}`,
          type: f.type,
          path: f.name,
          matrix: false,
        },
      ];
    }
    const values = named[NAMED_FIELDS[f.name]] ?? {};
    return Object.keys(values)
      .sort()
      .map((name) => {
        const type = values[name]!;
        return {
          param: `${prefix}_${f.name}_${name}`,
          type,
          path: `${f.name}.${name}`,
          matrix: type.startsWith("mat"),
        };
      });
  });
}

/** The two structs a stage takes, its function's name and its parameters. */
function stageShape(stage: "vertex" | "fragment", named: NamedFields) {
  const [input, output] =
    stage === "vertex"
      ? (["VertexInput", "VertexOutput"] as const)
      : (["FragmentInput", "MaterialOutput"] as const);
  return {
    name: SLANG_BRIDGE[stage],
    main: stage === "vertex" ? "vertexMain" : "fragmentMain",
    input,
    output,
    inputs: crossings(CONTRACT_STRUCTS[input], named, "in"),
    outputs: crossings(CONTRACT_STRUCTS[output], named, "out"),
  };
}

const defined = (stages: SlangStages) =>
  (["vertex", "fragment"] as const).filter((s) => stages[s]);

/**
 * The bridge module (Slang, `stages`): for each stage the shader defines, a
 * function over built-in types that builds the contract's structs, calls
 * the shader's stage and writes back what it may change. A named matrix is
 * transposed on the way in: Slang's `m[0]` is a row, so its `mul(m, v)` is
 * glTF's M v, as WGSL's `m * v` is.
 */
export function slangBridge(stages: SlangStages, named: NamedFields): string {
  const lines = ["import cesium;", "import user;", ""];
  for (const stage of defined(stages)) {
    const s = stageShape(stage, named);
    const params = [
      ...s.inputs.map((c) => `${slangType(c.type)} ${c.param}`),
      ...s.outputs.map((c) => `inout ${slangType(c.type)} ${c.param}`),
    ];
    lines.push(
      `export __extern_cpp void ${s.name}(${params.join(", ")}) {`,
      `  ${s.input} i = (${s.input})0;`,
      ...s.inputs.map(
        (c) =>
          `  i.${c.path} = ${c.matrix ? `transpose(${c.param})` : c.param};`,
      ),
      `  ${s.output} o = (${s.output})0;`,
      ...s.outputs.map((c) => `  o.${c.path} = ${c.param};`),
      `  ${s.main}(i, o);`,
      ...s.outputs.map((c) => `  ${c.param} = o.${c.path};`),
      "}",
      "",
    );
  }
  // Slang compiles from an entry point: this one does nothing, and the
  // link leaves it unused.
  lines.push('[shader("fragment")]', `void ${SLANG_STUB_ENTRY}() {}`, "");
  return lines.join("\n");
}

/**
 * The WGSL side of the bridge: the contract's `vertexMain` and
 * `fragmentMain` for the stages the shader defines, each calling its
 * bridge function with the contract's fields.
 */
export function slangAdapter(stages: SlangStages, named: NamedFields): string {
  return defined(stages)
    .map((stage) => {
      const s = stageShape(stage, named);
      const [input, output] =
        stage === "vertex" ? ["vsInput", "vsOutput"] : ["fsInput", "material"];
      // Each output through a variable of its own: WGSL forbids two
      // pointer arguments into one variable when either is written.
      const args = [
        ...s.inputs.map((c) => `${input}.${c.path}`),
        ...s.outputs.map((c) => `&${c.param}`),
      ];
      return [
        `fn ${s.main}(${input}: ${s.input}, ${output}: ptr<function, ${s.output}>) {`,
        ...s.outputs.map((c) => `  var ${c.param} = (*${output}).${c.path};`),
        `  ${s.name}(${args.join(", ")});`,
        ...s.outputs.map((c) => `  (*${output}).${c.path} = ${c.param};`),
        "}",
      ].join("\n");
    })
    .join("\n");
}

/**
 * The bridge's functions as the adapter calls them: a Slang shader compiled
 * against other named values (attributes, metadata, instance values) than
 * its `CustomShader` declares fails here, named, not as a WGSL type error.
 */
export function slangBridgeBoundary(
  stages: SlangStages,
  named: NamedFields,
): Boundary {
  return {
    name: "Slang stages (compiled with these attributes, metadata and instance values?)",
    requires: defined(stages).map((stage) => {
      const s = stageShape(stage, named);
      return {
        name: s.name,
        params: [
          ...s.inputs.map((c) => c.type),
          ...s.outputs.map((c) => `ptr<function, ${c.type}>`),
        ],
      };
    }),
    provides: [],
  };
}
