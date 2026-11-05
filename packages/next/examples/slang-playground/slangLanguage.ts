import { StreamLanguage } from "@codemirror/language";
import { clike } from "@codemirror/legacy-modes/mode/clike";

/**
 * Slang syntax highlighting for the playground's editor, on CodeMirror's
 * C-like stream parser: Slang's keywords, HLSL-style types and intrinsics,
 * and the custom shader contract's types (src/shaders/cesium.slang).
 * CodeMirror has no Slang mode. Completion, hover and diagnostics come from
 * the Slang language server (languageServer.ts); its semantic tokens would
 * make this highlighting exact, which is later work (plan §13.12).
 */
const words = (s: string) =>
  Object.fromEntries(s.split(/\s+/).map((w) => [w, true]));

const VECTORS = ["float", "half", "double", "int", "uint", "bool"]
  .flatMap((t) => [
    t,
    `${t}2`,
    `${t}3`,
    `${t}4`,
    `${t}2x2`,
    `${t}3x3`,
    `${t}4x4`,
    `${t}3x4`,
    `${t}4x3`,
  ])
  .join(" ");

export const slang = StreamLanguage.define(
  clike({
    name: "slang",
    keywords: words(
      "import module public private internal export extern static const " +
        "in out inout uniform groupshared " +
        "struct interface extension enum typealias typedef namespace " +
        "if else for while do switch case default break continue return discard " +
        "let var func associatedtype where this This __generic __init " +
        "property get set override throws try",
    ),
    types: words(
      `void ${VECTORS} vector matrix ` +
        "Texture1D Texture2D Texture3D TextureCube Texture2DArray " +
        "RWTexture2D SamplerState SamplerComparisonState " +
        "StructuredBuffer RWStructuredBuffer ByteAddressBuffer ConstantBuffer ParameterBlock " +
        "Atomic Optional Tuple Array " +
        // The custom shader contract (import cesium;).
        "VertexInput VertexOutput FragmentInput MaterialOutput Attributes Metadata InstanceValues",
    ),
    builtin: words(
      "abs acos all any asin atan atan2 ceil clamp cos cosh cross ddx ddy " +
        "degrees determinant distance dot exp exp2 faceforward floor fmod frac " +
        "fwidth isinf isnan length lerp log log2 mad max min mul normalize pow " +
        "radians rcp reflect refract round rsqrt saturate sign sin sincos sinh " +
        "smoothstep sqrt step tan tanh transpose trunc asfloat asint asuint " +
        "countbits firstbithigh firstbitlow reversebits f16tof32 f32tof16",
    ),
    atoms: words("true false none nullptr"),
    blockKeywords: words(
      "if else for while do switch struct interface extension namespace",
    ),
    indentSwitch: false,
  }),
);
