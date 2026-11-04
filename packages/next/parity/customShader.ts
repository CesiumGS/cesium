import {
  Camera,
  CustomShader,
  Ellipsoid,
  Engine,
  MaterialFlags,
  OffscreenTarget,
  createBox,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type MeshData,
  type World,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";
import { flip } from "./flip.ts";
import twistHeightSlang from "./slang/twistHeight.slang?raw";
import heightBandsSlang from "./slang/heightBands.slang?raw";
import shearSlang from "./slang/shear.slang?raw";
import uniformsSlang from "./slang/uniforms.slang?raw";
// Built from them with scripts/slangShader.mjs.
import twistHeightWgsl from "./slang/twistHeight.wgsl?raw";
import heightBandsWgsl from "./slang/heightBands.wgsl?raw";
import shearWgsl from "./slang/shear.wgsl?raw";
import uniformsWgsl from "./slang/uniforms.wgsl?raw";

const TEMPLATE = `
<h1>Custom shaders</h1>
<p>
  Boxes on a ground plane, drawn with the engine's shader and with a custom
  shader's stages (plan §3.4, "Custom shading"): every pass that draws them
  (opaque, depth, shadow, ambient occlusion, translucent) compiles from the
  custom module. Stages that change nothing, and a shader that fails to
  compile (the content keeps the default), must match the default exactly;
  the others must differ. The same stages in Slang, compiled at build time
  (scripts/slangShader.mjs) and at runtime (the WebAssembly build in a
  worker), must match their WGSL exactly. Click a row to see its images.
</p>
<div class="status">Run to render every case both ways.</div>
<div class="images">
  <figure>
    <figcaption>Reference (default or WGSL)</figcaption>
    <canvas class="out" data-id="default"></canvas>
  </figure>
  <figure>
    <figcaption>Custom</figcaption>
    <canvas class="out" data-id="custom"></canvas>
  </figure>
</div>
<table data-id="results"></table>`;

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const WIDTH = 640;
const HEIGHT = 400;
const deg = Math.PI / 180;
const SITE = fromDegrees(-75.1652, 39.9526, 0);

interface Case {
  name: string;
  /** The shader, or how to make one (runtime Slang). */
  shader: CustomShader | (() => Promise<CustomShader>);
  /** Compared with this shader's image; the engine's own without. */
  against?: CustomShader;
  /** Must match exactly (else must differ). */
  same: boolean;
  /** Compiling must fail. */
  fails?: boolean;
  /** The boxes blended (alpha 0.5). */
  blended?: boolean;
  /** A streamed 3D Tiles tileset (`TILESET`) with the shader instead. */
  tileset?: boolean;
  /** The boxes' mesh has named attributes (`_SHEAR`, `_HEAT`). */
  named?: boolean;
  /** The boxes' faces are features with a table (`featureBox`). */
  featured?: boolean;
  /** A glTF model (e.g. `PROPERTY_MODEL`) instead of boxes. */
  model?: string;
  /** "Same" within float rounding (FLIP mean below 0.001), not exactly. */
  close?: boolean;
  /** Called on the shader before it draws (e.g. `setUniform`). */
  prepare?: (shader: CustomShader) => void;
  /** Frames drawn before reading (textures loading); default 4. */
  frames?: number;
}

/**
 * 1.x's property-attribute test model: a 1 m textured box with
 * `temperatures` (normalized UINT16 VEC2, offset/scale to °C) and
 * `warpMatrix`/`transformedWarpMatrix` (MAT2, the latter offset/scaled)
 * from the same attribute.
 */
const PROPERTY_MODEL =
  "/specs-data/Models/glTF-2.0/BoxTexturedWithPropertyAttributes/glTF/BoxTexturedWithPropertyAttributes.gltf";

const FS =
  "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {";

/** 1.x's property-texture test models (all read TEXCOORD_0, nearest). */
const TEXTURE_MODELS = "/specs-data/Models/glTF-2.0";
const SIMPLE_TEXTURE = `${TEXTURE_MODELS}/SimplePropertyTexture/glTF/SimplePropertyTexture.gltf`;
const FLOAT_TEXTURE = `${TEXTURE_MODELS}/PropertyTextureWith32BitTypes/glTF/PropertyTextureWith32BitTypes.gltf`;
const VECTOR_TEXTURE = `${TEXTURE_MODELS}/PropertyTextureWithVectorProperties/glTF/PropertyTextureWithVectorProperties.gltf`;

/** A model's glTF texture's image (a data URI in these models). */
async function textureImage(model: string, texture: number): Promise<string> {
  const json = await (await fetch(model)).json();
  return json.images[json.textures[texture].source].uri;
}
const [simpleImage, floatImage, vectorImage] = await Promise.all([
  textureImage(SIMPLE_TEXTURE, 1),
  textureImage(FLOAT_TEXTURE, 0),
  textureImage(VECTOR_TEXTURE, 1),
]);

/**
 * The property texture's image as a user texture, its texel's bytes at
 * TEXCOORD_0 as `bytes` (vec4f, 0–255): the decoding done by hand.
 */
const byHand = (label: string, image: string, body: string) =>
  new CustomShader({
    label,
    uniforms: { data: { type: "texture2d", value: image, nearest: true } },
    fragment: `${FS}
  let size = textureDimensions(data);
  let texel = textureLoad(data, min(vec2u(fract(fsInput.texCoord0) * vec2f(size)), size - 1u), 0);
  let bytes = round(texel * 255.0);
${body}
}`,
  });

const SIMPLE_METADATA = new CustomShader({
  label: "temperatures, insulation (texture)",
  metadata: {
    insideTemperature: "f32",
    outsideTemperature: "f32",
    insulation: "f32",
  },
  fragment: `${FS}
  let m = fsInput.metadata;
  (*material).baseColor = vec3f(m.insideTemperature / 255.0, m.outsideTemperature / 255.0, m.insulation);
}`,
});

const FLOAT_METADATA = new CustomShader({
  label: "FLOAT32 temperature (texture)",
  metadata: { insideTemperature: "f32" },
  fragment: `${FS}
  let t = fsInput.metadata.insideTemperature;
  (*material).baseColor = vec3f(fract(t * 0.1), fract(t * 0.37), 0.5);
}`,
});

const VECTOR_METADATA = new CustomShader({
  label: "VEC2 properties (texture)",
  metadata: { vec2Property: "vec2f", valueTransformProperty: "vec2f" },
  fragment: `${FS}
  let m = fsInput.metadata;
  (*material).baseColor = vec3f(m.vec2Property, (m.valueTransformProperty.x - 1.0) / 2.0);
}`,
});

/** Inside temperature (20–25 °C) to red, outside (10–30 °C) to blue. */
const TEMPERATURES = new CustomShader({
  label: "temperatures (metadata)",
  metadata: { temperatures: "vec2f" },
  fragment: `${FS}
  let t = fsInput.metadata.temperatures;
  (*material).baseColor = vec3f((t.x - 20.0) / 5.0, 0.2, (t.y - 10.0) / 20.0);
}`,
});

/** The transformed warp matrix applied to the UVs. */
const WARP = new CustomShader({
  label: "transformed warp (metadata)",
  metadata: { transformedWarpMatrix: "mat2x2f" },
  fragment: `${FS}
  let uv = fsInput.metadata.transformedWarpMatrix * fsInput.texCoord0;
  (*material).baseColor = vec3f(fract(uv), 0.5);
}`,
});

/** Values of every uniform type, in uniforms.slang's order. */
const UNIFORM_VALUES = {
  amplitude: 0.8,
  offset: [0.1, -0.2],
  tint: [0.9, 0.4, 0.2],
  bands: 3,
  shift: -2,
  // Column-major: x to y, y to -x (asymmetric).
  spin: [0, 1, 0, -1, 0, 0, 0, 0, 1],
} as const;
const UNIFORM_TYPES = {
  amplitude: "f32",
  offset: "vec2f",
  tint: "vec3f",
  bands: "u32",
  shift: "i32",
  spin: "mat3x3f",
} as const;
const declareUniforms = (values: Partial<typeof UNIFORM_VALUES> = {}) =>
  Object.fromEntries(
    Object.entries(UNIFORM_TYPES).map(([name, type]) => [
      name,
      {
        type,
        value:
          (values as Record<string, number | readonly number[]>)[name] ??
          UNIFORM_VALUES[name as keyof typeof UNIFORM_VALUES],
      },
    ]),
  ) as Record<
    string,
    {
      type: (typeof UNIFORM_TYPES)[keyof typeof UNIFORM_TYPES];
      value: number | readonly number[];
    }
  >;

/** uniforms.slang's body, reading `U` (the uniforms, or constants). */
const UNIFORMS_BODY = `
  let p = (U.spin * fsInput.positionMC).xy + U.offset;
  let k = floor((p.x + 0.5) * f32(U.bands) + f32(U.shift));
  (*material).baseColor = U.tint * U.amplitude * (0.5 + 0.5 * fract(k * 0.37));
}`;

/** The uniforms as written-in constants, with `amplitude` given. */
function constantsShader(amplitude: number): CustomShader {
  const v = UNIFORM_VALUES;
  return new CustomShader({
    label: `constants (amplitude ${amplitude})`,
    fragment: `struct Consts { amplitude: f32, offset: vec2f, tint: vec3f, bands: u32, shift: i32, spin: mat3x3f };
${FS}
  let U = Consts(${amplitude}, vec2f(${v.offset.join(", ")}), vec3f(${v.tint.join(", ")}), ${v.bands}u, ${v.shift}i, mat3x3f(${v.spin.map((x) => x.toFixed(1)).join(", ")}));${UNIFORMS_BODY}`,
  });
}
const CONSTANTS = constantsShader(UNIFORM_VALUES.amplitude);

const uniformsShader = (label: string, values = {}) =>
  new CustomShader({
    label,
    uniforms: declareUniforms(values),
    fragment: `${FS}
  let U = uniforms;${UNIFORMS_BODY}`,
  });

/** A texture by URL: the property model's logo. */
const LOGO =
  "/specs-data/Models/glTF-2.0/BoxTexturedWithPropertyAttributes/glTF/CesiumLogoFlat.png";

/** The logo across each box's sides, lifting its tops where it's bright. */
const textureShader = (label: string, value: string | ImageData) =>
  new CustomShader({
    label,
    uniforms: { logo: { type: "texture2d", value } },
    displacement: 0.3,
    vertex: `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  let top = step(0.4, vsInput.positionMC.z);
  let bright = textureSampleLevel(logo, logoSampler, vsInput.positionMC.xy + 0.5, 0.0).g;
  (*vsOutput).positionMC.z += top * bright * 0.3;
}`,
    fragment: `${FS}
  let uv = vec2f(fsInput.positionMC.x + fsInput.positionMC.y + 1.0, 0.5 - fsInput.positionMC.z);
  (*material).baseColor = textureSample(logo, logoSampler, uv).rgb;
}`,
  });

/** Faces lifted and tinted by their feature's properties, from `source`. */
const faceShader = (label: string, source: "table" | "attributes") => {
  const read = source === "table" ? "metadata" : "attributes";
  return new CustomShader({
    label,
    ...(source === "table"
      ? { metadata: { heat: "f32", tint: "vec3f" } }
      : {
          attributes: {
            heat: { semantic: "_HEAT", type: "f32" },
            tint: { semantic: "_TINT", type: "vec3f" },
          },
        }),
    displacement: 0.3,
    vertex: `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  (*vsOutput).positionMC += vsInput.normalMC * vsInput.${read}.heat * 0.2;
}`,
    fragment: `${FS}
  (*material).baseColor = fsInput.${read}.tint * fsInput.${read}.heat;
}`,
  });
};
const FACES_TABLE = faceShader("faces (feature table)", "table");

/** Buildings colored by their batch table's Height. */
const HEIGHTS = new CustomShader({
  label: "buildings by Height (feature table)",
  metadata: { Height: "f32" },
  fragment: `${FS}
  let h = fsInput.metadata.Height;
  (*material).baseColor = vec3f(fract(h / 20.0), 0.3, 1.0 - fract(h / 20.0));
}`,
});

/** The boxes' named attributes as shear.slang declares them. */
const SHEAR_ATTRIBUTES = {
  shear: { semantic: "_SHEAR", type: "mat2x2f" },
  heat: { semantic: "_HEAT", type: "f32" },
} as const;

/** Shear and heat in WGSL: what shear.slang must draw. */
const SHEAR = new CustomShader({
  label: "shear + heat (WGSL)",
  attributes: SHEAR_ATTRIBUTES,
  vertex: `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  (*vsOutput).positionMC.z += vsInput.attributes.heat * 0.25;
}`,
  fragment: `${FS}
  let p = fsInput.attributes.shear * (fsInput.positionMC.xy + 0.5);
  (*material).baseColor = vec3f(fract(p * 3.0), fsInput.attributes.heat);
}`,
});

/** Buildings with per-feature colors (batched b3dm), streamed. */
const TILESET = "/specs-data/Cesium3DTiles/Batched/BatchedColors/tileset.json";

/** Bands of color by height (heightBands.slang in WGSL). */
const BANDS = new CustomShader({
  label: "height bands (WGSL)",
  fragment: `fn hue(h: f32) -> vec3f {
  let k = vec3f(0.0, 2.0 / 3.0, 1.0 / 3.0);
  return saturate(abs(fract(h + k) * 6.0 - 3.0) - 1.0);
}
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  let height = length(fsInput.positionWC) - 6369000.0;
  (*material).baseColor = mix((*material).baseColor, hue(fract(height / 8.0)), 0.7);
}`,
});

const HEIGHT_WGSL = `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  let t = clamp(fsInput.positionMC.z + 0.5, 0.0, 1.0);
  (*material).baseColor = mix(vec3f(0.1, 0.2, 0.9), vec3f(0.95, 0.3, 0.1), t);
}`;

const TWIST_WGSL = `fn twist(v: vec3f, a: f32) -> vec3f {
  let c = cos(a);
  let s = sin(a);
  return vec3f(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
}
fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  let a = vsInput.positionMC.z * 1.5;
  (*vsOutput).positionMC = twist(vsInput.positionMC, a);
  (*vsOutput).normalMC = twist(vsInput.normalMC, a);
}`;

/** Twist and height in WGSL: what the Slang versions must draw. */
const TWIST_HEIGHT = new CustomShader({
  label: "twist + height (WGSL)",
  vertex: TWIST_WGSL,
  fragment: HEIGHT_WGSL,
});

const SLANG_WASM = "/slang-wasm/slang-wasm.js";

const CASES: Case[] = [
  {
    name: "identity (both stages)",
    same: true,
    shader: new CustomShader({
      label: "identity",
      vertex: `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  (*vsOutput).positionMC = vsInput.positionMC;
}`,
      fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor = (*material).baseColor;
}`,
    }),
  },
  {
    name: "compile error (falls back)",
    same: true,
    fails: true,
    shader: new CustomShader({
      label: "broken",
      fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).nope = 1.0;
}`,
    }),
  },
  {
    name: "fragment: color by height",
    same: false,
    shader: new CustomShader({ label: "height", fragment: HEIGHT_WGSL }),
  },
  {
    name: "vertex: twist about up",
    same: false,
    shader: new CustomShader({ label: "twist", vertex: TWIST_WGSL }),
  },
  {
    name: "twist + height (WGSL)",
    same: false,
    shader: TWIST_HEIGHT,
  },
  {
    name: "Slang, build time (vs WGSL)",
    same: true,
    against: TWIST_HEIGHT,
    shader: new CustomShader({
      label: "twist + height (slangc)",
      wgsl: twistHeightWgsl,
    }),
  },
  {
    name: "Slang, runtime (vs WGSL)",
    same: true,
    against: TWIST_HEIGHT,
    shader: () =>
      CustomShader.fromSlang(twistHeightSlang, {
        label: "twist + height (slang-wasm)",
        slangUrl: SLANG_WASM,
      }),
  },
  {
    name: "fragment: unlit red",
    same: false,
    shader: new CustomShader({
      label: "unlit",
      fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor = vec3f(1.0, 0.0, 0.0);
  (*material).unlit = true;
}`,
    }),
  },
  {
    name: "translucent: tint green",
    same: false,
    blended: true,
    shader: new CustomShader({
      label: "tint",
      fragment: `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor = (*material).baseColor * vec3f(0.2, 1.0, 0.2);
}`,
    }),
  },
  {
    name: "tileset: height bands (WGSL)",
    same: false,
    tileset: true,
    shader: BANDS,
  },
  {
    name: "tileset: Slang, build time (vs WGSL)",
    same: true,
    tileset: true,
    against: BANDS,
    shader: new CustomShader({
      label: "height bands (slangc)",
      wgsl: heightBandsWgsl,
    }),
  },
  {
    name: "tileset: Slang, runtime (vs WGSL)",
    same: true,
    tileset: true,
    against: BANDS,
    shader: () =>
      CustomShader.fromSlang(heightBandsSlang, {
        label: "height bands (slang-wasm)",
        slangUrl: SLANG_WASM,
      }),
  },
  {
    name: "attributes: shear (MAT2) and heat, both stages",
    same: false,
    named: true,
    shader: SHEAR,
  },
  {
    name: "attributes: Slang, build time (vs WGSL)",
    same: true,
    named: true,
    against: SHEAR,
    shader: new CustomShader({
      label: "shear + heat (slangc)",
      attributes: SHEAR_ATTRIBUTES,
      wgsl: shearWgsl,
    }),
  },
  {
    name: "attributes: Slang, runtime (vs WGSL)",
    same: true,
    named: true,
    against: SHEAR,
    shader: () =>
      CustomShader.fromSlang(shearSlang, {
        label: "shear + heat (slang-wasm)",
        attributes: SHEAR_ATTRIBUTES,
        slangUrl: SLANG_WASM,
      }),
  },
  {
    name: "absent attribute and property read zero",
    same: true,
    named: true,
    shader: new CustomShader({
      label: "absent",
      attributes: { missing: { semantic: "_MISSING", type: "vec4f" } },
      metadata: { nothing: "f32" },
      fragment: `${FS}
  (*material).baseColor += fsInput.attributes.missing.xyz + fsInput.metadata.nothing;
}`,
    }),
  },
  {
    name: "metadata: temperatures (property attribute)",
    same: false,
    model: PROPERTY_MODEL,
    shader: TEMPERATURES,
  },
  {
    name: "metadata: raw attribute, offset/scale by hand (vs metadata)",
    same: true,
    close: true,
    model: PROPERTY_MODEL,
    against: TEMPERATURES,
    shader: new CustomShader({
      label: "temperatures (attribute)",
      attributes: { raw: { semantic: "_TEMPERATURES", type: "vec2f" } },
      fragment: `${FS}
  let t = fsInput.attributes.raw * vec2f(5.0, 20.0) + vec2f(20.0, 10.0);
  (*material).baseColor = vec3f((t.x - 20.0) / 5.0, 0.2, (t.y - 10.0) / 20.0);
}`,
    }),
  },
  {
    name: "metadata: MAT2 with offset/scale",
    same: false,
    model: PROPERTY_MODEL,
    shader: WARP,
  },
  {
    name: "metadata: MAT2 offset/scale by hand (vs metadata)",
    same: true,
    close: true,
    model: PROPERTY_MODEL,
    against: WARP,
    shader: new CustomShader({
      label: "transformed warp (by hand)",
      metadata: { warpMatrix: "mat2x2f" },
      fragment: `${FS}
  let w = fsInput.metadata.warpMatrix;
  let m = mat2x2f(w[0] * 2.0 + 0.5, w[1] * 2.0 + 0.5);
  (*material).baseColor = vec3f(fract(m * fsInput.texCoord0), 0.5);
}`,
    }),
  },
  {
    name: "metadata: vertex stage lifts by temperature",
    same: false,
    model: PROPERTY_MODEL,
    shader: new CustomShader({
      label: "lift",
      metadata: { temperatures: "vec2f" },
      displacement: 0.3,
      vertex: `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  (*vsOutput).positionMC.y += (vsInput.metadata.temperatures.y - 10.0) / 20.0 * 0.3;
}`,
    }),
  },
  {
    name: "property texture: UINT8 and normalized",
    same: false,
    model: SIMPLE_TEXTURE,
    shader: SIMPLE_METADATA,
  },
  {
    name: "property texture: decoded by hand (vs metadata)",
    same: true,
    model: SIMPLE_TEXTURE,
    frames: 20,
    against: SIMPLE_METADATA,
    shader: byHand(
      "temperatures, insulation (by hand)",
      simpleImage,
      `  (*material).baseColor = vec3f(bytes.r / 255.0, bytes.g / 255.0, bytes.b / 255.0);`,
    ),
  },
  {
    name: "property texture: FLOAT32 over 4 channels",
    same: false,
    model: FLOAT_TEXTURE,
    shader: FLOAT_METADATA,
  },
  {
    name: "property texture: FLOAT32 by hand (vs metadata)",
    same: true,
    model: FLOAT_TEXTURE,
    frames: 20,
    against: FLOAT_METADATA,
    shader: byHand(
      "FLOAT32 temperature (by hand)",
      floatImage,
      `  let b = vec4u(bytes);
  let t = bitcast<f32>(b.r | (b.g << 8u) | (b.b << 16u) | (b.a << 24u));
  (*material).baseColor = vec3f(fract(t * 0.1), fract(t * 0.37), 0.5);`,
    ),
  },
  {
    name: "property texture: VEC2, offset/scale",
    same: false,
    model: VECTOR_TEXTURE,
    shader: VECTOR_METADATA,
  },
  {
    name: "property texture: VEC2 by hand (vs metadata)",
    same: true,
    model: VECTOR_TEXTURE,
    frames: 20,
    against: VECTOR_METADATA,
    shader: byHand(
      "VEC2 properties (by hand)",
      vectorImage,
      `  let v = bytes.gb / 255.0;
  let t = bytes.rg / 255.0 * 2.0 + 1.0;
  (*material).baseColor = vec3f(v, (t.x - 1.0) / 2.0);`,
    ),
  },
  {
    name: "property texture: the vertex stage reads zero",
    same: true,
    model: SIMPLE_TEXTURE,
    shader: new CustomShader({
      label: "lift by a texture property",
      metadata: { insideTemperature: "f32" },
      vertex: `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  (*vsOutput).positionMC.y += vsInput.metadata.insideTemperature;
}`,
    }),
  },
  {
    name: "feature table: per face, both stages",
    same: false,
    featured: true,
    shader: FACES_TABLE,
  },
  {
    name: "feature table: vs the same as attributes",
    same: true,
    close: true,
    featured: true,
    against: FACES_TABLE,
    shader: faceShader("faces (attributes)", "attributes"),
  },
  {
    name: "feature table: tileset by Height (b3dm batch table)",
    same: false,
    tileset: true,
    shader: HEIGHTS,
  },
  {
    name: "uniforms: every type (vs constants)",
    same: true,
    against: CONSTANTS,
    shader: uniformsShader("uniforms (WGSL)"),
  },
  {
    name: "uniforms: differ from the default",
    same: false,
    shader: uniformsShader("uniforms (WGSL)"),
  },
  {
    name: "uniforms: setUniform (vs constants)",
    same: true,
    against: constantsShader(0.35),
    shader: uniformsShader("uniforms (set)", { amplitude: 0 }),
    prepare: (shader) => shader.setUniform("amplitude", 0.35),
  },
  {
    name: "uniforms: Slang, build time (vs constants)",
    same: true,
    against: CONSTANTS,
    shader: new CustomShader({
      label: "uniforms (slangc)",
      uniforms: declareUniforms(),
      wgsl: uniformsWgsl,
    }),
  },
  {
    name: "uniforms: Slang, runtime (vs constants)",
    same: true,
    against: CONSTANTS,
    shader: () =>
      CustomShader.fromSlang(uniformsSlang, {
        label: "uniforms (slang-wasm)",
        uniforms: declareUniforms(),
        slangUrl: SLANG_WASM,
      }),
  },
  {
    name: "texture by URL, both stages (vs a white one)",
    same: false,
    frames: 20,
    against: textureShader("white texture", whitePixel()),
    shader: textureShader("logo texture", LOGO),
  },
];

/** A 1×1 white image. */
function whitePixel(): ImageData {
  const image = new ImageData(1, 1);
  image.data.fill(255);
  return image;
}

/** A unit square in its xy-plane, facing +z. */
function square(): MeshData {
  return {
    positions: new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}

/**
 * The unit box with named attributes: `_SHEAR` an asymmetric MAT2 (x
 * sheared by y, column-major as glTF) and `_HEAT` its height (0 at the
 * bottom, 1 at the top).
 */
function namedBox(): MeshData {
  const mesh = createBox();
  const count = mesh.positions.length / 3;
  const shear = new Float32Array(count * 4);
  const heat = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    shear.set([1, 0, 0.6, 1], i * 4);
    heat[i] = mesh.positions[i * 3 + 2]! + 0.5;
  }
  return {
    ...mesh,
    attributes: {
      _SHEAR: { data: shear, components: 4 },
      _HEAT: { data: heat, components: 1 },
    },
  };
}

/** Per face of the box: a scalar and a vec3 (the feature table's columns). */
const FACE_HEAT = [0.1, 0.3, 0.5, 0.7, 0.9, 1.0];
const FACE_TINT = [
  [0.9, 0.2, 0.2],
  [0.2, 0.9, 0.2],
  [0.2, 0.2, 0.9],
  [0.9, 0.9, 0.2],
  [0.2, 0.9, 0.9],
  [0.9, 0.2, 0.9],
];

/**
 * The unit box with each face a feature (6), its properties in a feature
 * table and the same values as per-vertex attributes (`_HEAT`, `_TINT`).
 */
function featureBox(): MeshData {
  const mesh = createBox();
  const count = mesh.positions.length / 3;
  const featureIds = new Uint32Array(count);
  const heat = new Float32Array(count);
  const tint = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const face = Math.floor(i / 4); // createBox: 4 vertices per face
    featureIds[i] = face;
    heat[i] = FACE_HEAT[face]!;
    tint.set(FACE_TINT[face]!, i * 3);
  }
  return {
    ...mesh,
    featureIds,
    featureCount: 6,
    featureTable: {
      count: 6,
      columns: {
        heat: FACE_HEAT,
        tint: FACE_TINT,
        label: FACE_HEAT.map(String),
      },
    },
    attributes: {
      _HEAT: { data: heat, components: 1 },
      _TINT: { data: tint, components: 3 },
    },
  };
}

/** A ground plane and three boxes; the boxes with `shader`. */
function build(world: World, c: Case, shader: CustomShader | undefined): void {
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  mat4.setTranslation(enu, vec3.vec3());
  const ground = world.addMaterial({
    baseColor: [0.6, 0.6, 0.55, 1],
    roughness: 0.9,
  });
  world.addDraw({
    mesh: world.addMesh(square()),
    origin,
    model: mat4.multiply(
      mat4.mat4(),
      enu,
      mat4.fromScale(mat4.mat4(), 40, 40, 1),
    ),
    material: ground,
  });
  const box = world.addMesh(
    c.featured ? featureBox() : c.named ? namedBox() : createBox(),
  );
  const colors = [
    [0.8, 0.2, 0.2],
    [0.2, 0.7, 0.3],
    [0.2, 0.4, 0.9],
  ] as const;
  colors.forEach((color, i) => {
    const material = world.addMaterial({
      baseColor: [...color, c.blended ? 0.5 : 1],
      roughness: 0.5,
      flags: c.blended ? MaterialFlags.alphaBlend : 0,
    });
    const local = mat4.fromScale(mat4.mat4(), 4, 4, 8);
    mat4.setTranslation(local, vec3.vec3((i - 1) * 9, 0, 4));
    world.addDraw({
      mesh: box,
      origin,
      model: mat4.multiply(mat4.mat4(), enu, local),
      material,
      doubleSided: c.blended ?? false,
      ...(shader ? { shader } : {}),
    });
  });
}

const frame = () => new Promise((resolve) => setTimeout(resolve, 30));

/**
 * The tileset with `shader`, drawn once it has loaded what it wants at
 * this view (the tiles' volumes framed as `Viewer.zoomTo` does).
 */
async function renderTileset(
  engine: Engine,
  target: OffscreenTarget,
  shader: CustomShader | undefined,
): Promise<ImageData> {
  const world = engine.createWorld({
    maxDraws: 1024,
    maxMaterials: 256,
    vertexBytes: 16 << 20,
    indexBytes: 8 << 20,
  });
  const tileset = await engine.addTileset(
    world,
    new URL(TILESET, location.href),
    shader ? { customShader: shader } : {},
  );
  const volume = tileset.root.contentVolume ?? tileset.root.volume;
  const camera = new Camera();
  camera.near = Math.max(0.1, volume.sphere.radius * 0.01);
  camera.lookAt(
    volume.sphere.center,
    35 * deg,
    -30 * deg,
    volume.sphere.radius * 2.6,
  );
  const view = engine.addView({
    target,
    world,
    camera,
    background: "color",
    clearColor: [0.03, 0.04, 0.06],
    lighting: { environment: "procedural" },
    shadows: true,
    ambientOcclusion: true,
  });
  // Until nothing has been in flight for 10 frames (5 s at most).
  let quiet = 0;
  for (let i = 0; i < 160 && quiet < 10; i++) {
    engine.renderFrame();
    await frame();
    quiet = tileset.idle && tileset.stats.inFlight === 0 ? quiet + 1 : 0;
  }
  const image = new ImageData(await target.read(), WIDTH, HEIGHT);
  engine.removeView(view);
  engine.removeTileset(tileset);
  engine.worlds.splice(engine.worlds.indexOf(world), 1);
  world.destroy();
  return image;
}

/** A glTF model (`url`), scaled 8×, with `shader`. */
async function renderModel(
  engine: Engine,
  target: OffscreenTarget,
  shader: CustomShader | undefined,
  url: string,
  frames: number,
): Promise<ImageData> {
  const world = engine.createWorld({
    maxDraws: 16,
    maxMaterials: 16,
    vertexBytes: 1 << 20,
    indexBytes: 1 << 20,
  });
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(
    { ...SITE, height: 4 },
    vec3.vec3(),
  );
  const modelMatrix = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  mat4.multiply(modelMatrix, modelMatrix, mat4.fromScale(mat4.mat4(), 8, 8, 8));
  const asset = await engine.loadGltf(new URL(url, location.href).href);
  const instance = engine.addModel(world, asset, {
    modelMatrix,
    ...(shader ? { shader } : {}),
  });
  // Framed by its bounds (as models.ts), whatever its size and orientation.
  const camera = new Camera();
  camera.near = 0.1;
  camera.lookAt(instance.center, 30 * deg, -25 * deg, instance.radius * 2.8);
  const view = engine.addView({
    target,
    world,
    camera,
    background: "color",
    clearColor: [0.03, 0.04, 0.06],
    lighting: { environment: "procedural" },
    shadows: true,
    ambientOcclusion: true,
  });
  for (let i = 0; i < frames; i++) {
    engine.renderFrame();
    await frame();
  }
  const image = new ImageData(await target.read(), WIDTH, HEIGHT);
  engine.removeView(view);
  engine.worlds.splice(engine.worlds.indexOf(world), 1);
  world.destroy();
  return image;
}

async function render(
  engine: Engine,
  target: OffscreenTarget,
  c: Case,
  shader: CustomShader | undefined,
): Promise<ImageData> {
  if (c.tileset) {
    return renderTileset(engine, target, shader);
  }
  if (c.model) {
    return renderModel(engine, target, shader, c.model, c.frames ?? 4);
  }
  const world = engine.createWorld({
    maxDraws: 16,
    maxMaterials: 16,
    vertexBytes: 1 << 20,
    indexBytes: 1 << 20,
  });
  build(world, c, shader);
  const camera = new Camera();
  camera.near = 0.1;
  const center = Ellipsoid.WGS84.cartographicToCartesian(
    { ...SITE, height: 4 },
    vec3.vec3(),
  );
  camera.lookAt(center, 25 * deg, -25 * deg, 45);
  const view = engine.addView({
    target,
    world,
    camera,
    background: "color",
    clearColor: [0.03, 0.04, 0.06],
    lighting: { environment: "procedural" },
    // Every pass the custom module drives: casters and the AO prepass too.
    shadows: true,
    ambientOcclusion: true,
  });
  for (let i = 0; i < (c.frames ?? 4); i++) {
    engine.renderFrame();
    await frame();
  }
  const image = new ImageData(await target.read(), WIDTH, HEIGHT);
  engine.removeView(view);
  engine.worlds.splice(engine.worlds.indexOf(world), 1);
  world.destroy();
  return image;
}

interface Row {
  case: string;
  expected: string;
  compiled: string;
  flipMean: number;
  pass: boolean | "skipped";
}

/** Each row's images (none for a skipped one). */
let lastImages: ({ default: ImageData; custom: ImageData } | undefined)[] = [];

async function runCustomShader(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const engine = await Engine.create();
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  // The sun 35° up in the southwest, so the boxes cast long shadows.
  const ellipsoid = Ellipsoid.WGS84;
  const enu = eastNorthUpToFixedFrame(
    ellipsoid.cartographicToCartesian(SITE, vec3.vec3()),
    ellipsoid,
    mat4.mat4(),
  );
  const elevation = 35 * deg;
  const azimuth = 225 * deg; // clockwise from north
  const local = [
    Math.cos(elevation) * Math.sin(azimuth),
    Math.cos(elevation) * Math.cos(azimuth),
    Math.sin(elevation),
  ];
  for (let k = 0; k < 3; k++) {
    engine.sunDirection[k] =
      enu[k]! * local[0]! + enu[4 + k]! * local[1]! + enu[8 + k]! * local[2]!;
  }
  const rows: Row[] = [];
  lastImages = [];
  // Runtime Slang needs the WebAssembly build served (SLANG_WASM_DIR).
  // Vite answers missing paths with its HTML page (200), so check the type.
  const probe = await fetch(SLANG_WASM.replace(/\.js$/, ".wasm"), {
    method: "HEAD",
  });
  const slangServed =
    probe.ok && (probe.headers.get("content-type") ?? "").includes("wasm");
  for (const c of CASES) {
    status.textContent = `${c.name}…`;
    const against = c.against ? ` vs ${c.against.label}` : "";
    if (typeof c.shader === "function" && !slangServed) {
      rows.push({
        case: c.name,
        expected: `same${against}`,
        compiled: "skipped: slang-wasm not served (SLANG_WASM_DIR)",
        flipMean: 0,
        pass: "skipped",
      });
      lastImages.push(undefined);
      renderTable(rows);
      continue;
    }
    let compiled = "yes";
    let shader: CustomShader | undefined;
    try {
      shader = typeof c.shader === "function" ? await c.shader() : c.shader;
      await engine.compileShader(shader);
      c.prepare?.(shader);
      // What it's compared with draws with its own pipelines too.
      if (c.against) {
        await engine.compileShader(c.against);
      }
    } catch (error) {
      compiled = `failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    const base = await render(engine, target, c, c.against);
    const custom = await render(engine, target, c, shader);
    const f = flip(base.data, custom.data, WIDTH, HEIGHT);
    const failed = compiled !== "yes";
    rows.push({
      case: c.name,
      expected: `${c.same ? "same" : "differs"}${against}`,
      compiled,
      flipMean: f.mean,
      pass:
        failed === (c.fails ?? false) &&
        (c.same ? (c.close ? f.mean < 0.001 : f.mean === 0) : f.mean > 0.005),
    });
    lastImages.push({ default: base, custom });
    renderTable(rows);
  }
  if (lastImages[0]) {
    showImages(lastImages[0]);
  }
  const passed = rows.filter((r) => r.pass === true).length;
  const skipped = rows.filter((r) => r.pass === "skipped").length;
  status.textContent = `Done: ${passed} of ${rows.length - skipped} pass${skipped ? `, ${skipped} skipped` : ""}.`;
  target.destroy();
  engine.destroy();
  return rows;
}

function showImages(images: { default: ImageData; custom: ImageData }): void {
  for (const id of ["default", "custom"] as const) {
    const canvas = $<HTMLCanvasElement>(id);
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext("2d")!.putImageData(images[id], 0, 0);
  }
}

function renderTable(rows: Row[]): void {
  const table = $("results");
  const outcome = (pass: Row["pass"]) =>
    pass === "skipped" ? "skipped" : pass ? "yes" : "NO";
  table.innerHTML = `<tr><th>Case</th><th>Expected</th><th>Compiled</th><th>FLIP mean</th><th>Pass</th></tr>${rows
    .map(
      (r, i) =>
        `<tr class="row" data-index="${i}"><td>${r.case}</td><td>${r.expected}</td><td>${r.compiled}</td><td>${r.flipMean.toFixed(4)}</td><td>${outcome(r.pass)}</td></tr>`,
    )
    .join("")}`;
  table.querySelectorAll<HTMLTableRowElement>("tr.row").forEach((tr) =>
    tr.addEventListener("click", () => {
      table.querySelector("tr.selected")?.classList.remove("selected");
      tr.classList.add("selected");
      const images = lastImages[Number(tr.dataset.index)];
      if (images) {
        showImages(images);
      }
    }),
  );
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runCustomShader };
  },
};
