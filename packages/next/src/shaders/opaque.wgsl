// Opaque geometry with glTF metallic-roughness PBR.
//
// Vertex pulling: every attribute is a separate stream of f32 words in the
// world's arena, located by offsets in the draw record, so meshes with
// different attribute sets share one pipeline. The draw index arrives as an
// instance-step vertex attribute read from the batch's slice of the
// compacted instance list.
//
// Lighting (camera-relative world space, Earth-fixed axes): a directional sun
// plus image-based lighting. The BRDF follows the glTF reference and the
// formulation CesiumJS 1.x uses: GGX distribution, height-correlated Smith
// visibility, Schlick Fresnel, Lambert diffuse; IBL uses SH irradiance, a
// GGX-prefiltered specular cube and Fdez-Agüera multiple scattering.

const PI: f32 = 3.14159265358979;

@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var specularEnvironment: texture_cube<f32>;
@group(0) @binding(2) var environmentSampler: sampler;
@group(0) @binding(3) var brdfLut: texture_2d<f32>;
@group(0) @binding(4) var<uniform> irradianceSh: array<vec4f, 9>;

@group(1) @binding(0) var<storage, read> records: array<DrawRecord>;
@group(1) @binding(1) var<storage, read> instances: array<DrawInstance>;
@group(1) @binding(2) var<storage, read> vertices: array<f32>;
@group(1) @binding(3) var<storage, read> materials: array<Material>;
// Mixed-LOD clip boxes: per box, center hi and lo (Earth-fixed) and three
// rows mapping an offset from the center to box coordinates in [-1, 1].
@group(1) @binding(4) var<storage, read> clipBoxes: array<vec4f>;
const CLIP_BOXES: u32 = 8u;

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
  @location(4) relPosition: vec3f, // camera-relative world position
  @location(5) tangent: vec4f,     // xyz world tangent, w handedness; w = 0: none
  @location(6) @interpolate(flat) feature: u32, // global feature ID, 0 = none
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
  var out: VsOut;
  var normal = vec3f(0.0, 0.0, 1.0);
  if (r.normalOffset != NO_STREAM) {
    normal = read3(r.normalOffset, vertexIndex);
  }
  out.uv = vec2f(0.0);
  if (r.uvOffset != NO_STREAM) {
    out.uv = read2(r.uvOffset, vertexIndex);
  }
  out.color = vec4f(1.0);
  if (r.colorOffset != NO_STREAM) {
    out.color = read4(r.colorOffset, vertexIndex);
  }
  out.tangent = vec4f(0.0);
  if (r.tangentOffset != NO_STREAM) {
    let t = read4(r.tangentOffset, vertexIndex);
    out.tangent = vec4f(normalize((m * vec4f(t.xyz, 0.0)).xyz), t.w);
  }
  let world = m * vec4f(read3(r.positionOffset, vertexIndex), 1.0);
  out.relPosition = world.xyz;
  out.position = view.viewProj * world;
  // Normals transform by the inverse transpose; the cofactor matrix is that up
  // to the determinant, whose sign keeps mirrored transforms facing outward.
  // (Quantized glTF often carries a non-uniform dequantization scale.)
  let c0 = m[0].xyz;
  let c1 = m[1].xyz;
  let c2 = m[2].xyz;
  let det = dot(c0, cross(c1, c2));
  // Normalize before interpolation: under non-uniform scale the transformed
  // lengths vary with direction and would skew the interpolated normal.
  out.normal = normalize(cross(c1, c2) * normal.x + cross(c2, c0) * normal.y + cross(c0, c1) * normal.z) * sign(det);
  out.draw = draw;
  // Per-vertex feature IDs (CAD elements, buildings) are local to the draw;
  // its first global ID offsets them. Flat interpolation takes the provoking
  // vertex: feature IDs are constant across a triangle.
  out.feature = r.featureId;
  if (r.featureIdOffset != NO_STREAM) {
    let local = bitcast<u32>(vertices[r.featureIdOffset + vertexIndex]);
    out.feature = select(r.featureId + local, 0u, local == 0xffffffffu);
  }
  return out;
}

struct FsOut {
  @location(0) color: vec4f,
  @location(1) featureId: vec2u, // (lo16, hi16): rg16uint target
};

fn fresnelSchlick(f0: vec3f, f90: vec3f, cosTheta: f32) -> vec3f {
  let x = 1.0 - cosTheta;
  let x2 = x * x;
  return f0 + (f90 - f0) * x2 * x2 * x;
}

fn smithVisibility(alpha: f32, nDotL: f32, nDotV: f32) -> f32 {
  let a2 = alpha * alpha;
  let ggxV = nDotL * sqrt(nDotV * nDotV * (1.0 - a2) + a2);
  let ggxL = nDotV * sqrt(nDotL * nDotL * (1.0 - a2) + a2);
  let sum = ggxV + ggxL;
  return select(0.0, 0.5 / sum, sum > 0.0);
}

fn ggx(alpha: f32, nDotH: f32) -> f32 {
  let a2 = alpha * alpha;
  let f = (nDotH * a2 - nDotH) * nDotH + 1.0;
  return a2 / (PI * f * f);
}

/** Irradiance / π from SH9 (environment frame), as czm_sphericalHarmonics. */
fn irradiance(n: vec3f) -> vec3f {
  let x = n.x;
  let y = n.y;
  let z = n.z;
  let e = irradianceSh[0].rgb
    + irradianceSh[1].rgb * y
    + irradianceSh[2].rgb * z
    + irradianceSh[3].rgb * x
    + irradianceSh[4].rgb * (x * y)
    + irradianceSh[5].rgb * (y * z)
    + irradianceSh[6].rgb * (3.0 * z * z - 1.0)
    + irradianceSh[7].rgb * (z * x)
    + irradianceSh[8].rgb * (x * x - y * y);
  return max(e, vec3f(0.0));
}

fn toEnvironment(d: vec3f) -> vec3f {
  return vec3f(
    dot(d, view.iblFrame[0].xyz),
    dot(d, view.iblFrame[1].xyz),
    dot(d, view.iblFrame[2].xyz),
  );
}

fn insideClipBoxes(block: u32, count: u32, p: vec3f) -> bool {
  for (var i = 0u; i < count; i++) {
    let b = (block * CLIP_BOXES + i) * 5u;
    let d = p - ((clipBoxes[b].xyz - view.cameraHi) + (clipBoxes[b + 1u].xyz - view.cameraLo));
    let u = abs(vec3f(
      dot(clipBoxes[b + 2u].xyz, d),
      dot(clipBoxes[b + 3u].xyz, d),
      dot(clipBoxes[b + 4u].xyz, d),
    ));
    if (max(u.x, max(u.y, u.z)) <= 1.0) {
      return true;
    }
  }
  return false;
}

@fragment
fn fs(in: VsOut, @builtin(front_facing) frontFacing: bool) -> FsOut {
  let r = records[in.draw];
  let material = materials[r.materialIndex];
  let flags = material.flags;

  // Everything that needs uniform control flow first: texture samples and
  // derivatives. Missing textures are 1×1 white defaults gated by the flags.
  var baseColorSample = textureSample(baseColorTexture, baseColorSampler, in.uv);
  var emissiveSample = textureSample(emissiveTexture, emissiveSampler, in.uv).rgb;
  let metallicRoughnessSample = textureSample(metallicRoughnessTexture, metallicRoughnessSampler, in.uv);
  let normalSample = textureSample(normalTexture, normalSampler, in.uv).xyz;
  let occlusionSample = textureSample(occlusionTexture, occlusionSampler, in.uv).r;
  let dPdx = dpdx(in.relPosition);
  let dPdy = dpdy(in.relPosition);
  let dUVdx = dpdx(in.uv);
  let dUVdy = dpdy(in.uv);

  if ((flags & 512u) != 0u) {
    // 1.x compatibility diagnostic: gamma 2.2 decode of unorm color textures.
    baseColorSample = vec4f(pow(baseColorSample.rgb, vec3f(2.2)), baseColorSample.a);
    emissiveSample = pow(emissiveSample, vec3f(2.2));
  }

  var baseColor = material.baseColor * r.color * in.color;
  if ((flags & 16u) != 0u) {
    baseColor *= baseColorSample;
  }
  if ((flags & 4u) != 0u && baseColor.a < material.alphaCutoff) {
    discard;
  }
  // Mixed-LOD placeholder: a coarse tile fills only the volumes of its
  // missing finer descendants, at its true depth (plan §13.1).
  if ((r.placeholderMask & view.viewBit) != 0u &&
      !insideClipBoxes(r.clipBlock, r.clipCount, in.relPosition)) {
    discard;
  }
  var emissive = material.emissive;
  if ((flags & 256u) != 0u) {
    emissive *= emissiveSample;
  }

  var out: FsOut;
  out.featureId = vec2u(in.feature & 0xffffu, in.feature >> 16u);
  if ((flags & 1u) != 0u || (r.flags & 2u) != 0u) {
    out.color = vec4f(baseColor.rgb, 1.0);
    return out;
  }

  var metallic = material.metallic;
  var roughness = material.roughness;
  if ((flags & 32u) != 0u) {
    roughness *= metallicRoughnessSample.g;
    metallic *= metallicRoughnessSample.b;
  }
  metallic = clamp(metallic, 0.0, 1.0);
  roughness = clamp(roughness, 0.0, 1.0);

  // Shading normal.
  var n = normalize(in.normal);
  if (!frontFacing) {
    n = -n;
  }
  if ((flags & 64u) != 0u) {
    var t: vec3f;
    var b: vec3f;
    if (in.tangent.w != 0.0) {
      t = normalize(in.tangent.xyz - n * dot(n, in.tangent.xyz));
      b = cross(n, t) * in.tangent.w;
    } else {
      // Cotangent frame from screen-space derivatives (no TANGENT attribute).
      let dp2perp = cross(dPdy, n);
      let dp1perp = cross(n, dPdx);
      let tt = dp2perp * dUVdx.x + dp1perp * dUVdy.x;
      let bb = dp2perp * dUVdx.y + dp1perp * dUVdy.y;
      let invMax = inverseSqrt(max(dot(tt, tt), dot(bb, bb)) + 1e-20);
      t = tt * invMax;
      b = bb * invMax;
    }
    let tsNormal = (normalSample * 2.0 - 1.0) * vec3f(material.normalScale, material.normalScale, 1.0);
    n = normalize(t * tsNormal.x + b * tsNormal.y + n * tsNormal.z);
  }

  let v = -normalize(in.relPosition);
  let l = normalize(view.sunDirection.xyz);
  let nDotV = clamp(dot(n, v), 0.0, 1.0);
  let f0 = mix(vec3f(0.04), baseColor.rgb, metallic);
  let diffuseColor = baseColor.rgb * (1.0 - metallic);
  let alpha = roughness * roughness;

  // Direct sun light.
  let h = normalize(v + l);
  let nDotL = clamp(dot(n, l), 0.001, 1.0);
  let vDotH = clamp(dot(v, h), 0.0, 1.0);
  let nDotH = clamp(dot(n, h), 0.0, 1.0);
  let f90 = vec3f(clamp(max(f0.r, max(f0.g, f0.b)) * 25.0, 0.0, 1.0));
  let fresnel = fresnelSchlick(f0, f90, vDotH);
  let specular = fresnel * smithVisibility(alpha, nDotL, nDotV) * ggx(alpha, nDotH);
  let diffuse = (1.0 - fresnel) * diffuseColor / PI;
  // 1.x clamps n·l to at least 0.001, which lets a little sun light reach
  // surfaces facing away from it; 2.0 gives them none.
  let sunVisible = select(0.0, 1.0, dot(n, l) > 0.0);
  let direct = (diffuse + specular) * nDotL * view.sunIntensity * sunVisible;

  // Image-based lighting (Fdez-Agüera 2019 multiple scattering).
  let lut = textureSampleLevel(brdfLut, environmentSampler, vec2f(nDotV, roughness), 0.0).rg;
  let iblF90 = max(vec3f(1.0 - roughness), f0);
  let fss = fresnelSchlick(f0, iblF90, nDotV);
  let fssEss = fss * lut.x + lut.y;
  let ems = 1.0 - lut.x - lut.y;
  let averageF = f0 + (1.0 - f0) / 21.0;
  let fmsEms = fssEss * averageF * ems / (1.0 - averageF * ems);
  let diffuseIbl = irradiance(toEnvironment(n)) * (fmsEms + (1.0 - fssEss - fmsEms) * diffuseColor);
  let reflected = toEnvironment(reflect(-v, n));
  let radiance = textureSampleLevel(specularEnvironment, environmentSampler, reflected, roughness * view.specularMaxLod).rgb;
  let specularIbl = radiance * fssEss;
  var occlusion = 1.0;
  if ((flags & 128u) != 0u) {
    occlusion = 1.0 + material.occlusionStrength * (occlusionSample - 1.0);
  }
  let indirect = (diffuseIbl * view.diffuseIbl + specularIbl * view.specularIbl) * occlusion;

  out.color = vec4f(direct + indirect + emissive, 1.0);
  return out;
}
