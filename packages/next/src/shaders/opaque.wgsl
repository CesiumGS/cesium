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
// steps packed toward the vertex (the air thickens toward the ground, where
// a ray from above ends).
//
// Each step's air is at its height above the body's ellipsoid and its sun
// angle to the ellipsoid's normal, as the ground's sunlight
// (`sunlightThroughAir`): the volume's sphere, placed to meet the ellipsoid
// under the camera, is up to 20 km off it across the globe, so from orbit
// the haze thinned and thickened as the camera moved and stayed sunlit past
// where the ground went dark. Below the ellipsoid, its surface's air.
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

// How much of a light at zenith cosine `mu` stands above the planet's
// horizon from radius `r`: its elevation above the horizon over a `soft`
// angle (radians). The Earth's shadow in the air is soft over about a
// degree (the sun's disk, refraction near the horizon), and a step of the
// march spans more from high up: a hard test drew a ladder of stripes
// across the day/night line, neighbouring rays' steps crossing it apart.
fn sunAbove(r: f32, mu: f32, bottom: f32, soft: f32) -> f32 {
  let horizon = -sqrt(max(0.0, 1.0 - (bottom / r) * (bottom / r)));
  let above = asin(clamp(mu, -1.0, 1.0)) - asin(horizon);
  return clamp(0.5 + above / soft, 0.0, 1.0);
}

fn aerialMarch(relPosition: vec3f) -> AerialPerspective {
  let a = air.groups[0];
  let b = air.groups[1];
  let bottom = a.bottomRadius;
  let top = a.topRadius;
  let clearAir = AerialPerspective(vec3f(0.0), vec3f(1.0));
  let meters = length(relPosition);
  let direction = relPosition / max(meters, 1e-6);
  let radii = view.bodyRadii.xyz / 1000.0;
  let origin = (view.cameraHi + view.cameraLo) / 1000.0;
  let r = length(origin);
  let mu = dot(origin, direction) / r;
  // From above, where the ray enters the atmosphere (over the ellipsoid's
  // widest).
  let outer = max(radii.x, max(radii.y, radii.z)) + top - bottom;
  var start = 0.0;
  if (r > outer) {
    let disc = r * r * (mu * mu - 1.0) + outer * outer;
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
  let g = a.miePhaseG;
  let phaseR = 3.0 / (16.0 * PI) * (1.0 + nu * nu);
  let phaseM = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g) * (1.0 + nu * nu) / pow(1.0 + g * g - 2.0 * g * nu, 1.5);
  // By night the Moon's light too (its share in `sunDirection.w`).
  let moonShare = view.sunDirection.w;
  let moon = view.moonLight.xyz;
  let moonNu = dot(direction, moon);
  let moonPhaseR = 3.0 / (16.0 * PI) * (1.0 + moonNu * moonNu) * moonShare;
  let moonPhaseM = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g) * (1.0 + moonNu * moonNu) / pow(1.0 + g * g - 2.0 * g * moonNu, 1.5) * moonShare;
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
    let distance = length(p);
    let h = max(distance - distance / length(p / radii), 1e-3);
    let rp = bottom + h;
    let muSun = dot(normalize(p / (radii * radii)), sun);
    let rayleighDensity = exp(-h / a.rayleighScaleHeight);
    let mieDensity = exp(-h / a.mieScaleHeight);
    let ozoneDensity = select(clamp(-h / 15.0 + 8.0 / 3.0, 0.0, 1.0), clamp(h / 15.0 - 2.0 / 3.0, 0.0, 1.0), h < 25.0);
    // In the planet's shadow, no sunlight, its edge soft (`sunAbove`).
    let soft = max(0.0175, dt / rp);
    let uv = airTransmittanceUv(rp, muSun, bottom, top);
    let lit = sunAbove(rp, muSun, bottom, soft);
    let sunA = textureSampleLevel(airTransmittance, environmentSampler, uv, 0, 0.0) * lit;
    let sunB = textureSampleLevel(airTransmittance, environmentSampler, uv, 1, 0.0) * lit;
    let msUv = vec2f(
      0.5 / 32.0 + (muSun * 0.5 + 0.5) * (1.0 - 1.0 / 32.0),
      0.5 / 32.0 + clamp(h / (top - bottom), 0.0, 1.0) * (1.0 - 1.0 / 32.0),
    );
    let msA = textureSampleLevel(airMultipleScattering, environmentSampler, msUv, 0, 0.0);
    let msB = textureSampleLevel(airMultipleScattering, environmentSampler, msUv, 1, 0.0);
    var moonA = vec4f(0.0);
    var moonB = vec4f(0.0);
    var moonMsA = vec4f(0.0);
    var moonMsB = vec4f(0.0);
    if (moonShare > 0.0) {
      let muMoon = dot(normalize(p / (radii * radii)), moon);

      let moonUv = airTransmittanceUv(rp, muMoon, bottom, top);
      let moonLit = sunAbove(rp, muMoon, bottom, soft);
      moonA = textureSampleLevel(airTransmittance, environmentSampler, moonUv, 0, 0.0) * moonLit;
      moonB = textureSampleLevel(airTransmittance, environmentSampler, moonUv, 1, 0.0) * moonLit;
      let moonMsUv = vec2f(
        0.5 / 32.0 + (muMoon * 0.5 + 0.5) * (1.0 - 1.0 / 32.0),
        msUv.y,
      );
      moonMsA = textureSampleLevel(airMultipleScattering, environmentSampler, moonMsUv, 0, 0.0) * moonShare;
      moonMsB = textureSampleLevel(airMultipleScattering, environmentSampler, moonMsUv, 1, 0.0) * moonShare;
    }
    {
      let rayleigh = a.rayleighScattering * rayleighDensity;
      let mie = a.mieScattering * mieDensity;
      let extinction = rayleigh + a.mieExtinction * mieDensity + a.ozoneAbsorption * ozoneDensity;
      let scattered = (rayleigh * phaseR + mie * phaseM) * sunA + (rayleigh + mie) * msA
        + (rayleigh * moonPhaseR + mie * moonPhaseM) * moonA + (rayleigh + mie) * moonMsA;
      let segment = exp(-extinction * dt);
      radianceA += transmittanceA * scattered * (1.0 - segment) / max(extinction, vec4f(1e-9));
      transmittanceA *= segment;
    }
    {
      let rayleigh = b.rayleighScattering * rayleighDensity;
      let mie = b.mieScattering * mieDensity;
      let extinction = rayleigh + b.mieExtinction * mieDensity + b.ozoneAbsorption * ozoneDensity;
      let scattered = (rayleigh * phaseR + mie * phaseM) * sunB + (rayleigh + mie) * msB
        + (rayleigh * moonPhaseR + mie * moonPhaseM) * moonB + (rayleigh + mie) * moonMsB;
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
  return sunlightThroughAir(relPosition, view.sunDirection.xyz);
}

// The sun's light through the atmosphere arriving from `direction` (the
// sun-light table): the sun's own, or the Moon's color and dimming.
fn sunlightThroughAir(relPosition: vec3f, direction: vec3f) -> vec3f {
  let p = relPosition + view.cameraHi + view.cameraLo;
  let radii = view.bodyRadii.xyz;
  let distance = length(p);
  let height = (distance - distance / length(p / radii)) / 1000.0;
  let up = normalize(p / (radii * radii));
  let mu = dot(up, direction);
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
// The night lights: light the surface emits (GlobeImagery "lights").
@group(1) @binding(7) var lightsImagery: texture_2d_array<f32>;

// The night image's brightest white, cd/m² as seen from above (a city's
// lamps averaged over the image's half-kilometer texels): VIIRS's
// day-night band saturates near 100 nW/cm²/sr in city centers, about 0.3
// cd/m² for their spectrum. Below `CITY_LIGHTS_FLOOR` (linear), the
// image's own dark background, none.
const CITY_LIGHTS_LUMINANCE = 0.3;
const CITY_LIGHTS_FLOOR = 0.004;
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
// EXT_structural_metadata property textures (layout.ts PROPERTY_TEXTURES).
@group(2) @binding(20) var propertyTexture0: texture_2d<f32>;
@group(2) @binding(21) var propertyTexture1: texture_2d<f32>;

struct VsOut {
  // Invariant: the opaque pass's depth (`vsDepth`) and its shading (`vs`)
  // must agree to the bit (the shading tests for equal depth).
  @builtin(position) @invariant position: vec4f,
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
  @location(9) positionMC: vec3f,  // the mesh's own (model) coordinates
  // The instance among the draw's (custom shaders' `instance` values).
  @location(14) @interpolate(flat) instanceIndex: u32,
  // A custom shader's named attributes and metadata, from location 10
  // (CustomShader.ts namedCode):
  // @named
};

// --- custom shaders (plan §3.4): the WGSL-level contract ---------------------------
//
// A custom shader (scene/CustomShader.ts) supplies `vertexMain` and
// `fragmentMain`; the engine's defaults (custom.wgsl) change nothing. They
// run in every pass that draws the content (opaque, depth, shadow,
// ambient-occlusion prepass, translucent), so a vertex modifier moves
// geometry the same way in all of them. Named as 1.x `CustomShader`'s.

// A vertex as the mesh stores it, before its transform.
struct VertexInput {
  positionMC: vec3f,
  normalMC: vec3f,
  texCoord0: vec2f,   // (0, 0) without TEXCOORD_0
  color0: vec4f,      // white without COLOR_0
  featureId0: u32,    // local feature ID; 0xffffffff: none
  vertexIndex: u32,
  instanceIndex: u32, // index among the draw's instances; 0 when not instanced
  time: f32,          // seconds since the engine started
  attributes: Attributes, // the shader's declared attributes (CustomShader)
  metadata: Metadata,     // and metadata properties; zero where absent
  instance: InstanceValues,     // and per-instance values; zero where absent
};

// What `vertexMain` may change: the vertex in model coordinates.
struct VertexOutput {
  positionMC: vec3f,
  normalMC: vec3f,
};

// A surface point as the fragment stage sees it.
struct FragmentInput {
  positionMC: vec3f,  // model coordinates, interpolated
  positionEC: vec3f,  // relative to the camera, Earth-fixed axes (m)
  positionWC: vec3f,  // Earth-fixed (float32: about a meter at the Earth's scale)
  normal: vec3f,      // geometric normal, Earth-fixed axes, toward the viewer
  texCoord0: vec2f,
  color0: vec4f,      // the vertex color times the draw's and instance's tint
  featureId: u32,     // global feature ID (the one picking returns); 0: none
  screen: vec2f,      // framebuffer pixel
  time: f32,
  attributes: Attributes, // interpolated
  metadata: Metadata,     // interpolated
  instanceIndex: u32,     // index among the draw's instances
  instance: InstanceValues,     // exact (flat)
};

// The material `fragmentMain` may change, filled with the glTF material's
// values first. Linear color; `normal` is the shading normal (Earth-fixed
// axes, normal map applied).
struct MaterialOutput {
  baseColor: vec3f,
  alpha: f32,
  metallic: f32,
  roughness: f32,
  normal: vec3f,
  occlusion: f32,
  emissive: vec3f,
  unlit: bool,
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

// A named attribute or metadata property of a vertex from its mesh's
// directory (layout.ts MeshStreams.attributes: count, then per entry the
// name's hash, stream offset and components); zero where absent.
fn readNamed(directory: u32, hash: u32, vertexIndex: u32, feature: u32) -> vec4f {
  var value = vec4f(0.0);
  if (directory == NO_STREAM) {
    return value;
  }
  let count = bitcast<u32>(vertices[directory]);
  for (var i = 0u; i < count; i++) {
    let entry = directory + 1u + i * 3u;
    if (bitcast<u32>(vertices[entry]) == hash) {
      let components = bitcast<u32>(vertices[entry + 2u]);
      // In a texture (layout.ts TEXTURE_PROPERTY): per fragment only.
      if (components >= 0x80000000u) {
        break;
      }
      // A feature table column (TABLE_PROPERTY): the vertex's feature's row.
      var row = vertexIndex;
      var size = components;
      if (components >= 0x40000000u) {
        if (feature == 0xffffffffu) {
          break;
        }
        row = feature;
        size = components & 0xffu;
      }
      let b = bitcast<u32>(vertices[entry + 1u]) + row * size;
      for (var c = 0u; c < size; c++) {
        value[c] = vertices[b + c];
      }
      break;
    }
  }
  return value;
}

// A named field of an instance's streams (`InstanceOptions.streams.layout`)
// as raw bits, through the draw's directory (DrawRecord.instanceDirectory:
// count, then per field its name's hash, word offset and components);
// zero where absent.
fn readInstance(draw: u32, instance: u32, hash: u32) -> vec4u {
  let r = records[draw];
  var bits = vec4u(0u);
  if (r.instanceDirectory == NO_STREAM || r.instanceStreams == NO_STREAM) {
    return bits;
  }
  let count = bitcast<u32>(vertices[r.instanceDirectory]);
  for (var i = 0u; i < count; i++) {
    let entry = r.instanceDirectory + 1u + i * 3u;
    if (bitcast<u32>(vertices[entry]) == hash) {
      let b = r.instanceStreams + instance * r.instanceStride + bitcast<u32>(vertices[entry + 1u]);
      let components = min(bitcast<u32>(vertices[entry + 2u]), 4u);
      for (var c = 0u; c < components; c++) {
        bits[c] = bitcast<u32>(vertices[b + c]);
      }
      break;
    }
  }
  return bits;
}

// A property texture's texel at `uv` (repeating, nearest: the texel's
// bytes exactly), its channels as bytes.
fn propertyTexel(slot: u32, uv: vec2f) -> vec4u {
  var texel: vec4f;
  if (slot == 0u) {
    let size = textureDimensions(propertyTexture0);
    texel = textureLoad(propertyTexture0, min(vec2u(fract(uv) * vec2f(size)), size - 1u), 0);
  } else {
    let size = textureDimensions(propertyTexture1);
    texel = textureLoad(propertyTexture1, min(vec2u(fract(uv) * vec2f(size)), size - 1u), 0);
  }
  return vec4u(round(texel * 255.0));
}

// A metadata property per fragment: from a property texture, or a feature
// table column at the fragment's feature (`feature`, local), else
// `fallback` (the interpolated attribute's, or zero).
//
// In a property texture (World.addMesh's block: slot,
// channel count, channels, component type, components, normalized, offset,
// scale): its bytes from the texel's channels, little-endian per
// component, as the component type, normalized, then offset and scaled;
// `fallback` where the mesh's directory has it otherwise or not at all.
fn readFragmentProperty(directory: u32, hash: u32, uv: vec2f, feature: u32, fallback: vec4f) -> vec4f {
  if (directory == NO_STREAM) {
    return fallback;
  }
  let count = bitcast<u32>(vertices[directory]);
  for (var i = 0u; i < count; i++) {
    let entry = directory + 1u + i * 3u;
    if (bitcast<u32>(vertices[entry]) != hash) {
      continue;
    }
    let info = bitcast<u32>(vertices[entry + 2u]);
    if (info < 0x40000000u) {
      return fallback;
    }
    if (info < 0x80000000u) {
      // Exactly the feature's row, not interpolated.
      var value = vec4f(0.0);
      if (feature != 0xffffffffu) {
        let size = info & 0xffu;
        let row = bitcast<u32>(vertices[entry + 1u]) + feature * size;
        for (var c = 0u; c < size; c++) {
          value[c] = vertices[row + c];
        }
      }
      return value;
    }
    let b = bitcast<u32>(vertices[entry + 1u]);
    let texel = propertyTexel(bitcast<u32>(vertices[b]), uv);
    let channelCount = min(bitcast<u32>(vertices[b + 1u]), 4u);
    let channels = bitcast<u32>(vertices[b + 2u]);
    let kind = bitcast<u32>(vertices[b + 3u]);
    let components = min(bitcast<u32>(vertices[b + 4u]), 4u);
    let normalized = bitcast<u32>(vertices[b + 5u]) != 0u;
    var bytes = array<u32, 4>();
    for (var k = 0u; k < channelCount; k++) {
      bytes[k] = texel[(channels >> (k * 8u)) & 3u];
    }
    // Bytes per component: 8-, 16- or 32-bit types (COMPONENT_TYPE_CODES).
    let size = select(select(4u, 2u, kind == 2u || kind == 3u), 1u, kind <= 1u);
    var value = vec4f(0.0);
    for (var c = 0u; c < components; c++) {
      var raw = 0u;
      for (var k = 0u; k < size; k++) {
        let at = c * size + k;
        if (at < 4u) {
          raw |= bytes[at] << (k * 8u);
        }
      }
      var v: f32;
      switch kind {
        case 0u: { v = select(f32(raw), f32(raw) / 255.0, normalized); }
        case 1u: { v = f32(i32(raw << 24u) >> 24u); if (normalized) { v = max(v / 127.0, -1.0); } }
        case 2u: { v = select(f32(raw), f32(raw) / 65535.0, normalized); }
        case 3u: { v = f32(i32(raw << 16u) >> 16u); if (normalized) { v = max(v / 32767.0, -1.0); } }
        case 4u: { v = select(f32(raw), f32(raw) / 4294967295.0, normalized); }
        case 5u: { v = f32(bitcast<i32>(raw)); if (normalized) { v = max(v / 2147483647.0, -1.0); } }
        default: { v = bitcast<f32>(raw); }
      }
      value[c] = v * vertices[b + 10u + c] + vertices[b + 6u + c];
    }
    return value;
  }
  return fallback;
}

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32, @location(0) item: u32) -> VsOut {
  return vertexOut(vertexIndex, item, true);
}

// The same without the air (shadow maps: no aerial perspective there).
@vertex
fn vsDepth(@builtin(vertex_index) vertexIndex: u32, @location(0) item: u32) -> VsOut {
  return vertexOut(vertexIndex, item, false);
}

fn vertexOut(vertexIndex: u32, item: u32, withAir: bool) -> VsOut {
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
  var vertexColor = vec4f(1.0);
  if (r.colorOffset != NO_STREAM) {
    vertexColor = read4(r.colorOffset, vertexIndex);
  }
  out.color = unpack4x8unorm(p.tint) * vertexColor;
  out.tangent = vec4f(0.0);
  if (r.tangentOffset != NO_STREAM) {
    let t = read4(r.tangentOffset, vertexIndex);
    out.tangent = vec4f(normalize((m * vec4f(t.xyz, 0.0)).xyz), t.w);
  }
  var localFeature = 0xffffffffu;
  if (r.featureIdOffset != NO_STREAM) {
    localFeature = bitcast<u32>(vertices[r.featureIdOffset + vertexIndex]);
  }
  // The row of the draw's feature table this vertex reads: an instance's
  // feature (cull.wgsl makes it global), else the vertex's; a draw without
  // per-vertex IDs is feature 0 (as `out.feature` below).
  var tableFeature = select(localFeature, 0u, r.featureIdOffset == NO_STREAM);
  if (p.feature != 0u) {
    tableFeature = p.feature - r.featureId;
  }
  // The custom shader's vertex stage (custom.wgsl's default: unchanged).
  let vsInput = VertexInput(
    read3(r.positionOffset, vertexIndex),
    normal,
    out.uv,
    vertexColor,
    localFeature,
    vertexIndex,
    p.instance,
    view.time.x,
    vertexAttributes(r.attributes, vertexIndex, tableFeature),
    vertexMetadata(r.attributes, vertexIndex, tableFeature),
    instanceValues(draw, p.instance),
  );
  out.instanceIndex = p.instance;
  passNamed(vsInput.attributes, vsInput.metadata, &out);
  var vsOutput = VertexOutput(vsInput.positionMC, vsInput.normalMC);
  vertexMain(vsInput, &vsOutput);
  normal = vsOutput.normalMC;
  out.positionMC = vsOutput.positionMC;
  var world = m * vec4f(vsOutput.positionMC, 1.0);
  out.relPosition = world.xyz;
  out.position = view.viewProj * world;
  // A billboard (RecordFlags.billboard): the instance's position, its
  // corner's model xy as pixels on screen (times the size and the
  // instance's scale), facing the camera; in front of everything within
  // its depth-test distance.
  let billboard = (r.flags & 16u) != 0u;
  if (billboard) {
    world = m * vec4f(0.0, 0.0, 0.0, 1.0);
    out.relPosition = world.xyz;
    let corner = vsOutput.positionMC.xy * r.billboardSize * length(m[0].xyz);
    out.position = view.viewProj * world;
    out.position = vec4f(
      out.position.xy + corner * 2.0 * view.viewport.zw * out.position.w,
      out.position.zw,
    );
    if (length(world.xyz) < r.billboardDepthTest) {
      out.position.z = out.position.w; // reverse-Z: the near plane
    }
  }
  out.airInscatter = vec3f(0.0);
  out.airTransmittance = vec3f(1.0);
  if (withAir && view.sunLight.w > 0.5 && view.bodyRadii.w > 0.0) {
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
  if (billboard) {
    out.normal = -normalize(world.xyz); // toward the camera
  }
  out.draw = draw;
  // Per-vertex feature IDs (CAD elements, buildings) are local to the draw;
  // its first global ID offsets them. Flat interpolation takes the provoking
  // vertex: feature IDs are constant across a triangle.
  // An instance with its own feature ID is one feature.
  out.feature = r.featureId;
  if (p.feature != 0u) {
    out.feature = p.feature;
  } else if (r.featureIdOffset != NO_STREAM) {
    out.feature = select(r.featureId + localFeature, 0u, localFeature == 0xffffffffu);
  }
  return out;
}

// A shadow map's caster: depth only, with the opaque pass's discards
// (alpha cutoff, mixed-LOD placeholders), so cut-out leaves and clipped
// coarse tiles cast what is drawn.
@fragment
fn shadowFs(in: VsOut) {
  cutOut(in);
}

// The other casters: only the placeholders' clip. Without it a coarse
// tile kept while its children load cast its whole extent, over the
// children drawn beside it (coarse terrain lies meters above the fine),
// shadowing everything near the camera until they had all loaded.
@fragment
fn shadowPlaceholderFs(in: VsOut) {
  let r = records[in.draw];
  if ((r.placeholderMask & view.viewBit) != 0u &&
      !insideClipBoxes(r.clipBlock, r.clipCount, in.relPosition)) {
    discard;
  }
}

// The depth and normal prepass (ambient occlusion reads it): the surface's
// normal (geometric, facing the camera), with the opaque pass's discards.
@fragment
fn prepassFs(in: VsOut, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  cutOut(in);
  var n = normalize(in.normal);
  if (!frontFacing) {
    n = -n;
  }
  return vec4f(n, 1.0);
}

// Blended surfaces at least this opaque draw in the opaque pass (depth,
// shadows, picks, ambient occlusion); the rest in the translucent passes
// (translucent.wgsl). Near-opaque layers a few centimeters apart are what
// order-independent transparency's moments tell apart worst.
const OPAQUE_ALPHA = 0.999;

// The opaque pass draws its depth first, cutouts by alpha to coverage
// (`depthCoverageFs`): its shading, at equal depth, then fills just the
// samples covered, without cutting out per pixel itself. True in the
// opaque pass's triangle pipelines (RenderContext.ts); lines cut out here.
override cutOutInDepth: bool = false;

// The opaque pass's depth for materials that cut out (alpha mask, and
// blended surfaces' opaque parts): their alpha, sharpened to a pixel-wide
// ramp across the cutoff, as coverage (the pipeline's alpha to coverage),
// so the cut edges antialias across the samples as geometry's do; and the
// placeholders' clip.
@fragment
fn depthCoverageFs(in: VsOut) -> @location(0) vec4f {
  let r = records[in.draw];
  let material = materials[r.materialIndex];
  let alpha = materialAlpha(in);
  let ramp = max(fwidth(alpha), 1e-4);
  if ((r.placeholderMask & view.viewBit) != 0u &&
      !insideClipBoxes(r.clipBlock, r.clipCount, in.relPosition)) {
    discard;
  }
  let cutoff = select(material.alphaCutoff, OPAQUE_ALPHA, (material.flags & 8u) != 0u);
  return vec4f(0.0, 0.0, 0.0, clamp((alpha - cutoff) / ramp + 0.5, 0.0, 1.0));
}

// A surface's alpha as the opaque pass's shading has it, for the passes
// that cut out or blend by alpha without shading: the material's (factor,
// tint, vertex color, base color texture), then the custom shader's
// (`fragmentMain`'s material alpha; the engine's leaves it). Called in
// uniform control flow: a `fragmentMain` may sample textures.
fn materialAlpha(in: VsOut) -> f32 {
  let r = records[in.draw];
  let material = materials[r.materialIndex];
  let sampled = textureSample(baseColorTexture, baseColorSampler, in.uv);
  var color = material.baseColor * r.color * in.color;
  if ((material.flags & 16u) != 0u) {
    color *= sampled;
  }
  let geometric = normalize(in.normal);
  var custom = MaterialOutput(
    color.rgb,
    color.a,
    material.metallic,
    material.roughness,
    geometric,
    1.0,
    material.emissive,
    (material.flags & 1u) != 0u || (r.flags & 2u) != 0u,
  );
  fragmentMain(fragmentInputOf(in, geometric), &custom);
  return custom.alpha;
}

// The opaque pass's discards: alpha cutoff, blended surfaces' translucent
// parts, mixed-LOD placeholders.
fn cutOut(in: VsOut) {
  let r = records[in.draw];
  let material = materials[r.materialIndex];
  let alpha = materialAlpha(in);
  if ((material.flags & 12u) != 0u) {
    let cutoff = select(material.alphaCutoff, OPAQUE_ALPHA, (material.flags & 8u) != 0u);
    if (alpha < cutoff) {
      discard;
    }
  }
  if ((r.placeholderMask & view.viewBit) != 0u &&
      !insideClipBoxes(r.clipBlock, r.clipCount, in.relPosition)) {
    discard;
  }
}

// --- the sun's shadows -----------------------------------------------------------

// Cascaded shadow maps (scene/shadows.ts): per cascade, camera-relative
// positions to the sun's clip space (reverse-Z: nearest to the sun is 1).
struct Shadows {
  matrices: array<mat4x4f, 4>,
  splits: vec4f,   // each cascade's far distance along the view, m
  texels: vec4f,   // each cascade's texel size, m
  forward: vec4f,  // the camera's forward axis (xyz); w: 1 when drawn
  // x: where shadows start to fade, y: where they end, m; z: 1 when the
  // ambient-occlusion buffer holds this view's; w: 1 when the cascades
  // follow the Moon (at night) rather than the sun.
  fade: vec4f,
};

@group(0) @binding(12) var<uniform> shadows: Shadows;
@group(0) @binding(13) var shadowMap: texture_depth_2d_array;
@group(0) @binding(14) var shadowSampler: sampler_comparison;
// Ambient occlusion by pixel (ao.wgsl `denoise`): 4 pixels a word, 8 bits
// each, rows of ceil(width / 4) words.
@group(0) @binding(15) var<storage, read> aoWords: array<u32>;
// Aerial perspective from high up, a ray per texel of a screen grid
// (sky.wgsl `aerialScreenFragment`): in-scatter (pre-exposed) and
// transmittance.
@group(0) @binding(16) var aerialScreenInscatter: texture_2d<f32>;
@group(0) @binding(17) var aerialScreenTransmittance: texture_2d<f32>;
// Point and spot lights (scene/lights.ts) and their froxels' lists
// (lights.wgsl).
@group(0) @binding(18) var<storage, read> lightTable: LightTable;
@group(0) @binding(19) var<storage, read> clusters: array<u32>;

// The point and spot lights of the pixel's froxel, reflected toward the
// camera: candela over distance squared, faded to nothing at its reach
// (glTF's window, (1 − (d/reach)⁴)², with no hard edge), within a spot's
// cone (glTF's falloff). Unshadowed.
fn punctualLight(
  pixel: vec2f,
  relPosition: vec3f,
  n: vec3f,
  v: vec3f,
  f0: vec3f,
  diffuseColor: vec3f,
  alpha: f32,
  nDotV: f32,
) -> vec3f {
  let h = lightTable.header;
  var sum = vec3f(0.0);
  if (h.grid.w < 0.5) {
    return sum;
  }
  let z = dot(relPosition, h.forward.xyz);
  if (z < h.depth.x || z >= h.forward.w) {
    return sum;
  }
  let dims = vec3u(h.grid.xyz);
  let uv = pixel * view.viewport.zw;
  let i = min(u32(uv.x * f32(dims.x)), dims.x - 1u);
  let j = min(u32(uv.y * f32(dims.y)), dims.y - 1u);
  let k = min(u32(log(z / h.depth.x) * h.depth.y), dims.z - 1u);
  let base = ((k * dims.y + j) * dims.x + i) * (1u + CLUSTER_LIGHTS);
  let count = clusters[base];
  for (var t = 0u; t < count; t++) {
    let light = lightTable.lights[clusters[base + 1u + t]];
    let toLight = light.position.xyz - relPosition;
    let d2 = max(dot(toLight, toLight), 1e-4);
    let l = toLight * inverseSqrt(d2);
    if (dot(n, l) <= 0.0) {
      continue;
    }
    let ratio2 = d2 / (light.position.w * light.position.w);
    let window = clamp(1.0 - ratio2 * ratio2, 0.0, 1.0);
    var illuminance = light.color.rgb * (window * window / d2);
    if (light.color.w > 0.5) {
      let cone = clamp(dot(light.direction.xyz, -l) * light.direction.w + light.cone.x, 0.0, 1.0);
      illuminance *= cone * cone;
    }
    sum += directReflectance(n, v, l, f0, diffuseColor, alpha, nDotV) * illuminance;
  }
  return sum;
}

fn ambientOcclusion(pixel: vec2f) -> f32 {
  if (shadows.fade.z < 0.5) {
    return 1.0;
  }
  let p = vec2u(pixel);
  let words = (u32(view.viewport.x) + 3u) / 4u;
  let word = aoWords[p.y * words + p.x / 4u];
  return f32((word >> (8u * (p.x & 3u))) & 255u) / 255.0;
}

const SHADOW_SIZE: f32 = 2048.0;

// One cascade's light at a point: a 5 × 5 tent filter of depth
// comparisons from 9 bilinear ones (Castaño's optimized PCF, as The
// Witness and MJP's shadow samples): smooth edges where a 3 × 3 box of
// texel-spaced comparisons drew stair-steps wherever a texel spans several
// pixels. The point is pushed along its normal by 2 of the cascade's
// texels (the filter's reach); 1 outside the cascade.
fn cascadeLight(c: u32, relPosition: vec3f, n: vec3f) -> f32 {
  let p = shadows.matrices[c] * vec4f(relPosition + n * (shadows.texels[c] * 2.0), 1.0);
  let uv = vec2f(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  if (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0)) || p.z > 1.0) {
    return 1.0;
  }
  let texel = 1.0 / SHADOW_SIZE;
  let at = uv * SHADOW_SIZE;
  let base = floor(at + 0.5);
  let st = at + 0.5 - base;
  let origin = (base - 0.5) * texel;
  let uw = vec3f(4.0 - 3.0 * st.x, 7.0, 1.0 + 3.0 * st.x);
  let u = vec3f((3.0 - 2.0 * st.x) / uw.x - 2.0, (3.0 + st.x) / uw.y, st.x / uw.z + 2.0);
  let vw = vec3f(4.0 - 3.0 * st.y, 7.0, 1.0 + 3.0 * st.y);
  let v = vec3f((3.0 - 2.0 * st.y) / vw.x - 2.0, (3.0 + st.y) / vw.y, st.y / vw.z + 2.0);
  var lit = 0.0;
  for (var j = 0; j < 3; j++) {
    for (var i = 0; i < 3; i++) {
      let offset = vec2f(u[i], v[j]) * texel;
      lit += uw[i] * vw[j] * textureSampleCompareLevel(shadowMap, shadowSampler, origin + offset, c, p.z);
    }
  }
  return lit / 144.0;
}

// How much of the sun reaches a camera-relative position on a surface with
// geometric normal `n`: a 5 × 5 tent of comparisons (`cascadeLight`: a
// smooth edge about four texels wide), offset along the normal (no acne
// on surfaces at grazing angles to the sun), fading out at the
// shadows' far distance, blending between cascades.
fn sunShadow(relPosition: vec3f, n: vec3f) -> f32 {
  if (shadows.forward.w < 0.5) {
    return 1.0;
  }
  let depth = dot(relPosition, shadows.forward.xyz);
  if (depth >= shadows.fade.y) {
    return 1.0;
  }
  var c = 0u;
  while (c < 3u && depth > shadows.splits[c]) {
    c++;
  }
  var lit = cascadeLight(c, relPosition, n);
  // Over the last tenth of a cascade, blend into the next: their texels
  // differ in size (and their bias with them), and a seam shows where one
  // gives way to the other.
  if (c < 3u) {
    let near = select(0.0, shadows.splits[max(c, 1u) - 1u], c > 0u);
    let band = 0.1 * (shadows.splits[c] - near);
    let w = clamp((depth - (shadows.splits[c] - band)) / max(band, 1e-3), 0.0, 1.0);
    if (w > 0.0) {
      lit = mix(lit, cascadeLight(c + 1u, relPosition, n), w);
    }
  }
  let fade = clamp((depth - shadows.fade.x) / max(shadows.fade.y - shadows.fade.x, 1e-3), 0.0, 1.0);
  return mix(lit, 1.0, fade);
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

// A light's reflectance toward the camera, per unit of its illuminance:
// GGX specular and Lambert diffuse, times n·l (clamped as 1.x clamps it).
fn directReflectance(
  n: vec3f,
  v: vec3f,
  l: vec3f,
  f0: vec3f,
  diffuseColor: vec3f,
  alpha: f32,
  nDotV: f32,
) -> vec3f {
  let h = normalize(v + l);
  let nDotL = clamp(dot(n, l), 0.001, 1.0);
  let vDotH = clamp(dot(v, h), 0.0, 1.0);
  let nDotH = clamp(dot(n, h), 0.0, 1.0);
  let f90 = vec3f(clamp(max(f0.r, max(f0.g, f0.b)) * 25.0, 0.0, 1.0));
  let fresnel = fresnelSchlick(f0, f90, vDotH);
  let specular = fresnel * smithVisibility(alpha, nDotL, nDotV) * ggx(alpha, nDotH);
  let diffuse = (1.0 - fresnel) * diffuseColor / PI;
  return (diffuse + specular) * nDotL;
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

// A surface's light toward the camera: scene-referred (pre-exposed, through
// the air) or, unlit, display-referred; its alpha for blended materials.
struct Surface {
  color: vec3f,
  alpha: f32,
  unlit: bool,
};

@fragment
fn fs(in: VsOut, @builtin(front_facing) frontFacing: bool) -> FsOut {
  let surface = shadeSurface(in, frontFacing, false);
  if (!cutOutInDepth &&
      (materials[records[in.draw].materialIndex].flags & 8u) != 0u && surface.alpha < OPAQUE_ALPHA) {
    discard;
  }
  var out: FsOut;
  out.featureId = vec2u(in.feature & 0xffffu, in.feature >> 16u);
  if (surface.unlit) {
    // Unlit color is display-referred (photographs: globe imagery,
    // photogrammetry such as Google's tiles): it goes to the display target,
    // which the present pass shows as is, as glTF's KHR_materials_unlit and
    // 1.x (HDR off by default) do. No light reaches the scene target here.
    out.color = vec4f(0.0, 0.0, 0.0, 1.0);
    out.display = vec4f(surface.color, 1.0);
  } else {
    out.color = vec4f(surface.color, 1.0);
    out.display = vec4f(0.0);
  }
  return out;
}

// Translucent surfaces (`translucent`) take no ambient occlusion: the
// screen's occlusion is that of the opaque surfaces behind them.
// A fragment as custom shaders' `fragmentMain` sees it.
fn fragmentInputOf(in: VsOut, geometric: vec3f) -> FragmentInput {
  let r = records[in.draw];
  return FragmentInput(
    in.positionMC,
    in.relPosition,
    in.relPosition + (view.cameraHi + view.cameraLo),
    geometric,
    in.uv,
    in.color * r.color,
    in.feature,
    in.position.xy,
    view.time.x,
    fragmentAttributes(in),
    fragmentMetadata(in),
    in.instanceIndex,
    instanceValues(in.draw, in.instanceIndex),
  );
}

fn shadeSurface(in: VsOut, frontFacing: bool, translucent: bool) -> Surface {
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
  let lightsPacked = r.lightsSlice;
  let lightsSample = textureSample(
    lightsImagery,
    imagerySampler,
    imageryUv(lightsPacked, in.uv),
    max(lightsPacked & 4095u, 1u) - 1u,
  ).rgb;
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
  var occlusion = 1.0;
  if ((flags & 128u) != 0u) {
    occlusion = 1.0 + material.occlusionStrength * (occlusionSample - 1.0);
  }
  // 1.x clamps n·l to at least 0.001, which lets a little sun light reach
  // surfaces facing away from it; 2.0 gives them none.
  var geometric = normalize(in.normal);
  if (!frontFacing) {
    geometric = -geometric;
  }

  // The custom shader's material (custom.wgsl's default: unchanged).
  let fsInput = fragmentInputOf(in, geometric);
  var custom = MaterialOutput(
    baseColor.rgb,
    baseColor.a,
    metallic,
    roughness,
    n,
    occlusion,
    emissive,
    (flags & 1u) != 0u || (r.flags & 2u) != 0u,
  );
  fragmentMain(fsInput, &custom);
  baseColor = vec4f(custom.baseColor, custom.alpha);
  // Alpha mask, on the custom shader's alpha (the depth pass's cut, else here).
  if (!cutOutInDepth && (flags & 4u) != 0u && baseColor.a < material.alphaCutoff) {
    discard;
  }
  if (custom.unlit) {
    return Surface(baseColor.rgb, baseColor.a, true);
  }
  metallic = clamp(custom.metallic, 0.0, 1.0);
  roughness = clamp(custom.roughness, 0.0, 1.0);
  n = normalize(custom.normal);
  occlusion = custom.occlusion;
  emissive = custom.emissive;

  let v = -normalize(in.relPosition);
  let l = normalize(view.sunDirection.xyz);
  let nDotV = clamp(dot(n, v), 0.0, 1.0);
  let f0 = mix(vec3f(0.04), baseColor.rgb, metallic);
  let diffuseColor = baseColor.rgb * (1.0 - metallic);
  let alpha = roughness * roughness;

  // Direct sun light.
  let sunReflected = directReflectance(n, v, l, f0, diffuseColor, alpha, nDotV);
  let moonShadows = shadows.fade.w > 0.5;
  var sunVisible = select(0.0, 1.0, dot(n, l) > 0.0);
  if (sunVisible > 0.0 && !moonShadows) {
    sunVisible *= sunShadow(in.relPosition, geometric);
  }
  var direct = sunReflected * sunIlluminance(in.relPosition) * sunVisible;
  // The Moon's light: the sun's, reflected (its share in `moonLight.w`),
  // through the air toward it, shadowed by the cascades at night.
  let moonward = view.moonLight.xyz;
  if (view.moonLight.w > 0.0 && view.sunLight.z > 0.5 && dot(n, moonward) > 0.0) {
    var moonVisible = 1.0;
    if (moonShadows) {
      moonVisible = sunShadow(in.relPosition, geometric);
    }
    direct += directReflectance(n, v, moonward, f0, diffuseColor, alpha, nDotV)
      * sunlightThroughAir(in.relPosition, moonward) * view.moonLight.w * moonVisible;
  }
  direct += punctualLight(in.position.xy, in.relPosition, n, v, f0, diffuseColor, alpha, nDotV);

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
  // The sky's light where the surroundings hide it (screen-space ambient
  // occlusion), with light bouncing between bright surfaces (Jimenez et
  // al.'s multi-bounce fit on the diffuse color) and its share of the
  // reflections (Lagarde's specular occlusion).
  let ao = select(ambientOcclusion(in.position.xy), 1.0, translucent);
  let ma = 2.0404 * diffuseColor - 0.3324;
  let mb = -4.7951 * diffuseColor + 0.6417;
  let mc = 2.7552 * diffuseColor + 0.6903;
  let aoDiffuse = max(vec3f(ao), ((ao * ma + mb) * ao + mc) * ao);
  let aoSpecular = clamp(pow(nDotV + ao, exp2(-16.0 * roughness - 1.0)) - 1.0 + ao, 0.0, 1.0);
  let indirect = (diffuseIbl * aoDiffuse * view.diffuseIbl + specularIbl * aoSpecular * view.specularIbl) * occlusion;

  // Pre-exposed (plan §4.2). Emission is display-relative: authored
  // emissive colors look the same at any exposure.
  var emitted = vec3f(0.0);
  if (lightsPacked != 0u && view.iblFrame[0].w > 0.5) {
    let lights = srgbToLinear(lightsSample);
    emitted = max(lights - CITY_LIGHTS_FLOOR, vec3f(0.0)) / (1.0 - CITY_LIGHTS_FLOOR) * CITY_LIGHTS_LUMINANCE;
  }
  var lit = (direct + indirect + emitted) * view.exposure;
  var shown = emissive;
  if (view.sunLight.w > 0.5) {
    // The air's light is pre-exposed in the volume. From high up it's
    // marched per vertex instead; between, both, blended.
    let march = view.bodyRadii.w;
    var ap = AerialPerspective(vec3f(0.0), vec3f(1.0));
    if (march < 1.0) {
      ap = aerialPerspective(in.position.xy, in.relPosition);
    }
    if (march > 0.0) {
      var air = AerialPerspective(in.airInscatter, in.airTransmittance);
      // From high up, the screen grid: per vertex, the coarsest tiles'
      // triangles drew the day/night line in blocky streaks.
      let screen = view.iblFrame[1].w;
      if (screen > 0.0) {
        let uv = in.position.xy * view.viewport.zw;
        air = AerialPerspective(
          mix(air.inscatter, textureSampleLevel(aerialScreenInscatter, environmentSampler, uv, 0.0).rgb, screen),
          mix(air.transmittance, textureSampleLevel(aerialScreenTransmittance, environmentSampler, uv, 0.0).rgb, screen),
        );
      }
      ap = AerialPerspective(
        mix(ap.inscatter, air.inscatter, march),
        mix(ap.transmittance, air.transmittance, march),
      );
    }
    lit = lit * ap.transmittance + ap.inscatter;
    shown = emissive * ap.transmittance;
  }
  // Below fp16's largest value: an overflow to infinity (a lit scene at a
  // night exposure) poisoned the exposure meter's average with NaN.
  return Surface(min(lit + shown, vec3f(60000.0)), baseColor.a, false);
}
