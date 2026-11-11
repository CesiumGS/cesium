// The surface shaders (plan §3.4, step 5): opaque geometry with glTF
// metallic-roughness PBR, and translucency's passes over the same shading.
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
//
// A compilation unit (shaders/link): linked with
//   - surfaceVertex.wgsl, the vertex entry points: their output struct
//     needs WGSL's `@invariant` on its position (the opaque pass's depth
//     and its shading must agree to the bit: the shading tests for equal
//     depth), which Slang doesn't emit; they call `surfaceVertex`,
//     `surfacePointVertex` and `surfaceDepthVertex` here, and for a b-rep
//     patch draw (RecordFlags.patches, dice.slang) `surfacePatchVertex` and
//     `surfacePatchDepthVertex`, which take a chunk of cells in place of an
//     item;
//   - the moments' bindings (their format is the device's: RenderContext),
//     read through `loadMomentsZero`, `loadMomentsHigher`;
//   - the stages (a custom shader's generated glue, or the engine's own):
//     `cesiumVertexStage` and `cesiumFragmentStage`, called by name.
// The run-time side reads the engine only through what is marked
// `__extern_cpp` here (shaders/link SURFACE_BOUNDARY).

import common;
import coverage;
import patch;
import placement;
import surfaceBoundary;

static const float PI = 3.14159265358979;

struct AerialPerspective {
  float3 inscatter;
  float3 transmittance;
};

// --- bindings ------------------------------------------------------------------

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(1, 0)]] TextureCube<float4> specularEnvironment;
[[vk::binding(2, 0)]] SamplerState environmentSampler;
[[vk::binding(3, 0)]] Texture2D<float4> brdfLut;
// The sun's illuminance through the atmosphere by altitude and sun angle
// (atmosphere/sky.slang `sunLightFragment`).
[[vk::binding(5, 0)]] Texture2D<float4> sunLightTable;
// Diffuse irradiance E/π by normal (gpu/Environment.ts).
[[vk::binding(6, 0)]] TextureCube<float4> irradianceCube;
// Aerial perspective: in-scattered light (cd/m²) and transmittance by
// screen position and distance (atmosphere/sky.slang `aerialColumn`).
// In-scatter (slices 0-127) and transmittance (128-255): one binding.
[[vk::binding(7, 0)]] Texture3D<float4> aerialVolume;

// The air for marching aerial perspective per pixel (atmosphere/Sky.ts
// `buildAir`): both groups' parameters (air.slang `Atmosphere`) and
// the bands' weights to linear sRGB, and their tables, a layer per group.
struct AirGroup {
  float4 rayleighScattering;
  float4 mieScattering;
  float4 mieExtinction;
  float4 ozoneAbsorption;
  float4 solarIrradiance;
  float bottomRadius;
  float topRadius;
  float rayleighScaleHeight;
  float mieScaleHeight;
  float miePhaseG;
  float groundAlbedo;
  float pad0;
  float pad1;
};
struct Air {
  AirGroup groups[2];
  float4 weights[8];
};
[[vk::binding(9, 0)]] ConstantBuffer<Air> air;
[[vk::binding(10, 0)]] Texture2DArray<float4> airTransmittance;
[[vk::binding(11, 0)]] Texture2DArray<float4> airMultipleScattering;

// Cascaded shadow maps (scene/shadows.ts): per cascade, camera-relative
// positions to the sun's clip space (reverse-Z: nearest to the sun is 1).
struct Shadows {
  float4x4 matrices[4];
  float4 splits;   // each cascade's far distance along the view, m
  float4 texels;   // each cascade's texel size, m
  float4 forward;  // the camera's forward axis (xyz); w: 1 when drawn
  // x: where shadows start to fade, y: where they end, m; z: 1 when the
  // ambient-occlusion buffer holds this view's; w: 1 when the cascades
  // follow the Moon (at night) rather than the sun.
  float4 fade;
};
[[vk::binding(12, 0)]] ConstantBuffer<Shadows> shadows;
[[vk::binding(13, 0)]] DepthTexture2DArray shadowMap;
[[vk::binding(14, 0)]] SamplerComparisonState shadowSampler;
// Ambient occlusion by pixel (ao.slang `denoise`): 4 pixels a word, 8 bits
// each, rows of ceil(width / 4) words.
[[vk::binding(15, 0)]] StructuredBuffer<uint> aoWords;
// Aerial perspective from high up, a ray per texel of a screen grid
// (sky.slang `aerialScreenFragment`): layer 0 in-scatter (pre-exposed),
// layer 1 transmittance (one binding, §13.15).
[[vk::binding(16, 0)]] Texture2DArray<float4> aerialScreen;
// Point and spot lights (scene/lights.ts) and, after them, their froxels'
// lists (lights.slang): a struct ending in a runtime-sized array, read as
// bytes at its offsets.
[[vk::binding(18, 0)]] ByteAddressBuffer lightTable;
static const uint LIGHT_HEADER_BYTES = 80u;  // sizeof(LightHeader)
static const uint LIGHT_BYTES = 64u;         // sizeof(Light)
static const uint CLUSTERS_BYTES = LIGHT_HEADER_BYTES + MAX_VIEW_LIGHTS * LIGHT_BYTES;

[[vk::binding(0, 1)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(1, 1)]] StructuredBuffer<DrawItem> items;
[[vk::binding(2, 1)]] StructuredBuffer<float> vertices;
[[vk::binding(3, 1)]] StructuredBuffer<Material> materials;
// Mixed-LOD clip boxes: per box, center hi and lo (Earth-fixed) and three
// rows mapping an offset from the center to box coordinates in [-1, 1].
[[vk::binding(4, 1)]] StructuredBuffer<float4> clipBoxes;
// Globe imagery: one slice per terrain tile, composited (GlobeImagery). The
// night lights (light the surface emits, GlobeImagery "lights") are slices
// of the same array (SlicePool): one binding for every imagery layer,
// within the base tier's 16 sampled textures (§13.15).
[[vk::binding(5, 1)]] Texture2DArray<float4> imagery;
[[vk::binding(6, 1)]] SamplerState imagerySampler;

// A draw's record: the only read of `records` in the surface shaders (the
// per-draw constants seam, plan 5a's call 37). A later per-draw constants
// path (immediates, a resource table) replaces this function alone.
// Inlined, so each field is loaded where it is used, as before.
[ForceInline]
DrawRecord drawRecord(uint index) {
  return records[index];
}

// The night image's brightest white, cd/m² as seen from above (a city's
// lamps averaged over the image's half-kilometer texels): VIIRS's
// day-night band saturates near 100 nW/cm²/sr in city centers, about 0.3
// cd/m² for their spectrum. Below `CITY_LIGHTS_FLOOR` (linear), the
// image's own dark background, none.
static const float CITY_LIGHTS_LUMINANCE = 0.3;
static const float CITY_LIGHTS_FLOOR = 0.004;
static const uint CLIP_BOXES = 8u;
// Entries a mesh's named-attribute directory, or a draw's instance
// directory, holds at most (layout.ts MAX_DIRECTORY_ENTRIES): the bound of
// `readNamed`'s, `readFragmentProperty`'s and `readInstance`'s loops.
static const uint MAX_DIRECTORY_ENTRIES = 256u;

[[vk::binding(0, 2)]] Texture2D<float4> baseColorTexture;
[[vk::binding(1, 2)]] Texture2D<float4> metallicRoughnessTexture;
[[vk::binding(2, 2)]] Texture2D<float4> normalTexture;
[[vk::binding(3, 2)]] Texture2D<float4> occlusionTexture;
[[vk::binding(4, 2)]] Texture2D<float4> emissiveTexture;
[[vk::binding(5, 2)]] SamplerState baseColorSampler;
[[vk::binding(6, 2)]] SamplerState metallicRoughnessSampler;
[[vk::binding(7, 2)]] SamplerState normalSampler;
[[vk::binding(8, 2)]] SamplerState occlusionSampler;
[[vk::binding(9, 2)]] SamplerState emissiveSampler;
// EXT_structural_metadata property textures (layout.ts PROPERTY_TEXTURES).
[[vk::binding(20, 2)]] Texture2D<float4> propertyTexture0;
[[vk::binding(21, 2)]] Texture2D<float4> propertyTexture1;

// --- the aerial perspective and the sun's light through the air ---------------

// The air between the camera and a fragment: from the view's volume at the
// fragment's screen position and its distance (slices spaced quadratically
// between aerialStart and aerialEnd, the same for every ray).
AerialPerspective aerialPerspective(float2 fragment, float3 relPosition) {
  float distance = length(relPosition) / 1000.0;
  float w = sqrt(clamp((distance - view.aerialStart) / max(view.aerialEnd - view.aerialStart, 1e-6), 0.0, 1.0));
  // A slice's texel center, w = (slice + 0.5) / 128, holds the integral to
  // its distance; before the first, fade in from none.
  float2 uv = fragment * view.viewport.zw;
  float near = clamp(w * 256.0, 0.0, 1.0);
  // In-scatter and transmittance are the two halves of one volume (128
  // slices each): w clamped to its half's outer texel centers samples
  // exactly what clamp-to-edge did with a volume each.
  float edge = 0.5 / 128.0;
  float half = clamp(w, edge, 1.0 - edge) * 0.5;
  float3 inscatter = aerialVolume.SampleLevel(environmentSampler, float3(uv, half), 0.0).rgb;
  float3 transmittance = aerialVolume.SampleLevel(environmentSampler, float3(uv, 0.5 + half), 0.0).rgb;
  AerialPerspective result;
  result.inscatter = inscatter * near;
  result.transmittance = lerp(float3(1.0), transmittance, near);
  return result;
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
static const int AIR_STEPS = 24;

float2 airTransmittanceUv(float r, float mu, float bottom, float top) {
  float h = sqrt(top * top - bottom * bottom);
  float rho = sqrt(max(0.0, r * r - bottom * bottom));
  float disc = r * r * (mu * mu - 1.0) + top * top;
  float d = max(0.0, -r * mu + sqrt(max(disc, 0.0)));
  float dMin = top - r;
  float dMax = rho + h;
  float2 x = float2((d - dMin) / (dMax - dMin), rho / h);
  return float2(0.5 / 256.0 + x.x * (1.0 - 1.0 / 256.0), 0.5 / 64.0 + x.y * (1.0 - 1.0 / 64.0));
}

// How much of a light at zenith cosine `mu` stands above the planet's
// horizon from radius `r`: its elevation above the horizon over a `soft`
// angle (radians). The Earth's shadow in the air is soft over about a
// degree (the sun's disk, refraction near the horizon), and a step of the
// march spans more from high up: a hard test drew a ladder of stripes
// across the day/night line, neighbouring rays' steps crossing it apart.
float sunAbove(float r, float mu, float bottom, float soft) {
  float horizon = -sqrt(max(0.0, 1.0 - (bottom / r) * (bottom / r)));
  float above = asin(clamp(mu, -1.0, 1.0)) - asin(horizon);
  return clamp(0.5 + above / soft, 0.0, 1.0);
}

float3 cameraPosition() {
  return SplitPosition(view.cameraHi, view.cameraLo).approximate();
}

AerialPerspective aerialMarch(float3 relPosition) {
  AirGroup a = air.groups[0];
  AirGroup b = air.groups[1];
  float bottom = a.bottomRadius;
  float top = a.topRadius;
  AerialPerspective clearAir;
  clearAir.inscatter = float3(0.0);
  clearAir.transmittance = float3(1.0);
  float meters = length(relPosition);
  float3 direction = relPosition / max(meters, 1e-6);
  float3 radii = view.bodyRadii.xyz / 1000.0;
  float3 origin = cameraPosition() / 1000.0;
  float r = length(origin);
  float mu = dot(origin, direction) / r;
  // From above, where the ray enters the atmosphere (over the ellipsoid's
  // widest).
  float outer = max(radii.x, max(radii.y, radii.z)) + top - bottom;
  float start = 0.0;
  if (r > outer) {
    float disc = r * r * (mu * mu - 1.0) + outer * outer;
    if (disc < 0.0) {
      return clearAir;
    }
    start = max(-r * mu - sqrt(disc), 0.0);
  }
  float end = meters / 1000.0;
  if (end <= start) {
    return clearAir;
  }
  float3 sun = view.sunDirection.xyz;
  float nu = dot(direction, sun);
  float g = a.miePhaseG;
  float phaseR = 3.0 / (16.0 * PI) * (1.0 + nu * nu);
  float phaseM = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g) * (1.0 + nu * nu) / pow(1.0 + g * g - 2.0 * g * nu, 1.5);
  // By night the Moon's light too (its share in `sunDirection.w`).
  float moonShare = view.sunDirection.w;
  float3 moon = view.moonLight.xyz;
  float moonNu = dot(direction, moon);
  float moonPhaseR = 3.0 / (16.0 * PI) * (1.0 + moonNu * moonNu) * moonShare;
  float moonPhaseM = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g) * (1.0 + moonNu * moonNu) / pow(1.0 + g * g - 2.0 * g * moonNu, 1.5) * moonShare;
  float4 radianceA = float4(0.0);
  float4 radianceB = float4(0.0);
  float4 transmittanceA = float4(1.0);
  float4 transmittanceB = float4(1.0);
  float t0 = start;
  for (int i = 1; i <= AIR_STEPS; i++) {
    float u = 1.0 - float(i) / float(AIR_STEPS);
    float t1 = start + (end - start) * (1.0 - u * u * u);
    float dt = t1 - t0;
    float3 p = origin + direction * (0.5 * (t0 + t1));
    t0 = t1;
    float distance = length(p);
    float h = max(distance - distance / length(p / radii), 1e-3);
    float rp = bottom + h;
    float muSun = dot(normalize(p / (radii * radii)), sun);
    float rayleighDensity = exp(-h / a.rayleighScaleHeight);
    float mieDensity = exp(-h / a.mieScaleHeight);
    float ozoneDensity = h < 25.0 ? clamp(h / 15.0 - 2.0 / 3.0, 0.0, 1.0) : clamp(-h / 15.0 + 8.0 / 3.0, 0.0, 1.0);
    // In the planet's shadow, no sunlight, its edge soft (`sunAbove`).
    float soft = max(0.0175, dt / rp);
    float2 uv = airTransmittanceUv(rp, muSun, bottom, top);
    float lit = sunAbove(rp, muSun, bottom, soft);
    float4 sunA = airTransmittance.SampleLevel(environmentSampler, float3(uv, 0.0), 0.0) * lit;
    float4 sunB = airTransmittance.SampleLevel(environmentSampler, float3(uv, 1.0), 0.0) * lit;
    float2 msUv = float2(
        0.5 / 32.0 + (muSun * 0.5 + 0.5) * (1.0 - 1.0 / 32.0),
        0.5 / 32.0 + clamp(h / (top - bottom), 0.0, 1.0) * (1.0 - 1.0 / 32.0));
    float4 msA = airMultipleScattering.SampleLevel(environmentSampler, float3(msUv, 0.0), 0.0);
    float4 msB = airMultipleScattering.SampleLevel(environmentSampler, float3(msUv, 1.0), 0.0);
    float4 moonA = float4(0.0);
    float4 moonB = float4(0.0);
    float4 moonMsA = float4(0.0);
    float4 moonMsB = float4(0.0);
    if (moonShare > 0.0) {
      float muMoon = dot(normalize(p / (radii * radii)), moon);
      float2 moonUv = airTransmittanceUv(rp, muMoon, bottom, top);
      float moonLit = sunAbove(rp, muMoon, bottom, soft);
      moonA = airTransmittance.SampleLevel(environmentSampler, float3(moonUv, 0.0), 0.0) * moonLit;
      moonB = airTransmittance.SampleLevel(environmentSampler, float3(moonUv, 1.0), 0.0) * moonLit;
      float2 moonMsUv = float2(0.5 / 32.0 + (muMoon * 0.5 + 0.5) * (1.0 - 1.0 / 32.0), msUv.y);
      moonMsA = airMultipleScattering.SampleLevel(environmentSampler, float3(moonMsUv, 0.0), 0.0) * moonShare;
      moonMsB = airMultipleScattering.SampleLevel(environmentSampler, float3(moonMsUv, 1.0), 0.0) * moonShare;
    }
    {
      float4 rayleigh = a.rayleighScattering * rayleighDensity;
      float4 mie = a.mieScattering * mieDensity;
      float4 extinction = rayleigh + a.mieExtinction * mieDensity + a.ozoneAbsorption * ozoneDensity;
      float4 scattered = (rayleigh * phaseR + mie * phaseM) * sunA + (rayleigh + mie) * msA
          + (rayleigh * moonPhaseR + mie * moonPhaseM) * moonA + (rayleigh + mie) * moonMsA;
      float4 segment = exp(-extinction * dt);
      radianceA += transmittanceA * scattered * (1.0 - segment) / max(extinction, float4(1e-9));
      transmittanceA *= segment;
    }
    {
      float4 rayleigh = b.rayleighScattering * rayleighDensity;
      float4 mie = b.mieScattering * mieDensity;
      float4 extinction = rayleigh + b.mieExtinction * mieDensity + b.ozoneAbsorption * ozoneDensity;
      float4 scattered = (rayleigh * phaseR + mie * phaseM) * sunB + (rayleigh + mie) * msB
          + (rayleigh * moonPhaseR + mie * moonPhaseM) * moonB + (rayleigh + mie) * moonMsB;
      float4 segment = exp(-extinction * dt);
      radianceB += transmittanceB * scattered * (1.0 - segment) / max(extinction, float4(1e-9));
      transmittanceB *= segment;
    }
  }
  // In linear sRGB by the bands' weights, pre-exposed like the volume;
  // transmittance each channel's bands weighted by their color.
  float4 la = radianceA * a.solarIrradiance;
  float4 lb = radianceB * b.solarIrradiance;
  float3 inscatter = la.x * air.weights[0].xyz + la.y * air.weights[1].xyz + la.z * air.weights[2].xyz + la.w * air.weights[3].xyz
      + lb.x * air.weights[4].xyz + lb.y * air.weights[5].xyz + lb.z * air.weights[6].xyz + lb.w * air.weights[7].xyz;
  float3 total = air.weights[0].xyz + air.weights[1].xyz + air.weights[2].xyz + air.weights[3].xyz
      + air.weights[4].xyz + air.weights[5].xyz + air.weights[6].xyz + air.weights[7].xyz;
  float3 transmittance = (transmittanceA.x * air.weights[0].xyz + transmittanceA.y * air.weights[1].xyz
      + transmittanceA.z * air.weights[2].xyz + transmittanceA.w * air.weights[3].xyz
      + transmittanceB.x * air.weights[4].xyz + transmittanceB.y * air.weights[5].xyz
      + transmittanceB.z * air.weights[6].xyz + transmittanceB.w * air.weights[7].xyz) / total;
  AerialPerspective result;
  result.inscatter = inscatter * view.exposure;
  result.transmittance = transmittance;
  return result;
}

// The sun's light through the atmosphere arriving from `direction` (the
// sun-light table): the sun's own, or the Moon's color and dimming.
float3 sunlightThroughAir(float3 relPosition, float3 direction) {
  float3 p = relPosition + cameraPosition();
  float3 radii = view.bodyRadii.xyz;
  float distance = length(p);
  float height = (distance - distance / length(p / radii)) / 1000.0;
  float3 up = normalize(p / (radii * radii));
  float mu = dot(up, direction);
  float bottom = view.sunLight.x;
  float top = view.sunLight.y;
  float2 uv = sunLightTableUv(mu, height / (top - bottom));
  float3 light = sunLightTable.SampleLevel(environmentSampler, uv, 0.0).rgb;
  return light * (1e5 * view.sunIlluminance);
}

// The sun's illuminance at a camera-relative position: white and uniform
// (`view.sunIlluminance`), or through the body's atmosphere from the
// sun-light table, at the point's height above the body's ellipsoid and the
// sun's angle to its normal (the table's mapping: sky.slang
// `sunLightFragment`).
float3 sunIlluminance(float3 relPosition) {
  if (view.sunLight.z < 0.5) {
    return float3(view.sunIlluminance);
  }
  return sunlightThroughAir(relPosition, view.sunDirection.xyz);
}

// --- material textures: the bindless seam (plan §7.1, §13.15) -----------
//
// Every material texture read goes through `materialTexture` (and its
// presence through `materialHasTexture`, common.slang); test/bindless.test.ts
// keeps the group-2 textures out of any other code. Today's backend is a
// texture set per batch: `slot` picks the binding (a constant at every call
// site, so sampling stays in uniform control flow) and the material's
// reference only says whether the slot is filled. With resource tables
// this function becomes
//   materialTextures[ref].Sample(materialSamplers[ref], uv)
// with `ref = materialTextureRef(m, slot)`, World.textureRefs returns table
// indices, and group 2 is one group for the whole world: callers, the
// record and custom shaders don't change.
static const uint TEXTURE_BASE_COLOR = 0u;
static const uint TEXTURE_METALLIC_ROUGHNESS = 1u;
static const uint TEXTURE_NORMAL = 2u;
static const uint TEXTURE_OCCLUSION = 3u;
static const uint TEXTURE_EMISSIVE = 4u;

float4 materialTexture(Material m, uint slot, float2 uv) {
  switch (slot) {
  case 0u: return baseColorTexture.Sample(baseColorSampler, uv);
  case 1u: return metallicRoughnessTexture.Sample(metallicRoughnessSampler, uv);
  case 2u: return normalTexture.Sample(normalSampler, uv);
  case 3u: return occlusionTexture.Sample(occlusionSampler, uv);
  default: return emissiveTexture.Sample(emissiveSampler, uv);
  }
}

// --- what passes between the stages ------------------------------------------

struct SurfaceVaryings {
  float4 position : SV_Position;
  float3 normal : NORMAL;
  float2 uv : UV;
  float4 color : COLOR;
  uint3 ids : IDS; // flat: integers always are
  float3 relPosition : RELPOSITION;
  float4 tangent : TANGENT;
  float3 airInscatter : AIRINSCATTER;
  float3 airTransmittance : AIRTRANSMITTANCE;
  float3 positionMC : POSITIONMC;
  float4 named0 : NAMEDA;
  float4 named1 : NAMEDB;
  float4 named2 : NAMEDC;
  float4 named3 : NAMEDD;
};

// `ids.z`'s top bit: the fragment is on a globe tile's skirt (`vertexOut`);
// the bits below are the instance. A patch draw's is its face's trim data
// (`PatchVertex.trim`), which the trimmed fragment entries read: the
// instance of a draw without instances is 0.
static const uint SKIRT_BIT = 0x80000000u;

// The camera-relative position of what is being drawn, set before the
// stages run, so styles compiled to them (vector/VectorStyle.ts) read a
// feature's distance from the camera (`${view.distance}`): in the vertex
// stage a point set's point, an instance's origin or the draw's; in the
// fragment stage the surface's position as drawn (`drawnPosition`), which
// for billboards and points is their anchor (their corners are offsets on
// screen). No varying of its own: every inter-stage location is in use.
static float3 cesiumAnchor;

// A point set's quad (RecordFlags.points): six vertices as four corners,
// each corner's offset from the point (a unit square, centered) and uv.
static const uint POINT_CORNER[6] = { 0u, 1u, 2u, 0u, 2u, 3u };
static const float2 POINT_OFFSET[4] = {
  float2(-0.5, -0.5), float2(0.5, -0.5), float2(0.5, 0.5), float2(-0.5, 0.5)
};
static const float2 POINT_UV[4] = {
  float2(0.0, 1.0), float2(1.0, 1.0), float2(1.0, 0.0), float2(0.0, 0.0)
};

// What styles read of the view (vector/VectorStyle.ts).
// The camera-relative position of what is being drawn (`cesiumAnchor`).
export __extern_cpp float3 cesiumAnchorPosition() {
  return cesiumAnchor;
}
// The camera, Earth-fixed (float32).
export __extern_cpp float3 cesiumCameraPosition() {
  return cameraPosition();
}
// Camera-relative positions to clip space.
export __extern_cpp float4x4 cesiumViewProjection() {
  return view.viewProj;
}
// A pixel in clip units over two (the viewport's 1 / size).
export __extern_cpp float2 cesiumPixelSize() {
  return view.viewport.zw;
}

float2 read2(uint offset, uint index) {
  uint b = offset + index * 2u;
  return float2(vertices[b], vertices[b + 1u]);
}

float3 read3(uint offset, uint index) {
  uint b = offset + index * 3u;
  return float3(vertices[b], vertices[b + 1u], vertices[b + 2u]);
}

float4 read4(uint offset, uint index) {
  uint b = offset + index * 4u;
  return float4(vertices[b], vertices[b + 1u], vertices[b + 2u], vertices[b + 3u]);
}

// A named attribute or metadata property of a vertex from its mesh's
// directory (layout.ts MeshStreams.attributes: count, then per entry the
// name's hash, stream offset and components); zero where absent.
//
// Its loops are bounded by constants (GPU safety; the vertex stage runs it
// for every dual-placed draw, placement.slang): at most
// MAX_DIRECTORY_ENTRIES entries (layout.ts the same; `World.addMesh`
// refuses more), and 4 components.
export __extern_cpp float4 readNamed(uint directory, uint hash, uint vertexIndex, uint feature) {
  float4 value = float4(0.0);
  if (directory == NO_STREAM) {
    return value;
  }
  uint count = asuint(vertices[directory]);
  for (uint i = 0u; i < MAX_DIRECTORY_ENTRIES; i++) {
    if (i >= count) {
      break;
    }
    uint entry = directory + 1u + i * 3u;
    if (asuint(vertices[entry]) == hash) {
      uint components = asuint(vertices[entry + 2u]);
      // In a texture (layout.ts TEXTURE_PROPERTY): per fragment only.
      if (components >= 0x80000000u) {
        break;
      }
      // A feature table column (TABLE_PROPERTY): the vertex's feature's row.
      uint row = vertexIndex;
      uint size = components;
      if (components >= 0x40000000u) {
        if (feature == 0xffffffffu) {
          break;
        }
        row = feature;
        size = components & 0xffu;
      }
      uint b = asuint(vertices[entry + 1u]) + row * size;
      for (uint c = 0u; c < 4u; c++) {
        if (c >= size) {
          break;
        }
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
// zero where absent. At most MAX_DIRECTORY_ENTRIES fields (`World.addDraw`
// and `addPointMesh` refuse more), each at most 4 components: its loops'
// constant bounds.
export __extern_cpp uint4 readInstance(uint draw, uint instance, uint hash) {
  DrawRecord r = drawRecord(draw);
  uint4 bits = uint4(0u);
  if (r.instanceDirectory == NO_STREAM || r.instanceStreams == NO_STREAM) {
    return bits;
  }
  uint count = asuint(vertices[r.instanceDirectory]);
  for (uint i = 0u; i < MAX_DIRECTORY_ENTRIES; i++) {
    if (i >= count) {
      break;
    }
    uint entry = r.instanceDirectory + 1u + i * 3u;
    if (asuint(vertices[entry]) == hash) {
      uint b = r.instanceStreams + instance * r.instanceStride + asuint(vertices[entry + 1u]);
      uint components = asuint(vertices[entry + 2u]);
      for (uint c = 0u; c < 4u; c++) {
        if (c >= components) {
          break;
        }
        bits[c] = asuint(vertices[b + c]);
      }
      break;
    }
  }
  return bits;
}

// A property texture's texel at `uv` (repeating, nearest: the texel's
// bytes exactly), its channels as bytes.
uint4 propertyTexel(uint slot, float2 uv) {
  float4 texel;
  uint width, height;
  if (slot == 0u) {
    propertyTexture0.GetDimensions(width, height);
    uint2 size = uint2(width, height);
    texel = propertyTexture0.Load(int3(int2(min(uint2(frac(uv) * float2(size)), size - 1u)), 0));
  } else {
    propertyTexture1.GetDimensions(width, height);
    uint2 size = uint2(width, height);
    texel = propertyTexture1.Load(int3(int2(min(uint2(frac(uv) * float2(size)), size - 1u)), 0));
  }
  return uint4(round(texel * 255.0));
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
// Its loops are bounded by constants, as `readNamed`'s: the directory's
// MAX_DIRECTORY_ENTRIES, and 4 channels, components and bytes.
export __extern_cpp float4 readFragmentProperty(uint directory, uint hash, float2 uv, uint feature, float4 fallback) {
  if (directory == NO_STREAM) {
    return fallback;
  }
  uint count = asuint(vertices[directory]);
  for (uint i = 0u; i < MAX_DIRECTORY_ENTRIES; i++) {
    if (i >= count) {
      break;
    }
    uint entry = directory + 1u + i * 3u;
    if (asuint(vertices[entry]) != hash) {
      continue;
    }
    uint info = asuint(vertices[entry + 2u]);
    if (info < 0x40000000u) {
      return fallback;
    }
    if (info < 0x80000000u) {
      // Exactly the feature's row, not interpolated.
      float4 value = float4(0.0);
      if (feature != 0xffffffffu) {
        uint size = info & 0xffu;
        uint row = asuint(vertices[entry + 1u]) + feature * size;
        for (uint c = 0u; c < 4u; c++) {
          if (c >= size) {
            break;
          }
          value[c] = vertices[row + c];
        }
      }
      return value;
    }
    uint b = asuint(vertices[entry + 1u]);
    uint4 texel = propertyTexel(asuint(vertices[b]), uv);
    uint channelCount = min(asuint(vertices[b + 1u]), 4u);
    uint channels = asuint(vertices[b + 2u]);
    uint kind = asuint(vertices[b + 3u]);
    uint components = min(asuint(vertices[b + 4u]), 4u);
    bool normalized = asuint(vertices[b + 5u]) != 0u;
    uint bytes[4] = { 0u, 0u, 0u, 0u };
    for (uint k = 0u; k < 4u; k++) {
      if (k >= channelCount) {
        break;
      }
      bytes[k] = texel[(channels >> (k * 8u)) & 3u];
    }
    // Bytes per component: 8-, 16- or 32-bit types (COMPONENT_TYPE_CODES).
    uint size = kind <= 1u ? 1u : (kind == 2u || kind == 3u ? 2u : 4u);
    float4 value = float4(0.0);
    for (uint c = 0u; c < 4u; c++) {
      if (c >= components) {
        break;
      }
      uint raw = 0u;
      for (uint k = 0u; k < 4u; k++) {
        if (k >= size) {
          break;
        }
        uint at = c * size + k;
        if (at < 4u) {
          raw |= bytes[at] << (k * 8u);
        }
      }
      float v;
      switch (kind) {
      case 0u: v = normalized ? float(raw) / 255.0 : float(raw); break;
      case 1u: v = float(int(raw << 24u) >> 24); if (normalized) { v = max(v / 127.0, -1.0); } break;
      case 2u: v = normalized ? float(raw) / 65535.0 : float(raw); break;
      case 3u: v = float(int(raw << 16u) >> 16); if (normalized) { v = max(v / 32767.0, -1.0); } break;
      case 4u: v = normalized ? float(raw) / 4294967295.0 : float(raw); break;
      case 5u: v = float(asint(raw)); if (normalized) { v = max(v / 2147483647.0, -1.0); } break;
      default: v = asfloat(raw); break;
      }
      value[c] = v * vertices[b + 10u + c] + vertices[b + 6u + c];
    }
    return value;
  }
  return fallback;
}

// --- the vertex stage -----------------------------------------------------------

// A column of a matrix read from a buffer (Slang's `m[i]` is its row).
float3 column3(float4x4 m, int c) {
  return float3(m[0][c], m[1][c], m[2][c]);
}

// A patch draw's chunk (RecordFlags.patches; dice.slang writes them: the
// record, a span of the draw, the chunk's cells' origin and the span's cell
// counts packed), set by the patch vertex entries before `vertexOut`.
static uint4 patchChunk;

// A patch draw's vertex, indexed: a chunk of 4 × 4 cells is 5 × 5 shared
// vertices, over a static index buffer (render/drawArguments.ts) whose
// triangles are counter-clockwise in (i, j). A reversed face is the grid
// mirrored along u (i = n_u less the column), which turns the triangles the
// other way, so they face outward. Columns and rows past the span's counts
// repeat its last line: the cells there have no area, and the rasterizer
// drops them.
struct PatchVertex {
  float3 position;
  float3 normal;
  float2 uv;       // (u, v) less the face rect's corner
  uint face;       // its feature
  uint trim;       // the face's trim data's offset + 1 in the draw's table, 0: none
};

PatchVertex patchVertex(DrawRecord r, uint vertexIndex) {
  PatchVertex result;
  uint base = r.positionOffset + patchChunk.y * SPAN_WORDS;
  PatchSpan s = loadSpan(vertices, base);
  uint packed = patchChunk.z;
  uint nu = (packed >> 16u) & 255u;
  uint nv = (packed >> 24u) & 255u;
  uint column = min((packed & 255u) + vertexIndex % (CHUNK_CELLS + 1u), nu);
  uint row = min(((packed >> 8u) & 255u) + vertexIndex / (CHUNK_CELLS + 1u), nv);
  uint i = s.reversed ? nu - column : column;
  uint j = row;
  result.face = s.face;
  result.trim = s.trim >= TRIM_PENDING ? 0u : s.trim + 1u;
  // The grid's lines are exact at the ends, so spans meet on the same floats.
  float u = i == nu ? s.rect.y : s.rect.x + (s.rect.y - s.rect.x) * float(i) / float(nu);
  float v = j == nv ? s.rect.w : s.rect.z + (s.rect.w - s.rect.z) * float(j) / float(nv);
  PatchPoint point;
  if (s.kind == 5u) {
    float4 net[16];
    uint count = (s.degreeU + 1u) * (s.degreeV + 1u);
    for (uint n = 0u; n < 16u; n++) {
      if (n < count) {
        uint at = r.positionOffset + s.controls + n * 4u;
        net[n] = float4(vertices[at], vertices[at + 1u], vertices[at + 2u], vertices[at + 3u]);
      } else {
        net[n] = float4(0.0);
      }
    }
    point = evaluateBezier(s, net, u, v);
  } else {
    point = evaluateAnalytic(s, u, v);
  }
  result.position = point.position;
  result.normal = s.reversed ? -point.normal : point.normal;
  result.uv = float2(u, v) - s.corner;
  return result;
}

SurfaceVertex vertexOut(uint vertexIndex, uint item, bool withAir) {
  DrawItem p = items[item];
  uint draw = p.record;
  DrawRecord r = drawRecord(draw);
  float4x4 m = p.relModel;
  SurfaceVertex out;
  out.uv = float2(0.0);
  // A point set (RecordFlags.points): six vertices a point, its anchor
  // pulled from the position stream; the point is the instance.
  bool points = (r.flags & 64u) != 0u;
  // A patch draw (RecordFlags.patches): the vertex is a cell's corner of a
  // chunk of a span, evaluated here (`patchVertex`); its face is the feature
  // and its uv the face's (u, v) from the rect's corner (the trim test's).
  bool patched = (r.flags & 128u) != 0u;
  PatchVertex patchData;
  patchData.face = 0u;
  patchData.trim = 0u;
  patchData.position = float3(0.0);
  patchData.normal = float3(0.0, 0.0, 1.0);
  patchData.uv = float2(0.0);
  uint instance = p.instance;
  float3 position = float3(0.0);
  float4 anchor = float4(0.0);
  if (points) {
    uint corner = POINT_CORNER[vertexIndex % 6u];
    instance = vertexIndex / 6u;
    anchor = read4(r.positionOffset, instance);
    position = float3(POINT_OFFSET[corner], 0.0);
    out.uv = POINT_UV[corner];
  } else if (patched) {
    patchData = patchVertex(r, vertexIndex);
    position = patchData.position;
    out.uv = patchData.uv;
  } else {
    position = read3(r.positionOffset, vertexIndex);
  }
  // A billboard (RecordFlags.billboard) is placed at its anchor: the corners
  // are pixel offsets on screen, which a placement leaves alone.
  bool billboard = (r.flags & 16u) != 0u;
  if (billboard && r.placement != NO_PLACEMENT) {
    anchor.xyz = placePosition(r.placement, anchor.xyz, 0u, r.attributes, 0u);
  }
  cesiumAnchor = mul(m, float4(anchor.xyz, 1.0)).xyz;
  float3 normal = float3(0.0, 0.0, 1.0);
  if (patched) {
    normal = patchData.normal;
  } else if (r.normalOffset != NO_STREAM) {
    normal = read3(r.normalOffset, vertexIndex);
  }
  // (A point draw's `uvOffset` is its list, not uvs.)
  if (!points && !patched && r.uvOffset != NO_STREAM) {
    out.uv = read2(r.uvOffset, vertexIndex);
  }
  float4 vertexColor = float4(1.0);
  if (r.colorOffset != NO_STREAM) {
    vertexColor = read4(r.colorOffset, vertexIndex);
  }
  out.color = unpackUnorm4x8ToFloat(p.tint) * vertexColor;
  uint localFeature = 0xffffffffu;
  if (r.featureIdOffset != NO_STREAM) {
    localFeature = asuint(vertices[r.featureIdOffset + vertexIndex]);
  }
  // The row of the draw's feature table this vertex reads: an instance's
  // feature (cull.slang makes it global), else the vertex's; a draw without
  // per-vertex IDs is feature 0 (as `out.ids.y` below).
  uint tableFeature = r.featureIdOffset == NO_STREAM ? 0u : localFeature;
  if (p.feature != 0u) {
    tableFeature = p.feature - r.featureId;
  }
  if (points) {
    localFeature = instance;
    tableFeature = instance;
  }
  if (patched) {
    localFeature = patchData.face;
    tableFeature = patchData.face;
  }
  // The draw's placement (placement.slang), before the custom vertex
  // stage, in model space: the transform carries the large offset. The
  // placement's Jacobian turns the tangent and the normal with the surface.
  float3 designPosition = position;
  Placed placed = placeVertex(billboard ? NO_PLACEMENT : r.placement, position, vertexIndex, r.attributes, tableFeature);
  position = placed.position;
  bool placedDraw = r.placement != NO_PLACEMENT && !billboard;
  if (placedDraw) {
    normal = turnNormal(placed.jacobian, normal);
  }
  // The tangent keeps its handedness (w) under the turn.
  out.tangent = float4(0.0);
  if (r.tangentOffset != NO_STREAM) {
    float4 t = read4(r.tangentOffset, vertexIndex);
    float3 turned = placedDraw ? mul(placed.jacobian, t.xyz) : t.xyz;
    out.tangent = float4(normalize(mul(m, float4(turned, 0.0)).xyz), t.w);
  }
  // The custom shader's vertex stage (CustomShader.ts's defaults: unchanged).
  CesiumVertex v;
  v.positionMC = position;
  v.designPositionMC = designPosition;
  v.normalMC = normal;
  v.texCoord0 = out.uv;
  v.color0 = vertexColor;
  v.featureId0 = localFeature;
  v.vertexIndex = vertexIndex;
  v.instanceIndex = instance;
  v.time = view.time.x;
  v.draw = draw;
  v.directory = r.attributes;
  v.tableFeature = tableFeature;
  CesiumVertexResult stage = cesiumVertexStage(v);
  // A globe tile's skirt vertex (`DrawRecord.skirtStart`) sets SKIRT_BIT:
  // each skirt triangle lists one first, so the provoking vertex marks
  // every skirt fragment and no surface one (`terrainAlpha`).
  out.ids.z = instance | (vertexIndex >= r.skirtStart ? SKIRT_BIT : 0u);
  if (patched) {
    out.ids.z = patchData.trim;
  }
  out.named0 = stage.named0;
  out.named1 = stage.named1;
  out.named2 = stage.named2;
  out.named3 = stage.named3;
  normal = stage.normalMC;
  // Fragment stage's design position (the mesh's own, whatever the
  // placement and the custom stage: a procedural pattern keeps to the
  // surface under a warp), and the draw's transform on the position before
  // the placement; for an unplaced draw, where it is drawn.
  out.positionMC = designPosition;
  float4 world = mul(m, float4(stage.positionMC, 1.0));
  out.relPosition = placedDraw ? mul(m, float4(designPosition, 1.0)).xyz : world.xyz;
  out.position = mul(view.viewProj, world);
  // A billboard (RecordFlags.billboard): the instance's position, its
  // corner's model xy as pixels on screen (times the size and the
  // instance's scale), facing the camera; in front of everything within
  // its depth-test distance.
  if (billboard) {
    world = mul(m, float4(anchor.xyz, 1.0));
    out.relPosition = world.xyz;
    float2 corner = stage.positionMC.xy * r.billboardSize * length(column3(m, 0));
    out.position = mul(view.viewProj, world);
    out.position = float4(
        out.position.xy + corner * 2.0 * view.viewport.zw * out.position.w,
        out.position.zw);
    if (length(world.xyz) < r.billboardDepthTest) {
      out.position.z = out.position.w; // reverse-Z: the near plane
    }
    // A point not drawn (x past 1e37: hidden, or never placed): a quad
    // of no area, outside the clip volume.
    if (points && !(abs(anchor.x) < 1e37)) {
      out.position = float4(0.0, 0.0, -1.0, 1.0);
    }
  }
  out.airInscatter = float3(0.0);
  out.airTransmittance = float3(1.0);
  // Unlit draws (billboards, point sets, lines) show their color as is,
  // without the air (`shade`'s unlit path): no march for them.
  bool unlitDraw = (r.flags & 2u) != 0u;
  if (withAir && !unlitDraw && view.sunLight.w > 0.5 && view.bodyRadii.w > 0.0) {
    AerialPerspective a = aerialMarch(world.xyz);
    out.airInscatter = a.inscatter;
    out.airTransmittance = a.transmittance;
  }
  // Underlay (the bare ellipsoid): behind all other content (UNDERLAY_DEPTH
  // in layout.ts).
  if ((r.flags & 8u) != 0u) {
    out.position.z *= 5.421010862427522e-20;
  }
  // Normals transform by the inverse transpose; the cofactor matrix is that up
  // to the determinant, whose sign keeps mirrored transforms facing outward.
  // (Quantized glTF often carries a non-uniform dequantization scale.)
  float3 c0 = column3(m, 0);
  float3 c1 = column3(m, 1);
  float3 c2 = column3(m, 2);
  float det = dot(c0, cross(c1, c2));
  // Normalize before interpolation: under non-uniform scale the transformed
  // lengths vary with direction and would skew the interpolated normal.
  out.normal = normalize(cross(c1, c2) * normal.x + cross(c2, c0) * normal.y + cross(c0, c1) * normal.z) * sign(det);
  if (billboard) {
    out.normal = -normalize(world.xyz); // toward the camera
  }
  out.ids.x = draw;
  // Per-vertex feature IDs (CAD elements, buildings) are local to the draw;
  // its first global ID offsets them. Flat interpolation takes the provoking
  // vertex: feature IDs are constant across a triangle.
  // An instance with its own feature ID is one feature.
  out.ids.y = r.featureId;
  if (points) {
    out.ids.y = r.featureId + instance;
  } else if (patched) {
    out.ids.y = r.featureId == 0u ? 0u : r.featureId + patchData.face;
  } else if (p.feature != 0u) {
    out.ids.y = p.feature;
  } else if (r.featureIdOffset != NO_STREAM) {
    out.ids.y = localFeature == 0xffffffffu ? 0u : r.featureId + localFeature;
  }
  return out;
}

// The vertex entry points' (surfaceVertex.wgsl): a draw's vertex with the
// air; a point draw's quads (RecordFlags.points, `opaquePoints`): six
// vertices for each point the view's cull listed (pointCull.slang
// `cullPoints`; the draw's list is at its record's `uvOffset`, points
// having no uvs), in one draw (four-vertex strips as instances drew
// slower: an instance of four vertices fills few of a vertex wave's
// lanes); and the same without the air (shadow maps: no aerial
// perspective there).
export __extern_cpp SurfaceVertex surfaceVertex(uint vertexIndex, uint item) {
  return vertexOut(vertexIndex, item, true);
}
export __extern_cpp SurfaceVertex surfacePointVertex(uint vertexIndex, uint item) {
  DrawRecord r = drawRecord(items[item].record);
  uint point = asuint(vertices[r.uvOffset + vertexIndex / 6u]);
  return vertexOut(point * 6u + vertexIndex % 6u, item, true);
}
export __extern_cpp SurfaceVertex surfaceDepthVertex(uint vertexIndex, uint item) {
  return vertexOut(vertexIndex, item, false);
}
// A patch draw's: its chunk (dice.slang) in place of the item list's entry;
// the chunk's first word is the record, which is its item.
export __extern_cpp SurfaceVertex surfacePatchVertex(uint vertexIndex, uint4 chunk) {
  patchChunk = chunk;
  return vertexOut(vertexIndex, chunk.x, true);
}
export __extern_cpp SurfaceVertex surfacePatchDepthVertex(uint vertexIndex, uint4 chunk) {
  patchChunk = chunk;
  return vertexOut(vertexIndex, chunk.x, false);
}

// --- the opaque passes' fragments ---------------------------------------------

// Bits of a record's `clipBlock` holding the block (layout.ts
// `CLIP_BLOCK_BITS`); the box count above.
static const uint CLIP_BLOCK_BITS = 28u;

// A mixed-LOD placeholder's boxes: `packed` is the record's `clipBlock`,
// the block in bits 0-27 and how many boxes it holds in bits 28-31 (at
// most CLIP_BOXES, the loop's constant bound, whatever the record holds).
bool insideClipBoxes(uint packed, float3 p) {
  uint block = packed & ((1u << CLIP_BLOCK_BITS) - 1u);
  uint count = packed >> CLIP_BLOCK_BITS;
  for (uint i = 0u; i < CLIP_BOXES; i++) {
    if (i >= count) {
      break;
    }
    uint b = (block * CLIP_BOXES + i) * 5u;
    float3 d = p - SplitPosition(clipBoxes[b].xyz, clipBoxes[b + 1u].xyz)
                       .difference(SplitPosition(view.cameraHi, view.cameraLo));
    float3 u = abs(float3(
        dot(clipBoxes[b + 2u].xyz, d),
        dot(clipBoxes[b + 3u].xyz, d),
        dot(clipBoxes[b + 4u].xyz, d)));
    if (max(u.x, max(u.y, u.z)) <= 1.0) {
      return true;
    }
  }
  return false;
}

// Whether segments a–b and q–s cross: each pair's ends on opposite sides
// of the other's line, a side being "> 0" (half-open, so a segment through
// a vertex shared by two edges crosses one of them, never both).
bool segmentsCross(float2 a, float2 b, float2 q, float2 s) {
  float2 e = b - a;
  float2 t = s - q;
  bool qSide = e.x * (q.y - a.y) - e.y * (q.x - a.x) > 0.0;
  bool sSide = e.x * (s.y - a.y) - e.y * (s.x - a.x) > 0.0;
  bool aSide = t.x * (a.y - q.y) - t.y * (a.x - q.x) > 0.0;
  bool bSide = t.x * (b.y - q.y) - t.y * (b.x - q.x) > 0.0;
  return qSide != sSide && aSide != bSide;
}

// Terrain regions (a globe's `terrain.addRegion`, globe/terrainClip.ts):
// the world's regions live in `clipBoxes`, block 0's first 32 rows a
// directory, a row a slot: the region's first row (x, a uint; 0 for a free
// slot), its opacity (y, a float's bits: 0 the terrain not drawn inside,
// between 0 and 1 drawn at that opacity, 1 no effect), and whether it is
// everywhere (z, a uint: 1 for "everywhere", a slot with no shape), and
// whether the terrain inside is ground (w, a uint: 1 ground, 0 a hole for
// height captures). A region's rows
// (`packClipShape`): its anchor's position hi (xyz) with its gnomonic
// radius (w); lo with its grid's columns and rows (w, a uint: columns in
// the low 16 bits); its east, north and up axes; its box in its plane
// (CLIP_HEADER_ROWS in all); its grid's cells, row by row (first edge row
// and count, the sample); the cells' edges, one a row (both ends in the
// plane).
//
// A fragment projects from the point where the anchor's normal meets the
// polar axis onto the anchor's tangent plane (gnomonic: exact at the
// ellipsoid, meridians straight), all relative to the anchor, so float32
// keeps millimeters near it. In the plane it finds its cell of the grid:
// the cell's sample point is known inside or out, and the segment from the
// fragment to it crosses only the cell's edges, so the fragment is inside
// when it crosses an odd number of them and the sample isn't, or the
// reverse. A fragment tests at most MAX_CLIP_CELL_EDGES edges per region,
// and MAX_CLIP_FRAGMENT_EDGES in all, whatever the buffer holds: the CPU
// refuses regions that would need more (`TerrainClips.checkBudget`), and
// the budget here only keeps a bad buffer's cost bounded. `mask` is the
// record's `terrainClip`: the regions its tile's rectangle touches (the
// CPU filters per tile). Every loop has a constant bound. The constants
// are terrainClip.ts's and layout.ts's (test/terrainClip.test.ts reads
// them here).
static const uint MAX_TERRAIN_CLIPS = 32u;
static const uint MAX_CLIP_GRID = 128u;
static const uint MAX_CLIP_CELL_EDGES = 32u;
static const uint MAX_CLIP_FRAGMENT_EDGES = 128u;
static const uint CLIP_HEADER_ROWS = 6u;

// What `terrainOpacity` finds: the drawn opacity of every region (0), the
// cuts only, regions of opacity 0 (1: what isn't drawn at all,
// `clippedOut`), or the holes only, regions that aren't ground, counted as
// opacity 0 (2: height captures, `heightFs`).
static const uint REGIONS_SEEN = 0u;
static const uint REGIONS_CUTS = 1u;
static const uint REGIONS_HOLES = 2u;

// The terrain's opacity at `p`: the least opacity of the regions of `mask`
// that hold it (0 inside a cut), 1 where none does. A region that can't
// lower the opacity found so far isn't tested.
float terrainOpacity(uint mask, float3 p, uint which) {
  SplitPosition camera = SplitPosition(view.cameraHi, view.cameraLo);
  uint budget = MAX_CLIP_FRAGMENT_EDGES;
  float opacity = 1.0;
  for (uint n = 0u; n < MAX_TERRAIN_CLIPS; n++) {
    if (mask == 0u) {
      break;
    }
    uint slot = firstbitlow(mask);
    mask &= mask - 1u;
    uint4 entry = asuint(clipBoxes[slot]);
    float alpha = asfloat(entry.y);
    if (which == REGIONS_HOLES) {
      if (entry.w != 0u) {
        continue; // ground
      }
      alpha = 0.0;
    }
    if (alpha >= opacity || (which == REGIONS_CUTS && alpha > 0.0)) {
      continue;
    }
    if (entry.z != 0u) {
      opacity = alpha; // everywhere
      continue;
    }
    uint o = entry.x;
    float4 hi = clipBoxes[o];
    float4 lo = clipBoxes[o + 1u];
    float3 d = p - SplitPosition(hi.xyz, lo.xyz).difference(camera);
    float3 l = float3(dot(clipBoxes[o + 2u].xyz, d), dot(clipBoxes[o + 3u].xyz, d),
                      dot(clipBoxes[o + 4u].xyz, d));
    float denominator = hi.w + l.z;
    if (denominator <= 0.0) {
      continue;
    }
    float2 q = l.xy * (hi.w / denominator);
    float4 box = clipBoxes[o + 5u];
    if (q.x < box.x || q.y < box.y || q.x > box.z || q.y > box.w) {
      continue;
    }
    uint sizes = asuint(lo.w);
    uint2 size = clamp(uint2(sizes & 0xffffu, sizes >> 16u), uint2(1u), uint2(MAX_CLIP_GRID));
    uint grid = o + CLIP_HEADER_ROWS;
    uint edges = grid + size.x * size.y;
    float2 cell = max((box.zw - box.xy) / float2(size), float2(1e-6));
    uint2 at = min(uint2(max((q - box.xy) / cell, float2(0.0))), size - 1u);
    float4 c = clipBoxes[grid + at.y * size.x + at.x];
    uint start = asuint(c.x);
    uint word = asuint(c.y);
    uint count = min(word & 0x7fffffffu, min(MAX_CLIP_CELL_EDGES, budget));
    budget -= count;
    bool inside = (word >> 31u) != 0u;
    for (uint j = 0u; j < MAX_CLIP_CELL_EDGES; j++) {
      if (j >= count) {
        break;
      }
      float4 edge = clipBoxes[edges + start + j];
      if (segmentsCross(edge.xy, edge.zw, q, c.zw)) {
        inside = !inside;
      }
    }
    if (inside) {
      opacity = alpha;
      if (opacity <= 0.0) {
        return 0.0;
      }
    }
  }
  return opacity;
}

// Whether a pass sees the terrain's opacity: height captures don't. They
// draw every region's terrain opaque, and leave out only what isn't ground
// (`heightFs`, `TerrainRegion.ground`).
static bool terrainSeen = true;

// What the record doesn't draw at `p` in this view: a mixed-LOD
// placeholder outside its boxes, clipped terrain inside its regions. The
// boxes and regions are tiling and terrain's, in the world as the content is
// stored, so they are tested at `relPosition` (the transform on the
// design position), not where a placement draws the surface.
bool placeholderOut(DrawRecord r, float3 p) {
  return (r.placeholderMask & view.viewBit) != 0u && !insideClipBoxes(r.clipBlock, p);
}
bool clippedOut(DrawRecord r, float3 p) {
  if (placeholderOut(r, p)) {
    return true;
  }
  return r.terrainClip != 0u &&
         terrainOpacity(r.terrainClip, p, terrainSeen ? REGIONS_CUTS : REGIONS_HOLES) <= 0.0;
}

// Blended surfaces at least this opaque draw in the opaque pass (depth,
// shadows, picks, ambient occlusion); the rest in the translucent passes.
// Near-opaque layers a few centimeters apart are what order-independent
// transparency's moments tell apart worst.
static const float OPAQUE_ALPHA = 0.999;

// A draw's opacity from its globe's translucency at the fragment
// (`terrainOpacity`): 1 for other draws; 0 on a skirt wherever the terrain
// is less than opaque (skirts only hide cracks in opaque ground, and the
// surface draws opaque from OPAQUE_ALPHA).
float terrainAlpha(DrawRecord r, SurfaceVaryings in) {
  if (r.terrainClip == 0u) {
    return 1.0;
  }
  float opacity = terrainOpacity(r.terrainClip, in.relPosition,
                                 terrainSeen ? REGIONS_SEEN : REGIONS_HOLES);
  if (opacity < OPAQUE_ALPHA && (in.ids.z & SKIRT_BIT) != 0u) {
    return 0.0;
  }
  return opacity;
}

// The opaque pass draws its depth first, cutouts by alpha to coverage
// (`depthCoverageFs`): its shading, at equal depth, then fills just the
// samples covered, without cutting out per pixel itself. True in the
// opaque pass's triangle pipelines (RenderContext.ts, by its id, 0);
// lines cut out here.
[vk::constant_id(0)] const bool cutOutInDepth = false;


// The surface's camera-relative position as drawn, for what light and the
// air do to it. The varying (`relPosition`) is the draw's transform on the
// vertex's position before its placement, which for a draw without one is
// where it is drawn: used as it is. A placed draw's is rebuilt from the
// fragment's window position and depth, through the view's rotation-only
// perspective (reverse-Z, infinite far): `viewProj`'s rows 0, 1 and 3 are
// orthogonal (right scaled by f / aspect, up by f, and the view direction,
// which is clip w), so with x and y in NDC and w = near / depth the point is
// w * (right * x / |row0|² + up * y / |row1|² + direction). Camera-relative,
// so nothing large. Billboards and the underlay draw somewhere other than
// their surface, and a shadow cascade's or height capture's view
// (View.time.z, y) is orthographic with a window of its own: they keep the
// varying (where the transform alone puts a placed draw, as the clips do).
float3 drawnPosition(SurfaceVaryings in, DrawRecord r) {
  float3 p = in.relPosition;
  if (r.placement != NO_PLACEMENT && (r.flags & 24u) == 0u && view.time.y + view.time.z < 0.5) {
    float2 ndc = in.position.xy * view.viewport.zw * float2(2.0, -2.0) + float2(-1.0, 1.0);
    float3 right = view.viewProj[0].xyz;
    float3 up = view.viewProj[1].xyz;
    float w = view.near / in.position.z;
    p = (right * (ndc.x / dot(right, right)) + up * (ndc.y / dot(up, up)) + view.viewProj[3].xyz) * w;
  }
  return p;
}

// A fragment as the custom shader's fragment stage takes it (`drawn`: the
// surface's position as drawn, `drawnPosition`).
CesiumFragment fragmentOf(SurfaceVaryings in, float3 geometric, float3 drawn) {
  DrawRecord r = drawRecord(in.ids.x);
  cesiumAnchor = drawn;
  CesiumFragment f;
  f.positionMC = in.positionMC;
  f.positionEC = drawn;
  f.positionWC = drawn + cameraPosition();
  f.normal = geometric;
  f.texCoord0 = in.uv;
  f.color0 = in.color * r.color;
  f.featureId = in.ids.y;
  f.screen = in.position.xy;
  f.time = view.time.x;
  f.instanceIndex = in.ids.z & ~SKIRT_BIT;
  if ((r.flags & 128u) != 0u) {
    f.instanceIndex = 0u; // a patch draw's `ids.z` is its trim
  }
  f.draw = in.ids.x;
  f.directory = r.attributes;
  // The fragment's feature, local to the draw (feature tables).
  f.localFeature = in.ids.y == 0u ? 0xffffffffu : in.ids.y - r.featureId;
  f.named0 = in.named0;
  f.named1 = in.named1;
  f.named2 = in.named2;
  f.named3 = in.named3;
  return f;
}

MaterialOutput materialOutput(float3 baseColor, float alpha, float metallic, float roughness,
                              float3 normal, float occlusion, float3 emissive, bool unlit) {
  MaterialOutput m;
  m.baseColor = baseColor;
  m.alpha = alpha;
  m.metallic = metallic;
  m.roughness = roughness;
  m.normal = normal;
  m.occlusion = occlusion;
  m.emissive = emissive;
  m.unlit = unlit;
  return m;
}

// A surface's alpha as the opaque pass's shading has it, for the passes
// that cut out or blend by alpha without shading: the material's (factor,
// tint, vertex color, base color texture), then the custom shader's
// (`fragmentMain`'s material alpha; the engine's leaves it). Called in
// uniform control flow: a `fragmentMain` may sample textures.
float materialAlpha(SurfaceVaryings in) {
  DrawRecord r = drawRecord(in.ids.x);
  Material material = materials[r.materialIndex];
  float4 sampled = materialTexture(material, TEXTURE_BASE_COLOR, in.uv);
  float4 color = material.baseColor * r.color * in.color;
  if (materialHasTexture(material, TEXTURE_BASE_COLOR)) {
    color *= sampled;
  }
  float3 geometric = normalize(in.normal);
  MaterialOutput custom = materialOutput(
      color.rgb, color.a, material.metallic, material.roughness, geometric, 1.0,
      material.emissive, (material.flags & 1u) != 0u || (r.flags & 2u) != 0u);
  cesiumFragmentStage(fragmentOf(in, geometric, drawnPosition(in, r)), custom);
  return custom.alpha * terrainAlpha(r, in);
}

// The opaque pass's discards: alpha cutoff, blended surfaces' translucent
// parts, mixed-LOD placeholders.
void cutOut(SurfaceVaryings in) {
  DrawRecord r = drawRecord(in.ids.x);
  Material material = materials[r.materialIndex];
  float alpha = materialAlpha(in);
  if ((material.flags & 12u) != 0u) {
    float cutoff = (material.flags & 8u) != 0u ? OPAQUE_ALPHA : material.alphaCutoff;
    if (alpha < cutoff) {
      discard;
    }
  }
  if (clippedOut(r, in.relPosition)) {
    discard;
  }
}

// A shadow map's caster: depth only, with the opaque pass's discards
// (alpha cutoff, mixed-LOD placeholders), so cut-out leaves and clipped
// coarse tiles cast what is drawn. Translucent terrain casts none, as
// glass.
[shader("fragment")]
void shadowFs(SurfaceVaryings in) {
  cutOut(in);
}

// A height capture's masked caster (Engine `addHeightCapture`): as
// `shadowFs`, but what is ground is drawn whatever its opacity, and what
// isn't is left out whatever its opacity.
[shader("fragment")]
void heightFs(SurfaceVaryings in) {
  terrainSeen = false;
  cutOut(in);
}

// The other casters: only the placeholders' clip. Without it a coarse
// tile kept while its children load cast its whole extent, over the
// children drawn beside it (coarse terrain lies meters above the fine),
// shadowing everything near the camera until they had all loaded.
[shader("fragment")]
void shadowPlaceholderFs(SurfaceVaryings in) {
  DrawRecord r = drawRecord(in.ids.x);
  if (clippedOut(r, in.relPosition)) {
    discard;
  }
}

// The depth and normal prepass (ambient occlusion reads it): the surface's
// normal (geometric, facing the camera), with the opaque pass's discards.
[shader("fragment")]
float4 prepassFs(SurfaceVaryings in, bool frontFacing : SV_IsFrontFace) : SV_Target0 {
  cutOut(in);
  float3 n = normalize(in.normal);
  if (!frontFacing) {
    n = -n;
  }
  return float4(n, 1.0);
}

// A trimmed patch face's per-pixel test (RecordFlags.patches; coverage.slang,
// src/brep/gpuTrims.ts): the fragment's (u, v) from the face rect's corner
// (`uv`), against the trim data its vertices carried (`ids.z`: the offset + 1
// in the draw's table, 0 for none), kept inside or within half a pixel of
// the boundary, by fwidth(uv) per axis: pinholes at seams between faces
// close, and the edge lines draw over the dilation. The derivative is taken
// first, in uniform control flow.
bool trimCovered(SurfaceVaryings in) {
  float2 reach = 0.5 * fwidth(in.uv);
  uint at = in.ids.z;
  if (at == 0u) {
    return true;
  }
  DrawRecord r = drawRecord(in.ids.x);
  return covers(vertices, r.positionOffset + at - 1u, in.uv, reach);
}

// The casters' and the depth pass's fragment for a trimmed patch face: the
// placeholders' clip (`shadowPlaceholderFs`) and the trim.
[shader("fragment")]
void shadowTrimmedFs(SurfaceVaryings in) {
  bool covered = trimCovered(in);
  DrawRecord r = drawRecord(in.ids.x);
  if (!covered || clippedOut(r, in.relPosition)) {
    discard;
  }
}

// `prepassFs` for a trimmed patch face.
[shader("fragment")]
float4 prepassTrimmedFs(SurfaceVaryings in, bool frontFacing : SV_IsFrontFace) : SV_Target0 {
  bool covered = trimCovered(in);
  cutOut(in);
  if (!covered) {
    discard;
  }
  float3 n = normalize(in.normal);
  if (!frontFacing) {
    n = -n;
  }
  return float4(n, 1.0);
}

// The opaque pass's depth for materials that cut out (alpha mask, and
// blended surfaces' opaque parts): their alpha, sharpened to a pixel-wide
// ramp across the cutoff, as coverage (the pipeline's alpha to coverage),
// so the cut edges antialias across the samples as geometry's do; and the
// placeholders' clip.
[shader("fragment")]
float4 depthCoverageFs(SurfaceVaryings in) : SV_Target0 {
  DrawRecord r = drawRecord(in.ids.x);
  Material material = materials[r.materialIndex];
  float alpha = materialAlpha(in);
  float ramp = max(fwidth(alpha), 1e-4);
  if (clippedOut(r, in.relPosition)) {
    discard;
  }
  float cutoff = (material.flags & 8u) != 0u ? OPAQUE_ALPHA : material.alphaCutoff;
  return float4(0.0, 0.0, 0.0, clamp((alpha - cutoff) / ramp + 0.5, 0.0, 1.0));
}

// --- lights, shadows, occlusion --------------------------------------------------

float3 fresnelSchlick(float3 f0, float3 f90, float cosTheta) {
  float x = 1.0 - cosTheta;
  float x2 = x * x;
  return f0 + (f90 - f0) * x2 * x2 * x;
}

float smithVisibility(float alpha, float nDotL, float nDotV) {
  float a2 = alpha * alpha;
  float ggxV = nDotL * sqrt(nDotV * nDotV * (1.0 - a2) + a2);
  float ggxL = nDotV * sqrt(nDotL * nDotL * (1.0 - a2) + a2);
  float sum = ggxV + ggxL;
  return sum > 0.0 ? 0.5 / sum : 0.0;
}

float ggx(float alpha, float nDotH) {
  float a2 = alpha * alpha;
  float f = (nDotH * a2 - nDotH) * nDotH + 1.0;
  return a2 / (PI * f * f);
}

// A light's reflectance toward the camera, per unit of its illuminance:
// GGX specular and Lambert diffuse, times n·l (clamped as 1.x clamps it).
float3 directReflectance(float3 n, float3 v, float3 l, float3 f0, float3 diffuseColor, float alpha, float nDotV) {
  float3 h = normalize(v + l);
  float nDotL = clamp(dot(n, l), 0.001, 1.0);
  float vDotH = clamp(dot(v, h), 0.0, 1.0);
  float nDotH = clamp(dot(n, h), 0.0, 1.0);
  float3 f90 = float3(clamp(max(f0.r, max(f0.g, f0.b)) * 25.0, 0.0, 1.0));
  float3 fresnel = fresnelSchlick(f0, f90, vDotH);
  float3 specular = fresnel * smithVisibility(alpha, nDotL, nDotV) * ggx(alpha, nDotH);
  float3 diffuse = (1.0 - fresnel) * diffuseColor / PI;
  return (diffuse + specular) * nDotL;
}

// The point and spot lights of the pixel's froxel, reflected toward the
// camera: candela over distance squared, faded to nothing at its reach
// (glTF's window, (1 − (d/reach)⁴)², with no hard edge), within a spot's
// cone (glTF's falloff). Unshadowed.
float3 punctualLight(float2 pixel, float3 relPosition, float3 n, float3 v, float3 f0,
                     float3 diffuseColor, float alpha, float nDotV) {
  LightHeader h = lightTable.Load<LightHeader>(0);
  float3 sum = float3(0.0);
  if (h.grid.w < 0.5) {
    return sum;
  }
  float z = dot(relPosition, h.forward.xyz);
  if (z < h.depth.x || z >= h.forward.w) {
    return sum;
  }
  uint3 dims = uint3(h.grid.xyz);
  float2 uv = pixel * view.viewport.zw;
  uint i = min(uint(uv.x * float(dims.x)), dims.x - 1u);
  uint j = min(uint(uv.y * float(dims.y)), dims.y - 1u);
  uint k = min(uint(log(z / h.depth.x) * h.depth.y), dims.z - 1u);
  uint base = ((k * dims.y + j) * dims.x + i) * (1u + CLUSTER_LIGHTS);
  uint count = min(lightTable.Load(CLUSTERS_BYTES + base * 4u), CLUSTER_LIGHTS);
  for (uint t = 0u; t < CLUSTER_LIGHTS; t++) {
    if (t >= count) {
      break;
    }
    uint index = min(lightTable.Load(CLUSTERS_BYTES + (base + 1u + t) * 4u), MAX_VIEW_LIGHTS - 1u);
    Light light = lightTable.Load<Light>(LIGHT_HEADER_BYTES + index * LIGHT_BYTES);
    float3 toLight = light.position.xyz - relPosition;
    float d2 = max(dot(toLight, toLight), 1e-4);
    float3 l = toLight * rsqrt(d2);
    if (dot(n, l) <= 0.0) {
      continue;
    }
    float ratio2 = d2 / (light.position.w * light.position.w);
    float window = clamp(1.0 - ratio2 * ratio2, 0.0, 1.0);
    float3 illuminance = light.color.rgb * (window * window / d2);
    if (light.color.w > 0.5) {
      float cone = clamp(dot(light.direction.xyz, -l) * light.direction.w + light.cone.x, 0.0, 1.0);
      illuminance *= cone * cone;
    }
    sum += directReflectance(n, v, l, f0, diffuseColor, alpha, nDotV) * illuminance;
  }
  return sum;
}

float ambientOcclusion(float2 pixel) {
  if (shadows.fade.z < 0.5) {
    return 1.0;
  }
  uint2 p = uint2(pixel);
  uint words = (uint(view.viewport.x) + 3u) / 4u;
  uint word = aoWords[p.y * words + p.x / 4u];
  return float((word >> (8u * (p.x & 3u))) & 255u) / 255.0;
}

static const float SHADOW_SIZE = 2048.0;

// One cascade's light at a point: a 5 × 5 tent filter of depth
// comparisons from 9 bilinear ones (Castaño's optimized PCF, as The
// Witness and MJP's shadow samples): smooth edges where a 3 × 3 box of
// texel-spaced comparisons drew stair-steps wherever a texel spans several
// pixels. The point is pushed along its normal by 2 of the cascade's
// texels (the filter's reach); 1 outside the cascade. Its 3 × 3 taps
// unrolled: their weights are a small array indexed by them.
float cascadeLight(uint c, float3 relPosition, float3 n) {
  float4 p = mul(shadows.matrices[c], float4(relPosition + n * (shadows.texels[c] * 2.0), 1.0));
  float2 uv = float2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  if (any(uv < float2(0.0)) || any(uv > float2(1.0)) || p.z > 1.0) {
    return 1.0;
  }
  float texel = 1.0 / SHADOW_SIZE;
  float2 at = uv * SHADOW_SIZE;
  float2 base = floor(at + 0.5);
  float2 st = at + 0.5 - base;
  float2 origin = (base - 0.5) * texel;
  float3 uw = float3(4.0 - 3.0 * st.x, 7.0, 1.0 + 3.0 * st.x);
  float3 u = float3((3.0 - 2.0 * st.x) / uw.x - 2.0, (3.0 + st.x) / uw.y, st.x / uw.z + 2.0);
  float3 vw = float3(4.0 - 3.0 * st.y, 7.0, 1.0 + 3.0 * st.y);
  float3 v = float3((3.0 - 2.0 * st.y) / vw.x - 2.0, (3.0 + st.y) / vw.y, st.y / vw.z + 2.0);
  float lit = 0.0;
  [ForceUnroll]
  for (int j = 0; j < 3; j++) {
    [ForceUnroll]
    for (int i = 0; i < 3; i++) {
      float2 offset = float2(u[i], v[j]) * texel;
      lit += uw[i] * vw[j] * shadowMap.SampleCmpLevelZero(shadowSampler, float3(origin + offset, float(c)), p.z);
    }
  }
  return lit / 144.0;
}

// How much of the sun reaches a camera-relative position on a surface with
// geometric normal `n`: a 5 × 5 tent of comparisons (`cascadeLight`: a
// smooth edge about four texels wide), offset along the normal (no acne
// on surfaces at grazing angles to the sun), fading out at the
// shadows' far distance, blending between cascades.
float sunShadow(float3 relPosition, float3 n) {
  if (shadows.forward.w < 0.5) {
    return 1.0;
  }
  float depth = dot(relPosition, shadows.forward.xyz);
  if (depth >= shadows.fade.y) {
    return 1.0;
  }
  uint c = 0u;
  while (c < 3u && depth > shadows.splits[c]) {
    c++;
  }
  float lit = cascadeLight(c, relPosition, n);
  // Over the last tenth of a cascade, blend into the next: their texels
  // differ in size (and their bias with them), and a seam shows where one
  // gives way to the other.
  if (c < 3u) {
    float near = c > 0u ? shadows.splits[max(c, 1u) - 1u] : 0.0;
    float band = 0.1 * (shadows.splits[c] - near);
    float w = clamp((depth - (shadows.splits[c] - band)) / max(band, 1e-3), 0.0, 1.0);
    if (w > 0.0) {
      lit = lerp(lit, cascadeLight(c + 1u, relPosition, n), w);
    }
  }
  float fade = clamp((depth - shadows.fade.x) / max(shadows.fade.y - shadows.fade.x, 1e-3), 0.0, 1.0);
  return lerp(lit, 1.0, fade);
}

// Irradiance / π by normal (environment frame), from the irradiance cube:
// the exact cosine integral of the environment (1.x evaluates SH9, which
// leaks light across a sharp horizon).
float3 irradiance(float3 n) {
  return irradianceCube.SampleLevel(environmentSampler, n, 0.0).rgb;
}

float3 toEnvironment(float3 d) {
  return float3(dot(d, view.iblFrame[0].xyz), dot(d, view.iblFrame[1].xyz), dot(d, view.iblFrame[2].xyz));
}

// Texture coordinates in a globe tile's imagery slice (layout.ts
// packImagery): the slice may belong to an ancestor `up` levels above, in
// which this tile sits at (x, y). Tile v and offsets count from the south;
// slices store north at the top.
float2 imageryUv(uint packed, float2 uv) {
  uint up = (packed >> 12u) & 15u;
  float2 offset = float2(float((packed >> 16u) & 255u), float(packed >> 24u));
  float2 t = (offset + uv) / float(1u << up);
  return float2(t.x, 1.0 - t.y);
}

// Exact sRGB decode (imagery slices store sRGB-encoded unorm texels).
float3 srgbToLinear(float3 c) {
  return select(c <= float3(0.04045), c / 12.92, pow((c + 0.055) / 1.055, float3(2.4)));
}

// A surface's light toward the camera: scene-referred (pre-exposed, through
// the air) or, unlit, display-referred; its alpha for blended materials.
// `sceneShare` is the share of a scene-referred color's luminance that is
// scene light, not display-relative emission: it goes to the scene target's
// alpha, and the exposure meter (meter.slang) takes that share of the color.
struct Surface {
  float3 color;
  float alpha;
  bool unlit;
  float sceneShare;
};

Surface surface(float3 color, float alpha, bool unlit) {
  Surface s;
  s.color = color;
  s.alpha = alpha;
  s.unlit = unlit;
  s.sceneShare = 1.0;
  return s;
}

// Whether `shadeSurface` lights the surface (else stops at its alpha).
static bool surfaceLight = true;

Surface shadeSurface(SurfaceVaryings in, bool frontFacing, bool translucent) {
  DrawRecord r = drawRecord(in.ids.x);
  Material material = materials[r.materialIndex];
  uint flags = material.flags;

  // Everything that needs uniform control flow first: texture samples and
  // derivatives. Missing textures are 1×1 white defaults, gated by the
  // material's texture references (`materialHasTexture`).
  float4 baseColorSample = materialTexture(material, TEXTURE_BASE_COLOR, in.uv);
  float3 emissiveSample = materialTexture(material, TEXTURE_EMISSIVE, in.uv).rgb;
  float4 metallicRoughnessSample = materialTexture(material, TEXTURE_METALLIC_ROUGHNESS, in.uv);
  float3 normalSample = materialTexture(material, TEXTURE_NORMAL, in.uv).xyz;
  float occlusionSample = materialTexture(material, TEXTURE_OCCLUSION, in.uv).r;
  uint imageryPacked = r.imagerySlice;
  float4 imagerySample = imagery.Sample(
      imagerySampler, float3(imageryUv(imageryPacked, in.uv), float(max(imageryPacked & 4095u, 1u) - 1u)));
  uint lightsPacked = r.lightsSlice;
  float3 lightsSample = imagery.Sample(
      imagerySampler, float3(imageryUv(lightsPacked, in.uv), float(max(lightsPacked & 4095u, 1u) - 1u))).rgb;
  float3 drawn = drawnPosition(in, r);
  float3 dPdx = ddx(drawn);
  float3 dPdy = ddy(drawn);
  float2 dUVdx = ddx(in.uv);
  float2 dUVdy = ddy(in.uv);

  if ((flags & 512u) != 0u) {
    // 1.x compatibility diagnostic: gamma 2.2 decode of unorm color textures.
    baseColorSample = float4(pow(baseColorSample.rgb, float3(2.2)), baseColorSample.a);
    emissiveSample = pow(emissiveSample, float3(2.2));
  }

  float4 baseColor = material.baseColor * r.color * in.color;
  if (materialHasTexture(material, TEXTURE_BASE_COLOR)) {
    baseColor *= baseColorSample;
  }
  if (imageryPacked != 0u) {
    // The draw's tint (white unless a debug view tints tiles) still applies.
    baseColor = float4(srgbToLinear(imagerySample.rgb), 1.0) * r.color;
  }
  // Mixed-LOD placeholder: a coarse tile fills only the volumes of its
  // missing finer descendants, at its true depth (plan §13.1); clipped
  // terrain draws nothing inside its regions, and translucent terrain is
  // that much less opaque. After the depth prepass (`cutOutInDepth`) a
  // clipped or translucent terrain fragment has no depth of its own to
  // equal, so the depth test already left it out: only the placeholders'
  // cheap test is repeated.
  if (placeholderOut(r, in.relPosition)) {
    discard;
  }
  float terrain = 1.0;
  if (translucent || !cutOutInDepth) {
    terrain = terrainAlpha(r, in);
    if (terrain <= 0.0) {
      discard;
    }
  }
  float3 emissive = material.emissive;
  if (materialHasTexture(material, TEXTURE_EMISSIVE)) {
    emissive *= emissiveSample;
  }

  float metallic = material.metallic;
  float roughness = material.roughness;
  if (materialHasTexture(material, TEXTURE_METALLIC_ROUGHNESS)) {
    roughness *= metallicRoughnessSample.g;
    metallic *= metallicRoughnessSample.b;
  }
  metallic = clamp(metallic, 0.0, 1.0);
  roughness = clamp(roughness, 0.0, 1.0);

  // Shading normal.
  float3 n = normalize(in.normal);
  if (!frontFacing) {
    n = -n;
  }
  if (materialHasTexture(material, TEXTURE_NORMAL)) {
    float3 t;
    float3 b;
    if (in.tangent.w != 0.0) {
      t = normalize(in.tangent.xyz - n * dot(n, in.tangent.xyz));
      b = cross(n, t) * in.tangent.w;
    } else {
      // Cotangent frame from screen-space derivatives (no TANGENT attribute).
      float3 dp2perp = cross(dPdy, n);
      float3 dp1perp = cross(n, dPdx);
      float3 tt = dp2perp * dUVdx.x + dp1perp * dUVdy.x;
      float3 bb = dp2perp * dUVdx.y + dp1perp * dUVdy.y;
      float invMax = rsqrt(max(dot(tt, tt), dot(bb, bb)) + 1e-20);
      t = tt * invMax;
      b = bb * invMax;
    }
    float3 tsNormal = (normalSample * 2.0 - 1.0) * float3(material.normalScale, material.normalScale, 1.0);
    n = normalize(t * tsNormal.x + b * tsNormal.y + n * tsNormal.z);
  }
  float occlusion = 1.0;
  if (materialHasTexture(material, TEXTURE_OCCLUSION)) {
    occlusion = 1.0 + material.occlusionStrength * (occlusionSample - 1.0);
  }
  // 1.x clamps n·l to at least 0.001, which lets a little sun light reach
  // surfaces facing away from it; 2.0 gives them none.
  float3 geometric = normalize(in.normal);
  if (!frontFacing) {
    geometric = -geometric;
  }

  // The custom shader's material (CustomShader.ts's defaults: unchanged).
  CesiumFragment fragment = fragmentOf(in, geometric, drawn);
  MaterialOutput custom = materialOutput(
      baseColor.rgb, baseColor.a, metallic, roughness, n, occlusion, emissive,
      (flags & 1u) != 0u || (r.flags & 2u) != 0u);
  cesiumFragmentStage(fragment, custom);
  baseColor = float4(custom.baseColor, custom.alpha * terrain);
  // Alpha mask, on the custom shader's alpha (the depth pass's cut, else here).
  if (!cutOutInDepth && (flags & 4u) != 0u && baseColor.a < material.alphaCutoff) {
    discard;
  }
  if (custom.unlit) {
    return surface(baseColor.rgb, baseColor.a, true);
  }
  // Runs whose light nobody uses stop here, their alpha known
  // (`fsListSamples`). Nothing below may need uniform control flow
  // (implicit derivatives, Sample): this return isn't uniform.
  if (!surfaceLight) {
    return surface(float3(0.0), baseColor.a, false);
  }
  metallic = clamp(custom.metallic, 0.0, 1.0);
  roughness = clamp(custom.roughness, 0.0, 1.0);
  n = normalize(custom.normal);
  occlusion = custom.occlusion;
  emissive = custom.emissive;

  float3 v = -normalize(drawn);
  float3 l = normalize(view.sunDirection.xyz);
  float nDotV = clamp(dot(n, v), 0.0, 1.0);
  float3 f0 = lerp(float3(0.04), baseColor.rgb, metallic);
  float3 diffuseColor = baseColor.rgb * (1.0 - metallic);
  float alpha = roughness * roughness;

  // Direct sun light.
  float3 sunReflected = directReflectance(n, v, l, f0, diffuseColor, alpha, nDotV);
  bool moonShadows = shadows.fade.w > 0.5;
  float sunVisible = dot(n, l) > 0.0 ? 1.0 : 0.0;
  if (sunVisible > 0.0 && !moonShadows) {
    sunVisible *= sunShadow(drawn, geometric);
  }
  float3 direct = sunReflected * sunIlluminance(drawn) * sunVisible;
  // The Moon's light: the sun's, reflected (its share in `moonLight.w`),
  // through the air toward it, shadowed by the cascades at night.
  float3 moonward = view.moonLight.xyz;
  if (view.moonLight.w > 0.0 && view.sunLight.z > 0.5 && dot(n, moonward) > 0.0) {
    float moonVisible = 1.0;
    if (moonShadows) {
      moonVisible = sunShadow(drawn, geometric);
    }
    direct += directReflectance(n, v, moonward, f0, diffuseColor, alpha, nDotV)
        * sunlightThroughAir(drawn, moonward) * view.moonLight.w * moonVisible;
  }
  direct += punctualLight(in.position.xy, drawn, n, v, f0, diffuseColor, alpha, nDotV);

  // Image-based lighting (Fdez-Agüera 2019 multiple scattering).
  float2 lut = brdfLut.SampleLevel(environmentSampler, float2(nDotV, roughness), 0.0).rg;
  float3 iblF90 = max(float3(1.0 - roughness), f0);
  float3 fss = fresnelSchlick(f0, iblF90, nDotV);
  float3 fssEss = fss * lut.x + lut.y;
  float ems = 1.0 - lut.x - lut.y;
  float3 averageF = f0 + (1.0 - f0) / 21.0;
  float3 fmsEms = fssEss * averageF * ems / (1.0 - averageF * ems);
  float3 diffuseIbl = irradiance(toEnvironment(n)) * (fmsEms + (1.0 - fssEss - fmsEms) * diffuseColor);
  float3 reflected = toEnvironment(reflect(-v, n));
  float3 radiance = specularEnvironment.SampleLevel(environmentSampler, reflected, roughness * view.specularMaxLod).rgb;
  float3 specularIbl = radiance * fssEss;
  // The sky's light where the surroundings hide it (screen-space ambient
  // occlusion), with light bouncing between bright surfaces (Jimenez et
  // al.'s multi-bounce fit on the diffuse color) and its share of the
  // reflections (Lagarde's specular occlusion).
  float ao = translucent ? 1.0 : ambientOcclusion(in.position.xy);
  float3 ma = 2.0404 * diffuseColor - 0.3324;
  float3 mb = -4.7951 * diffuseColor + 0.6417;
  float3 mc = 2.7552 * diffuseColor + 0.6903;
  float3 aoDiffuse = max(float3(ao), ((ao * ma + mb) * ao + mc) * ao);
  float aoSpecular = clamp(pow(nDotV + ao, exp2(-16.0 * roughness - 1.0)) - 1.0 + ao, 0.0, 1.0);
  float3 indirect = (diffuseIbl * aoDiffuse * view.diffuseIbl + specularIbl * aoSpecular * view.specularIbl) * occlusion;

  // Pre-exposed (plan §4.2). Emission is display-relative: authored
  // emissive colors look the same at any exposure.
  float3 emitted = float3(0.0);
  if (lightsPacked != 0u && view.iblFrame[0].w > 0.5) {
    float3 lights = srgbToLinear(lightsSample);
    emitted = max(lights - CITY_LIGHTS_FLOOR, float3(0.0)) / (1.0 - CITY_LIGHTS_FLOOR) * CITY_LIGHTS_LUMINANCE;
  }
  float3 lit = (direct + indirect + emitted) * view.exposure;
  float3 shown = emissive;
  if (view.sunLight.w > 0.5) {
    // The air's light is pre-exposed in the volume. From high up it's
    // marched per vertex instead; between, both, blended.
    float march = view.bodyRadii.w;
    AerialPerspective ap;
    ap.inscatter = float3(0.0);
    ap.transmittance = float3(1.0);
    if (march < 1.0) {
      ap = aerialPerspective(in.position.xy, drawn);
    }
    if (march > 0.0) {
      AerialPerspective a;
      a.inscatter = in.airInscatter;
      a.transmittance = in.airTransmittance;
      // From high up, the screen grid: per vertex, the coarsest tiles'
      // triangles drew the day/night line in blocky streaks.
      float screen = view.iblFrame[1].w;
      if (screen > 0.0) {
        float2 uv = in.position.xy * view.viewport.zw;
        a.inscatter = lerp(a.inscatter, aerialScreen.SampleLevel(environmentSampler, float3(uv, 0.0), 0.0).rgb, screen);
        a.transmittance = lerp(a.transmittance, aerialScreen.SampleLevel(environmentSampler, float3(uv, 1.0), 0.0).rgb, screen);
      }
      ap.inscatter = lerp(ap.inscatter, a.inscatter, march);
      ap.transmittance = lerp(ap.transmittance, a.transmittance, march);
    }
    lit = lit * ap.transmittance + ap.inscatter;
    shown = emissive * ap.transmittance;
  }
  // Below fp16's largest value: an overflow to infinity (a lit scene at a
  // night exposure) poisoned the exposure meter's average with NaN.
  float3 total = min(lit + shown, float3(60000.0));
  Surface s = surface(total, baseColor.a, false);
  // The exposure meter reads the scene's light only: emission is added
  // after the exposure, so metered with it, a bright emitter lowered the
  // exposure, which raised the emission's share of the image, and so on
  // down to the floor. Pure emission (no scene light) has share 0, like
  // unlit content, and is left out of the reading.
  float3 luminance = float3(0.2126, 0.7152, 0.0722);
  float shownLuminance = dot(shown, luminance);
  if (shownLuminance > 0.0) {
    s.sceneShare = clamp(dot(lit, luminance) / (dot(lit, luminance) + shownLuminance), 0.0, 1.0);
  }
  return s;
}

struct FsOut {
  float4 color : SV_Target0;
  uint2 featureId : SV_Target1; // (lo16, hi16): rg16uint target
  // Display-referred color (unlit), shown without tonemapping; alpha is
  // coverage. Scene-referred light goes to `color`.
  float4 display : SV_Target2;
};

FsOut shadeOpaque(SurfaceVaryings in, bool frontFacing) {
  Surface s = shadeSurface(in, frontFacing, false);
  if (!cutOutInDepth &&
      (materials[drawRecord(in.ids.x).materialIndex].flags & 8u) != 0u && s.alpha < OPAQUE_ALPHA) {
    discard;
  }
  FsOut out;
  out.featureId = uint2(in.ids.y & 0xffffu, in.ids.y >> 16u);
  if (s.unlit) {
    // Unlit color is display-referred (photographs: globe imagery,
    // photogrammetry such as Google's tiles): it goes to the display target,
    // which the present pass shows as is, as glTF's KHR_materials_unlit and
    // 1.x (HDR off by default) do. No light reaches the scene target here,
    // and alpha 0 keeps it out of the exposure meter (meter.slang): a view
    // full of symbols, or of unlit photogrammetry, doesn't meter as black.
    out.color = float4(0.0);
    out.display = float4(s.color, 1.0);
  } else {
    out.color = float4(s.color, s.sceneShare);
    out.display = float4(0.0);
  }
  return out;
}

[shader("fragment")]
FsOut fs(SurfaceVaryings in, bool frontFacing : SV_IsFrontFace) {
  return shadeOpaque(in, frontFacing);
}

// A trimmed patch face's opaque pass (RecordFlags.patches, `fsTrimmed`): the
// same shading, and a fragment outside the face's trim discarded. After the
// depth prepass (`cutOutInDepth`) the depth pass has done it (`shadowTrimmedFs`
// with the same test), so only the fragments that survived reach here at
// equal depth and the test isn't repeated. Without a prepass the shading
// goes first (it needs uniform control flow) and the discard follows.
[shader("fragment")]
FsOut fsTrimmed(SurfaceVaryings in, bool frontFacing : SV_IsFrontFace) {
  bool covered = cutOutInDepth || trimCovered(in);
  FsOut out = shadeOpaque(in, frontFacing);
  if (!covered) {
    discard;
  }
  return out;
}

// A point's symbol, antialiased (`opaquePoints`): its alpha, the style's
// coverage of the pixel (vector/VectorStyle.ts), as the share of the
// pixel's four samples it covers, as alpha-to-coverage does; that reads
// location 0's alpha, which unlit draws leave 0 (the exposure meter). The
// samples covered turn with the pixel, so overlapping symbols mix.
struct FsPointsOut {
  float4 color : SV_Target0;
  uint2 featureId : SV_Target1;
  float4 display : SV_Target2;
  uint mask : SV_Coverage;
};

[shader("fragment")]
FsPointsOut fsPoints(SurfaceVaryings in, bool frontFacing : SV_IsFrontFace) {
  Surface s = shadeSurface(in, frontFacing, false);
  uint samples = uint(round(clamp(s.alpha, 0.0, 1.0) * 4.0));
  if (samples == 0u) {
    discard;
  }
  uint turn = (uint(in.position.x) + 2u * uint(in.position.y)) % 4u;
  uint covered = (1u << samples) - 1u;
  FsPointsOut out;
  out.mask = ((covered << turn) | (covered >> (4u - turn))) & 15u;
  out.featureId = uint2(in.ids.y & 0xffffu, in.ids.y >> 16u);
  if (s.unlit) {
    out.color = float4(0.0);
    out.display = float4(s.color, 1.0);
  } else {
    out.color = float4(s.color, s.sceneShare);
    out.display = float4(0.0);
  }
  return out;
}

// --- translucency (plan §3.5) ----------------------------------------------------
//
// Blended materials' surfaces, shaded as the opaque pass shades them
// (`shadeSurface`), then put in order over what the opaque pass drew
// (composite.slang). Two ways:
//
// - "exact": every fragment into a list per pixel (`fsList`), sorted and
//   blended front to back when composited. Exact up to the lists' memory,
//   which grows to what a view needs; the reference the other is tested
//   against.
// - "moments": moment-based order-independent transparency (Münstermann,
//   Krumpen, Klein and Peters 2018). A first pass sums each pixel's
//   absorbance and its first four moments in depth (`fsMoments`); a second
//   shades and weights each fragment by the light reaching it through what
//   lies in front, reconstructed from those moments (`fsMomentColor`).
//   Bounded memory, two passes over the translucent geometry.
//
// Their parts at least `OPAQUE_ALPHA` opaque draw in the opaque pass
// instead (`depthCoverageFs`). Neither has a depth attachment: a fragment
// tests the opaque pass's depth itself, at each of its samples (a storage
// write disables early depth tests, so occluded fragments are tested here,
// not by the hardware).
//
// The lists' pass runs multisampled, so glass's own edges antialias: each
// node keeps the samples its fragment covers and is in front of (`next`'s
// top four bits), and `sortLists` blends each sample on its own. Where a
// fragment shader's storage writes run once per covered sample (Apple's
// GPUs, Metal: each run seeing the whole coverage mask, so every layer went
// into its list once a sample, plan §3.5), the pass runs per sample
// explicitly (`fsListSamples`) and only the first covered sample's run
// writes; elsewhere once a pixel (`fsList`). RenderContext probes which.
// The moments' passes run single-sampled (their targets multisampled
// would take four times the memory): their share of a pixel is the share
// of the opaque samples they are in front of, and glass's own edges alias.

struct TranslucentParams {
  uint width;
  uint height;
  // The lists: their first node's word, and how many nodes fit.
  uint nodesBase;
  uint capacity;
  // The moments' depth: ln(distance), from ln(near) over ln(far / near)
  // mapped to [-1, 1].
  float logNear;
  float invLogRange;
  // The moments' bias toward a known distribution (their precision).
  float bias;
  float pad;
};

[[vk::binding(0, 3)]] ConstantBuffer<TranslucentParams> translucency;
// Word 0: the nodes used (past `capacity`: those that didn't fit);
// from LIST_HEADER, each pixel's first node plus one (0: none); from
// `nodesBase`, nodes of four words: color (rg, then b and alpha as halves,
// alpha negative for display-referred color, `EMISSION_NODE` for a layer's
// emission), depth, and the next node plus one (low 28 bits) with the samples
// the node covers (top four).
[[vk::binding(1, 3)]] RWStructuredBuffer<Atomic<uint>> lists;
[[vk::binding(2, 3)]] DepthTexture2DMS opaqueDepth;
// The moments pass's sums, read by the color pass: bindings 3 and 4,
// read-only storage textures (they don't count against the sampled
// textures' limit), declared by a unit of their own for the device's
// formats (RenderContext `momentBindings`), read through these.
__target_intrinsic(wgsl, "textureLoad(momentsZero, $0)")
float4 loadMomentsZero(uint2 p);
__target_intrinsic(wgsl, "textureLoad(momentsHigher, $0)")
float4 loadMomentsHigher(uint2 p);

static const uint LIST_HEADER = 4u;
// A node's `next` word: the next node plus one, below its samples' bits.
static const uint LIST_SAMPLE_SHIFT = 28u;
// In a node's alpha, past any alpha: its color is a layer's emission,
// premultiplied, which hides nothing. A layer with no emission has no such
// node, so emission costs list bytes only where it is drawn (`appendNode`).
static const float EMISSION_NODE = 2.0;

// Blended surfaces draw here below this alpha: a little past where the
// opaque pass takes them (`OPAQUE_ALPHA`), so a pixel its depth and
// shading stages decide differently (rounding, along an alpha gradient)
// is drawn here, not left a hole. In the overlap both draw: the layer over
// its own opaque self, the same color.
static const float TRANSLUCENT_ALPHA = 0.9995;

// WebGPU's standard 4× sample positions, from the pixel's center.
static const float2 SAMPLE_OFFSETS[4] = {
  float2(-0.125, -0.375), float2(0.375, -0.125), float2(-0.375, 0.125), float2(0.125, 0.375)
};

// The most samples a pixel has (4× MSAA); the loop below ends by this.
static const uint MAX_SAMPLES = 4u;

// Of the samples in `mask`, those where a fragment is in front of the
// opaque pass's depth (reverse-Z: nearer is greater), its depth taken at
// each from its slope (`depthSlope`), as the hardware tests it: at the
// pixel's center alone, glass meeting its frame, the depths nearly equal,
// came out in front of some samples and behind others at random, speckling
// the seam. `position` may be a sample's (shading per sample) or the
// pixel's center.
uint visibleSamples(float4 position, float2 slope, uint mask) {
  int2 p = int2(uint2(position.xy));
  uint width, height, samples;
  opaqueDepth.GetDimensions(width, height, samples);
  float2 center = frac(position.xy) - 0.5;
  uint visible = 0u;
  for (uint i = 0u; i < MAX_SAMPLES; i++) {
    if (i >= samples) {
      break;
    }
    float z = position.z;
    if (samples == 4u) {
      z += dot(slope, SAMPLE_OFFSETS[i] - center);
    }
    if ((mask & (1u << i)) != 0u && z >= opaqueDepth.Load(p, int(i))) {
      visible |= 1u << i;
    }
  }
  return visible;
}

// The share of the opaque pass's samples a fragment is in front of.
float uncovered(float4 position, float2 slope) {
  uint width, height, samples;
  opaqueDepth.GetDimensions(width, height, samples);
  uint visible = visibleSamples(position, slope, 0xffffffffu);
  return float(countbits(visible)) / float(samples);
}

// Depth's change per pixel (in uniform control flow, before any discard).
float2 depthSlope(float4 position) {
  return float2(ddx(position.z), ddy(position.z));
}

// One node at the head of its pixel's list.
void listNode(SurfaceVaryings in, float3 color, float alpha, uint visible) {
  uint index = lists[0].add(1u);
  if (index >= translucency.capacity) {
    return;
  }
  uint node = translucency.nodesBase + index * 4u;
  lists[node].store(packHalf2x16(color.rg));
  lists[node + 1u].store(packHalf2x16(float2(color.b, alpha)));
  lists[node + 2u].store(asuint(in.position.z));
  uint pixel = uint(in.position.y) * translucency.width + uint(in.position.x);
  uint next = lists[LIST_HEADER + pixel].exchange(index + 1u);
  lists[node + 3u].store(next | (visible << LIST_SAMPLE_SHIFT));
}

// A fragment into its pixel's list, with the samples (of `mask`, those
// it covers) it is in front of the opaque surfaces at. Its emission, if any,
// is a node of its own, so `sortLists` can keep it out of the scene light the
// exposure meter reads. That node goes in last: nodes of one depth sort in
// list order, newest first, so the emission is seen through the layers in
// front of it and not through its own layer.
void appendNode(SurfaceVaryings in, float2 slope, Surface s, uint mask) {
  if (s.alpha >= TRANSLUCENT_ALPHA) {
    return; // drawn opaque (`cutOut`)
  }
  float alpha = clamp(s.alpha, 0.0, 1.0);
  uint visible = visibleSamples(in.position, slope, mask);
  if (alpha <= 0.0 || visible == 0u) {
    return;
  }
  if (s.unlit) {
    listNode(in, s.color, -alpha, visible);
    return;
  }
  listNode(in, s.color * s.sceneShare, alpha, visible);
  if (s.sceneShare < 1.0) {
    listNode(in, s.color * (1.0 - s.sceneShare) * alpha, EMISSION_NODE, visible);
  }
}

// Once a pixel: the fragment and the samples it covers.
[shader("fragment")]
void fsList(SurfaceVaryings in, bool frontFacing : SV_IsFrontFace, uint mask : SV_Coverage) {
  float2 slope = depthSlope(in.position);
  Surface s = shadeSurface(in, frontFacing, true);
  appendNode(in, slope, s, mask);
}

// Once a covered sample. Only the run for the first sample in `mask`
// writes: where every run sees the whole coverage mask (Metal), that is
// one node with all of it; where a run's mask is its own sample alone,
// every run writes, one node a sample. The others stop shading once its
// textures are sampled (in uniform control flow): lighting each sample
// doubled the pass's time on Metal.
[shader("fragment")]
void fsListSamples(SurfaceVaryings in, bool frontFacing : SV_IsFrontFace, uint mask : SV_Coverage,
                   uint sample : SV_SampleIndex) {
  float2 slope = depthSlope(in.position);
  bool writes = sample == firstbitlow(mask);
  surfaceLight = writes;
  Surface s = shadeSurface(in, frontFacing, true);
  if (writes) {
    appendNode(in, slope, s, mask);
  }
}

// Distance from the camera warped to [-1, 1] (logarithmic, as the paper
// recommends: layers far apart in depth stay apart in the moments).
float momentDepth(float3 relPosition) {
  float t = (log(max(length(relPosition), 1e-6)) - translucency.logNear) * translucency.invLogRange;
  return clamp(t, 0.0, 1.0) * 2.0 - 1.0;
}

// A blended surface's alpha (`shadeSurface`'s, without its light), with the
// opaque pass's placeholder clip.
float blendedAlpha(SurfaceVaryings in) {
  DrawRecord r = drawRecord(in.ids.x);
  float alpha = materialAlpha(in);
  if (clippedOut(r, in.relPosition)) {
    discard;
  }
  return clamp(alpha, 0.0, 1.0);
}

struct MomentsOut {
  float zero : SV_Target0;    // absorbance, -ln(1 - alpha), summed
  float4 higher : SV_Target1; // its first four moments in depth
};

[shader("fragment")]
MomentsOut fsMoments(SurfaceVaryings in) {
  float2 slope = depthSlope(in.position);
  float blended = blendedAlpha(in);
  float alpha = blended * uncovered(in.position, slope);
  if (alpha <= 0.0 || blended >= TRANSLUCENT_ALPHA) {
    discard;
  }
  float absorbance = -log(1.0 - alpha);
  float z = momentDepth(drawnPosition(in, drawRecord(in.ids.x)));
  float z2 = z * z;
  MomentsOut out;
  out.zero = absorbance;
  out.higher = float4(z, z2, z2 * z, z2 * z2) * absorbance;
  return out;
}

// The light reaching depth z through what lies in front: from the total
// absorbance b0 and its four moments, the bound on absorbance in front of z
// over all distributions with those moments, a quarter of the way from the
// lower to the upper (Münstermann et al. 2018, after Peters and Klein 2015's
// Hamburger four-moment reconstruction).
static const float MOMENT_OVERESTIMATION = 0.25;

float transmittanceBefore(float b0, float4 sums, float z) {
  if (b0 < 0.00100050033) {
    return 1.0;
  }
  float4 b = lerp(sums / b0, float4(0.0, 0.375, 0.0, 0.375), translucency.bias);
  // Cholesky factorization of the Hankel matrix of (1, b1, b2; b1, b2, b3;
  // b2, b3, b4), its nontrivial entries.
  float l21d11 = b.z - b.x * b.y;
  float d11 = b.y - b.x * b.x;
  float invD11 = 1.0 / d11;
  float l21 = l21d11 * invD11;
  float d22 = (b.w - b.y * b.y) - l21d11 * l21;
  // Solve B c = (1, z, z²) by substitution.
  float3 c = float3(1.0, z, z * z);
  c.y -= b.x;
  c.z -= b.y + l21 * c.y;
  c.y *= invD11;
  c.z /= d22;
  c.y -= l21 * c.z;
  c.x -= dot(c.yz, b.xy);
  // A lone layer seen at its own depth: z is a support point and the
  // quadratic degenerates (in 32-bit floats its division gave NaN, a black
  // pixel, about one time in six). The weight there is the overestimation.
  if (!(abs(c.z) > 1e-5 * max(abs(c.x), abs(c.y)))) {
    return exp(-b0 * MOMENT_OVERESTIMATION);
  }
  // The roots of c0 + c1 x + c2 x² are the other two support points.
  float p = c.y / c.z;
  float q = c.x / c.z;
  float r = sqrt(max(p * p * 0.25 - q, 0.0));
  float z1 = -p * 0.5 - r;
  float z2 = -p * 0.5 + r;
  // The weights in front of z: the quadratic through (z, overestimation),
  // (z1, 1 if in front), (z2, the same), its expectation under the moments.
  float f0 = MOMENT_OVERESTIMATION;
  float f1 = z1 < z ? 1.0 : 0.0;
  float f2 = z2 < z ? 1.0 : 0.0;
  float f01 = (f1 - f0) / (z1 - z);
  float f12 = (f2 - f1) / (z2 - z1);
  float f012 = (f12 - f01) / (z2 - z);
  float k1 = f01 - f012 * z1;
  float p2 = f012;
  float p1 = k1 - f012 * z;
  float p0 = f0 - k1 * z;
  float absorbance = p0 + dot(b.xy, float2(p1, p2));
  return clamp(exp(-b0 * absorbance), 0.0, 1.0);
}

struct AccumulatedOut {
  // Scene-referred light weighted by the light reaching it (rgb), and the
  // weights summed (a, over every fragment, lit or not).
  float4 lit : SV_Target0;
  // Display-referred (unlit) color, the same (rgb), and the luminance of the
  // scene's light in `lit`, emission left out, the same (a: the exposure meter).
  float4 unlit : SV_Target1;
};

[shader("fragment")]
AccumulatedOut fsMomentColor(SurfaceVaryings in, bool frontFacing : SV_IsFrontFace) {
  float2 slope = depthSlope(in.position);
  Surface s = shadeSurface(in, frontFacing, true);
  float alpha = clamp(s.alpha, 0.0, 1.0) * uncovered(in.position, slope);
  if (alpha <= 0.0 || s.alpha >= TRANSLUCENT_ALPHA) {
    discard;
  }
  uint2 p = uint2(in.position.xy);
  float b0 = loadMomentsZero(p).r;
  float4 sums = loadMomentsHigher(p);
  float w = transmittanceBefore(b0, sums, momentDepth(drawnPosition(in, drawRecord(in.ids.x)))) * alpha;
  // Bright layers summed stay below fp16's largest value.
  float3 weighted = min(s.color * w, float3(16384.0));
  AccumulatedOut out;
  out.lit = float4(s.unlit ? float3(0.0) : weighted, w);
  float sceneLuminance = dot(weighted, float3(0.2126, 0.7152, 0.0722)) * s.sceneShare;
  out.unlit = s.unlit ? float4(weighted, 0.0) : float4(float3(0.0), sceneLuminance);
  return out;
}
