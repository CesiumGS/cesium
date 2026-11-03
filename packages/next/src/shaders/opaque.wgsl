// Opaque geometry with glTF metallic-roughness PBR.
//
// Vertex pulling: every attribute is a separate stream of f32 words in the
// world's arena, located by offsets in the draw record, so meshes with
// different attribute sets share one pipeline. The draw item (a record, or
// one instance of an instanced record) arrives as an instance-step vertex
// attribute read from the batch's slice of the compacted item list.
//
// Lighting (camera-relative world space, Earth-fixed axes): a directional sun
// plus image-based lighting. The BRDF follows the glTF reference and the
// formulation CesiumJS 1.x uses: GGX distribution, height-correlated Smith
// visibility, Schlick Fresnel, Lambert diffuse; IBL uses SH irradiance, a
// GGX-prefiltered specular cube and Fdez-Agüera multiple scattering.

const PI: f32 = 3.14159265358979;

struct AerialPerspective {
  inscatter: vec3f,
  transmittance: vec3f,
};

// The air between the camera and a fragment: from the view's volume at the
// fragment's screen position and its distance (slices spaced quadratically
// between aerialStart and aerialEnd, the same for every ray).
fn aerialPerspective(fragment: vec2f, relPosition: vec3f) -> AerialPerspective {
  let distance = length(relPosition) / 1000.0;
  let w = sqrt(clamp((distance - view.aerialStart) / max(view.aerialEnd - view.aerialStart, 1e-6), 0.0, 1.0));
  // A slice's texel center, w = (slice + 0.5) / 128, holds the integral to
  // its distance; before the first, fade in from none.
  let uvw = vec3f(fragment * view.viewport.zw, w);
  let near = clamp(w * 256.0, 0.0, 1.0);
  let inscatter = textureSampleLevel(aerialInscatter, environmentSampler, uvw, 0.0).rgb;
  let transmittance = textureSampleLevel(aerialTransmittance, environmentSampler, uvw, 0.0).rgb;
  return AerialPerspective(inscatter * near, mix(vec3f(1.0), transmittance, near));
}

// The air between the camera and a vertex, marched along its own ray (from
// high up, where the volume's rays are too far apart near the ground:
// atmosphere/Sky.ts `MARCH_FROM`). The volume's march, per vertex, as 1.x
// lights distant ground atmosphere: the haze varies smoothly across a
// triangle, and vertices are a fraction of the pixels (per pixel it cost
// 4.5 ms at 2.6 megapixels). Both groups of four wavelengths at once,
// through the planet's sphere at its surface's air, steps packed toward the
// vertex (the air thickens toward the ground, where a ray from above ends).
const AIR_STEPS = 24;

fn airTransmittanceUv(r: f32, mu: f32, bottom: f32, top: f32) -> vec2f {
  let h = sqrt(top * top - bottom * bottom);
  let rho = sqrt(max(0.0, r * r - bottom * bottom));
  let disc = r * r * (mu * mu - 1.0) + top * top;
  let d = max(0.0, -r * mu + sqrt(max(disc, 0.0)));
  let dMin = top - r;
  let dMax = rho + h;
  let x = vec2f((d - dMin) / (dMax - dMin), rho / h);
  return vec2f(0.5 / 256.0 + x.x * (1.0 - 1.0 / 256.0), 0.5 / 64.0 + x.y * (1.0 - 1.0 / 64.0));
}

fn aerialMarch(relPosition: vec3f) -> AerialPerspective {
  let a = air.groups[0];
  let b = air.groups[1];
  let bottom = a.bottomRadius;
  let top = a.topRadius;
  let clearAir = AerialPerspective(vec3f(0.0), vec3f(1.0));
  let meters = length(relPosition);
  let direction = relPosition / max(meters, 1e-6);
  let origin = view.aerialOrigin.xyz;
  let r = length(origin);
  let mu = dot(origin, direction) / r;
  // From above, where the ray enters the atmosphere.
  var start = 0.0;
  if (r > top) {
    let disc = r * r * (mu * mu - 1.0) + top * top;
    if (disc < 0.0) {
      return clearAir;
    }
    start = max(-r * mu - sqrt(disc), 0.0);
  }
  let end = meters / 1000.0;
  if (end <= start) {
    return clearAir;
  }
  let sun = view.sunDirection.xyz;
  let nu = dot(direction, sun);
  let phaseR = 3.0 / (16.0 * PI) * (1.0 + nu * nu);
  let g = a.miePhaseG;
  let phaseM = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g) * (1.0 + nu * nu) / pow(1.0 + g * g - 2.0 * g * nu, 1.5);
  var radianceA = vec4f(0.0);
  var radianceB = vec4f(0.0);
  var transmittanceA = vec4f(1.0);
  var transmittanceB = vec4f(1.0);
  var t0 = start;
  for (var i = 1; i <= AIR_STEPS; i++) {
    let u = 1.0 - f32(i) / f32(AIR_STEPS);
    let t1 = start + (end - start) * (1.0 - u * u * u);
    let dt = t1 - t0;
    let p = origin + direction * (0.5 * (t0 + t1));
    t0 = t1;
    let rp = max(length(p), bottom + 1e-3);
    let muSun = dot(p, sun) / rp;
    let h = rp - bottom;
    let rayleighDensity = exp(-h / a.rayleighScaleHeight);
    let mieDensity = exp(-h / a.mieScaleHeight);
    let ozoneDensity = select(clamp(-h / 15.0 + 8.0 / 3.0, 0.0, 1.0), clamp(h / 15.0 - 2.0 / 3.0, 0.0, 1.0), h < 25.0);
    // In the planet's shadow, no sunlight (its disk a point).
    let shadowed = muSun < 0.0 && rp * rp * (muSun * muSun - 1.0) + bottom * bottom >= 0.0;
    let uv = airTransmittanceUv(rp, muSun, bottom, top);
    let lit = select(1.0, 0.0, shadowed);
    let sunA = textureSampleLevel(airTransmittance, environmentSampler, uv, 0, 0.0) * lit;
    let sunB = textureSampleLevel(airTransmittance, environmentSampler, uv, 1, 0.0) * lit;
    let msUv = vec2f(
      0.5 / 32.0 + (muSun * 0.5 + 0.5) * (1.0 - 1.0 / 32.0),
      0.5 / 32.0 + clamp(h / (top - bottom), 0.0, 1.0) * (1.0 - 1.0 / 32.0),
    );
    let msA = textureSampleLevel(airMultipleScattering, environmentSampler, msUv, 0, 0.0);
    let msB = textureSampleLevel(airMultipleScattering, environmentSampler, msUv, 1, 0.0);
    {
      let rayleigh = a.rayleighScattering * rayleighDensity;
      let mie = a.mieScattering * mieDensity;
      let extinction = rayleigh + a.mieExtinction * mieDensity + a.ozoneAbsorption * ozoneDensity;
      let scattered = (rayleigh * phaseR + mie * phaseM) * sunA + (rayleigh + mie) * msA;
      let segment = exp(-extinction * dt);
      radianceA += transmittanceA * scattered * (1.0 - segment) / max(extinction, vec4f(1e-9));
      transmittanceA *= segment;
    }
    {
      let rayleigh = b.rayleighScattering * rayleighDensity;
      let mie = b.mieScattering * mieDensity;
      let extinction = rayleigh + b.mieExtinction * mieDensity + b.ozoneAbsorption * ozoneDensity;
      let scattered = (rayleigh * phaseR + mie * phaseM) * sunB + (rayleigh + mie) * msB;
      let segment = exp(-extinction * dt);
      radianceB += transmittanceB * scattered * (1.0 - segment) / max(extinction, vec4f(1e-9));
      transmittanceB *= segment;
    }
  }
  // In linear sRGB by the bands' weights, pre-exposed like the volume;
  // transmittance each channel's bands weighted by their color.
  let w = air.weights;
  let la = radianceA * a.solarIrradiance;
  let lb = radianceB * b.solarIrradiance;
  let inscatter = la.x * w[0].xyz + la.y * w[1].xyz + la.z * w[2].xyz + la.w * w[3].xyz
    + lb.x * w[4].xyz + lb.y * w[5].xyz + lb.z * w[6].xyz + lb.w * w[7].xyz;
  let total = w[0].xyz + w[1].xyz + w[2].xyz + w[3].xyz + w[4].xyz + w[5].xyz + w[6].xyz + w[7].xyz;
  let transmittance = (transmittanceA.x * w[0].xyz + transmittanceA.y * w[1].xyz
    + transmittanceA.z * w[2].xyz + transmittanceA.w * w[3].xyz
    + transmittanceB.x * w[4].xyz + transmittanceB.y * w[5].xyz
    + transmittanceB.z * w[6].xyz + transmittanceB.w * w[7].xyz) / total;
  return AerialPerspective(inscatter * view.exposure, transmittance);
}

// The sun's illuminance at a camera-relative position: white and uniform
// (`view.sunIlluminance`), or through the body's atmosphere from the
// sun-light table, at the point's height above the body's ellipsoid and the
// sun's angle to its normal (the table's mapping: sky.wgsl
// `sunLightFragment`).
fn sunIlluminance(relPosition: vec3f) -> vec3f {
  if (view.sunLight.z < 0.5) {
    return vec3f(view.sunIlluminance);
  }
  let p = relPosition + view.cameraHi + view.cameraLo;
  let radii = view.bodyRadii.xyz;
  let distance = length(p);
  let height = (distance - distance / length(p / radii)) / 1000.0;
  let up = normalize(p / (radii * radii));
  let mu = dot(up, view.sunDirection.xyz);
  let bottom = view.sunLight.x;
  let top = view.sunLight.y;
  let size = vec2f(256.0, 64.0);
  let unit = vec2f(
    0.5 + 0.5 * sign(mu) * sqrt(abs(mu)),
    sqrt(clamp(height / (top - bottom), 0.0, 1.0)),
  );
  let uv = (0.5 + unit * (size - 1.0)) / size;
  let light = textureSampleLevel(sunLightTable, environmentSampler, uv, 0.0).rgb;
  return light * (1e5 * view.sunIlluminance);
}

@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var specularEnvironment: texture_cube<f32>;
@group(0) @binding(2) var environmentSampler: sampler;
@group(0) @binding(3) var brdfLut: texture_2d<f32>;
// The sun's illuminance through the atmosphere by altitude and sun angle
// (atmosphere/sky.wgsl `sunLightFragment`).
@group(0) @binding(5) var sunLightTable: texture_2d<f32>;
// Diffuse irradiance E/π by normal (gpu/Environment.ts).
@group(0) @binding(6) var irradianceCube: texture_cube<f32>;
// Aerial perspective: in-scattered light (cd/m²) and transmittance by
// screen position and distance (atmosphere/sky.wgsl `aerialCompute`).
@group(0) @binding(7) var aerialInscatter: texture_3d<f32>;
@group(0) @binding(8) var aerialTransmittance: texture_3d<f32>;
// The air for marching aerial perspective per pixel (atmosphere/Sky.ts
// `buildAir`): both groups' parameters (atmosphere.wgsl `Atmosphere`) and
// the bands' weights to linear sRGB, and their tables, a layer per group.
struct AirGroup {
  rayleighScattering: vec4f,
  mieScattering: vec4f,
  mieExtinction: vec4f,
  ozoneAbsorption: vec4f,
  solarIrradiance: vec4f,
  bottomRadius: f32,
  topRadius: f32,
  rayleighScaleHeight: f32,
  mieScaleHeight: f32,
  miePhaseG: f32,
  groundAlbedo: f32,
  _pad0: f32,
  _pad1: f32,
};
struct Air {
  groups: array<AirGroup, 2>,
  weights: array<vec4f, 8>,
};
@group(0) @binding(9) var<uniform> air: Air;
@group(0) @binding(10) var airTransmittance: texture_2d_array<f32>;
@group(0) @binding(11) var airMultipleScattering: texture_2d_array<f32>;

@group(1) @binding(0) var<storage, read> records: array<DrawRecord>;
@group(1) @binding(1) var<storage, read> items: array<DrawItem>;
@group(1) @binding(2) var<storage, read> vertices: array<f32>;
@group(1) @binding(3) var<storage, read> materials: array<Material>;
// Mixed-LOD clip boxes: per box, center hi and lo (Earth-fixed) and three
// rows mapping an offset from the center to box coordinates in [-1, 1].
@group(1) @binding(4) var<storage, read> clipBoxes: array<vec4f>;
// Globe imagery: one slice per terrain tile, composited (GlobeImagery).
@group(1) @binding(5) var imagery: texture_2d_array<f32>;
@group(1) @binding(6) var imagerySampler: sampler;
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
  // Aerial perspective marched per vertex (`aerialMarch`), pre-exposed
  // in-scatter and transmittance; unused where the view reads the volume.
  @location(7) airInscatter: vec3f,
  @location(8) airTransmittance: vec3f,
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
fn vs(@builtin(vertex_index) vertexIndex: u32, @location(0) item: u32) -> VsOut {
  let p = items[item];
  let draw = p.record;
  let r = records[draw];
  let m = p.relModel;
  var out: VsOut;
  var normal = vec3f(0.0, 0.0, 1.0);
  if (r.normalOffset != NO_STREAM) {
    normal = read3(r.normalOffset, vertexIndex);
  }
  out.uv = vec2f(0.0);
  if (r.uvOffset != NO_STREAM) {
    out.uv = read2(r.uvOffset, vertexIndex);
  }
  out.color = unpack4x8unorm(p.tint);
  if (r.colorOffset != NO_STREAM) {
    out.color *= read4(r.colorOffset, vertexIndex);
  }
  out.tangent = vec4f(0.0);
  if (r.tangentOffset != NO_STREAM) {
    let t = read4(r.tangentOffset, vertexIndex);
    out.tangent = vec4f(normalize((m * vec4f(t.xyz, 0.0)).xyz), t.w);
  }
  let world = m * vec4f(read3(r.positionOffset, vertexIndex), 1.0);
  out.relPosition = world.xyz;
  out.position = view.viewProj * world;
  out.airInscatter = vec3f(0.0);
  out.airTransmittance = vec3f(1.0);
  if (view.sunLight.w > 0.5 && view.aerialOrigin.w > 0.0) {
    let air = aerialMarch(world.xyz);
    out.airInscatter = air.inscatter;
    out.airTransmittance = air.transmittance;
  }
  // Underlay (the bare ellipsoid): behind all other content (UNDERLAY_DEPTH
  // in layout.ts).
  if ((r.flags & 8u) != 0u) {
    out.position.z *= 5.421010862427522e-20;
  }
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
  // An instance with its own feature ID is one feature.
  out.feature = r.featureId;
  if (p.feature != 0u) {
    out.feature = p.feature;
  } else if (r.featureIdOffset != NO_STREAM) {
    let local = bitcast<u32>(vertices[r.featureIdOffset + vertexIndex]);
    out.feature = select(r.featureId + local, 0u, local == 0xffffffffu);
  }
  return out;
}

struct FsOut {
  @location(0) color: vec4f,
  @location(1) featureId: vec2u, // (lo16, hi16): rg16uint target
  // Display-referred color (unlit), shown without tonemapping; alpha is
  // coverage. Scene-referred light goes to `color`.
  @location(2) display: vec4f,
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

// Irradiance / π by normal (environment frame), from the irradiance cube:
// the exact cosine integral of the environment (1.x evaluates SH9, which
// leaks light across a sharp horizon).
fn irradiance(n: vec3f) -> vec3f {
  return textureSampleLevel(irradianceCube, environmentSampler, n, 0.0).rgb;
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

// Texture coordinates in a globe tile's imagery slice (layout.ts
// packImagery): the slice may belong to an ancestor `up` levels above, in
// which this tile sits at (x, y). Tile v and offsets count from the south;
// slices store north at the top.
fn imageryUv(packed: u32, uv: vec2f) -> vec2f {
  let up = (packed >> 12u) & 15u;
  let offset = vec2f(f32((packed >> 16u) & 255u), f32(packed >> 24u));
  let t = (offset + uv) / f32(1u << up);
  return vec2f(t.x, 1.0 - t.y);
}

// Exact sRGB decode (imagery slices store sRGB-encoded unorm texels).
fn srgbToLinear(c: vec3f) -> vec3f {
  return select(pow((c + 0.055) / 1.055, vec3f(2.4)), c / 12.92, c <= vec3f(0.04045));
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
  let imageryPacked = r.imagerySlice;
  let imagerySample = textureSample(
    imagery,
    imagerySampler,
    imageryUv(imageryPacked, in.uv),
    max(imageryPacked & 4095u, 1u) - 1u,
  );
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
  if (imageryPacked != 0u) {
    // The draw's tint (white unless a debug view tints tiles) still applies.
    baseColor = vec4f(srgbToLinear(imagerySample.rgb), 1.0) * r.color;
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
  out.display = vec4f(0.0);
  if ((flags & 1u) != 0u || (r.flags & 2u) != 0u) {
    // Unlit color is display-referred (photographs: globe imagery,
    // photogrammetry such as Google's tiles): it goes to the display target,
    // which the present pass shows as is, as glTF's KHR_materials_unlit and
    // 1.x (HDR off by default) do. No light reaches the scene target here.
    out.color = vec4f(0.0, 0.0, 0.0, 1.0);
    out.display = vec4f(baseColor.rgb, 1.0);
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
  let direct = (diffuse + specular) * nDotL * sunIlluminance(in.relPosition) * sunVisible;

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

  // Pre-exposed (plan §4.2). Emission is display-relative: authored
  // emissive colors look the same at any exposure.
  var lit = (direct + indirect) * view.exposure;
  var shown = emissive;
  if (view.sunLight.w > 0.5) {
    // The air's light is pre-exposed in the volume. From high up it's
    // marched per vertex instead; between, both, blended.
    let march = view.aerialOrigin.w;
    var ap = AerialPerspective(vec3f(0.0), vec3f(1.0));
    if (march < 1.0) {
      ap = aerialPerspective(in.position.xy, in.relPosition);
    }
    if (march > 0.0) {
      ap = AerialPerspective(
        mix(ap.inscatter, in.airInscatter, march),
        mix(ap.transmittance, in.airTransmittance, march),
      );
    }
    lit = lit * ap.transmittance + ap.inscatter;
    shown = emissive * ap.transmittance;
  }
  // Below fp16's largest value: an overflow to infinity (a lit scene at a
  // night exposure) poisoned the exposure meter's average with NaN.
  out.color = vec4f(min(lit + shown, vec3f(60000.0)), 1.0);
  return out;
}
