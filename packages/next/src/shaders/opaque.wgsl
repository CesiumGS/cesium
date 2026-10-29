// Opaque geometry. Vertex pulling: every attribute is a separate stream of
// f32 words in the world's arena, located by offsets in the draw record, so
// meshes with different attribute sets share one pipeline. The draw index
// arrives as an instance-step vertex attribute read from the batch's slice of
// the compacted instance list.

@group(0) @binding(0) var<uniform> view: View;
@group(1) @binding(0) var<storage, read> records: array<DrawRecord>;
@group(1) @binding(1) var<storage, read> instances: array<DrawInstance>;
@group(1) @binding(2) var<storage, read> vertices: array<f32>;
@group(1) @binding(3) var<storage, read> materials: array<Material>;

@group(2) @binding(0) var baseColorTexture: texture_2d<f32>;
@group(2) @binding(1) var metallicRoughnessTexture: texture_2d<f32>;
@group(2) @binding(2) var normalTexture: texture_2d<f32>;
@group(2) @binding(3) var occlusionTexture: texture_2d<f32>;
@group(2) @binding(4) var emissiveTexture: texture_2d<f32>;
@group(2) @binding(5) var baseColorSampler: sampler;
@group(2) @binding(6) var metallicRoughnessSampler: sampler;
@group(2) @binding(7) var normalSampler: sampler;
@group(2) @binding(8) var occlusionSampler: sampler;
@group(2) @binding(9) var emissiveSampler: sampler;

struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) color: vec4f,
  @location(3) @interpolate(flat) draw: u32,
};

fn read2(offset: u32, index: u32) -> vec2f {
  let b = offset + index * 2u;
  return vec2f(vertices[b], vertices[b + 1u]);
}

fn read3(offset: u32, index: u32) -> vec3f {
  let b = offset + index * 3u;
  return vec3f(vertices[b], vertices[b + 1u], vertices[b + 2u]);
}

fn read4(offset: u32, index: u32) -> vec4f {
  let b = offset + index * 4u;
  return vec4f(vertices[b], vertices[b + 1u], vertices[b + 2u], vertices[b + 3u]);
}

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32, @location(0) draw: u32) -> VsOut {
  let r = records[draw];
  let m = instances[draw].relModel;
  var normal = vec3f(0.0, 0.0, 1.0);
  if (r.normalOffset != NO_STREAM) {
    normal = read3(r.normalOffset, vertexIndex);
  }
  var out: VsOut;
  out.position = view.viewProj * (m * vec4f(read3(r.positionOffset, vertexIndex), 1.0));
  out.normal = (m * vec4f(normal, 0.0)).xyz;
  out.uv = select(vec2f(0.0), read2(r.uvOffset, vertexIndex), r.uvOffset != NO_STREAM);
  out.color = select(vec4f(1.0), read4(r.colorOffset, vertexIndex), r.colorOffset != NO_STREAM);
  out.draw = draw;
  return out;
}

struct FsOut {
  @location(0) color: vec4f,
  @location(1) featureId: vec2u, // (lo16, hi16): rg16uint target
};

@fragment
fn fs(in: VsOut, @builtin(front_facing) frontFacing: bool) -> FsOut {
  let r = records[in.draw];
  let material = materials[r.materialIndex];

  // Sample unconditionally (uniform control flow); missing textures are bound
  // to 1×1 defaults and gated by the material flags below.
  var baseColorSample = textureSample(baseColorTexture, baseColorSampler, in.uv);
  var emissiveSample = textureSample(emissiveTexture, emissiveSampler, in.uv).rgb;
  if ((material.flags & 512u) != 0u) {
    // 1.x compatibility: gamma 2.2 decode of unorm color textures.
    baseColorSample = vec4f(pow(baseColorSample.rgb, vec3f(2.2)), baseColorSample.a);
    emissiveSample = pow(emissiveSample, vec3f(2.2));
  }

  var baseColor = material.baseColor * r.color * in.color;
  if ((material.flags & 16u) != 0u) {
    baseColor *= baseColorSample;
  }
  if ((material.flags & 4u) != 0u && baseColor.a < material.alphaCutoff) {
    discard;
  }
  var emissive = material.emissive;
  if ((material.flags & 256u) != 0u) {
    emissive *= emissiveSample;
  }

  var n = normalize(in.normal);
  if (!frontFacing) {
    n = -n;
  }
  // Placeholder lighting until the 1.x PBR/IBL port: sun at intensity 2
  // (the 1.x default) plus a flat ambient term.
  let diffuse = max(dot(n, view.sunDirection.xyz), 0.0);
  let lit = baseColor.rgb * (0.12 + 2.0 * diffuse) + emissive;
  let unlit = (material.flags & 1u) != 0u || (r.flags & 2u) != 0u;

  var out: FsOut;
  out.color = vec4f(select(lit, baseColor.rgb, unlit), 1.0);
  out.featureId = vec2u(r.featureId & 0xffffu, r.featureId >> 16u);
  return out;
}
