// The sky behind a view's scene (plan §4.2), appended to atmosphere.wgsl.
//
// Inside the atmosphere, each frame renders the view's sky-view table
// (Hillaire 2020 §5.3): the sky around the camera by zenith angle and
// azimuth from the sun, 192 × 108, with rows packed toward the horizon and
// columns toward the sun, marched once per texel with the transmittance and
// multiple-scattering tables, once per group of four wavelengths, added up
// in linear sRGB, pre-exposed. One more row holds the sun's radiance through
// the atmosphere. The sky pass then reads the table per pixel and adds the
// sun's disk.
//
// Above the atmosphere (where the table's parameterization doesn't hold),
// each pixel marches its own ray instead, once per group of wavelengths;
// rays that miss the atmosphere return at once, so it's cheap from space.
//
// Both draw a fullscreen triangle at the far plane, where nothing else is
// (depth equal to the cleared 0, reverse-Z). Output is pre-exposed linear
// sRGB, like the opaque pass.

struct Sky {
  position: vec3f,   // the camera, km, planet-centered (on the sphere's normal)
  exposure: f32,
  sun: vec3f,        // unit, toward the sun
  sunCos: f32,       // cosine of the sun's angular radius; > 1: no disk
  forward: vec3f,
  tanX: f32,         // tangent of the half field of view, horizontal
  right: vec3f,
  tanY: f32,
  up: vec3f,
  sunSolidAngle: f32,
  size: vec2f,       // the view, pixels
  steps: f32,
  bottomRadius: f32, // the planet's, km
  weights: array<vec4f, 8>, // the 8 bands to linear sRGB (cd/m² per W·m⁻²·sr⁻¹·nm⁻¹)
  // The aerial-perspective volume's distances along view rays, km: its
  // first and last slice (from the atmosphere's entry when the camera is
  // above it, to its far edge).
  aerialStart: f32,
  aerialEnd: f32,
  _pad0: f32,
  _pad1: f32,
};

@group(2) @binding(0) var<uniform> sky: Sky;

struct SkyVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) group: u32,
};

@vertex
fn skyVertex(@builtin(vertex_index) i: u32, @builtin(instance_index) group: u32) -> SkyVarying {
  let xy = vec2f(f32((i << 1u) & 2u), f32(i & 2u)) * 2.0 - 1.0;
  var out: SkyVarying;
  out.position = vec4f(xy, 0.0, 1.0);
  out.group = group;
  return out;
}

// Each group's sum stays below half of fp16's largest value (the sun's
// disk, pre-exposed, can come close).
const SKY_MAX = 30000.0;

fn toRgb(spectral: vec4f, group: u32) -> vec3f {
  let base = group * 4u;
  return spectral.x * sky.weights[base].xyz
    + spectral.y * sky.weights[base + 1u].xyz
    + spectral.z * sky.weights[base + 2u].xyz
    + spectral.w * sky.weights[base + 3u].xyz;
}

fn viewDirection(pixel: vec2f) -> vec3f {
  let ndc = vec2f(pixel.x / sky.size.x * 2.0 - 1.0, 1.0 - pixel.y / sky.size.y * 2.0);
  return normalize(sky.forward + sky.right * (ndc.x * sky.tanX) + sky.up * (ndc.y * sky.tanY));
}

// The sun's disk at `direction`: limb darkening (a linear law, u = 0.6)
// times the pixel's coverage (its distance to the rim, in pixels), as a
// fraction of the disk's mean radiance; 0 away from it.
fn sunDisk(direction: vec3f) -> f32 {
  if (sky.sunCos > 1.0) {
    return 0.0;
  }
  let cosAngle = dot(direction, sky.sun);
  let pixel = 2.0 * sky.tanY / sky.size.y; // radians per pixel, about
  let sinRadius = sqrt(max(0.0, 1.0 - sky.sunCos * sky.sunCos));
  let sinAngle = sqrt(max(0.0, 1.0 - cosAngle * cosAngle));
  if (cosAngle <= 0.0 || sinAngle >= sinRadius + pixel) {
    return 0.0;
  }
  let coverage = clamp((sinRadius - sinAngle) / pixel + 0.5, 0.0, 1.0);
  let x = min(sinAngle / sinRadius, 1.0);
  return (1.0 - 0.6 * (1.0 - sqrt(max(0.0, 1.0 - x * x)))) / (1.0 - 0.6 / 3.0) * coverage;
}

// --- per pixel (above the atmosphere) -------------------------------------------

@fragment
fn skyFragment(in: SkyVarying) -> @location(0) vec4f {
  let direction = viewDirection(in.position.xy);
  let s = march(sky.position, direction, sky.sun, 1e9, i32(sky.steps), false);
  var spectral = s.radiance * atmosphere.solarIrradiance;
  // The disk, seen through the whole atmosphere unless the planet is in
  // the way.
  let r = length(sky.position);
  let mu = dot(sky.position, direction) / r;
  if (!hitsGround(r, mu)) {
    spectral += atmosphere.solarIrradiance / sky.sunSolidAngle * sunDisk(direction) * s.transmittance;
  }
  return vec4f(min(toRgb(spectral, in.group) * sky.exposure, vec3f(SKY_MAX)), 1.0);
}

// --- the sky-view table ---------------------------------------------------------

const SKY_VIEW_SIZE = vec2f(192.0, 108.0);
// The sky's rows, then one for the sun's radiance.
const SKY_VIEW_ROWS = 109.0;
const SKY_VIEW_STEPS = 30;

// The camera's local frame: up, and the horizontal direction of the sun.
struct SkyFrame {
  up: vec3f,
  toward: vec3f,
  side: vec3f,
};

fn skyFrame() -> SkyFrame {
  let up = normalize(sky.position);
  var toward = sky.sun - up * dot(sky.sun, up);
  if (dot(toward, toward) < 1e-10) {
    // The sun at the zenith or nadir: any horizontal direction.
    toward = cross(up, select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(up.x) > 0.9));
  }
  toward = normalize(toward);
  return SkyFrame(up, toward, cross(up, toward));
}

// (zenith angle, azimuth cosine) of a table coordinate in [0, 1]². The
// horizon is the middle row; rows are packed quadratically toward it, from
// the zenith above and the nadir below. Columns go from toward the sun (0)
// to away (1), packed toward the sun (Hillaire's mappings).
fn skyViewAngles(unit: vec2f, r: f32, bottom: f32) -> vec2f {
  let beta = acos(sqrt(max(0.0, r * r - bottom * bottom)) / r);
  let horizon = PI - beta; // zenith angle of the horizon
  var zenith: f32;
  if (unit.y < 0.5) {
    let c = 1.0 - unit.y * 2.0;
    zenith = horizon * (1.0 - c * c);
  } else {
    let c = unit.y * 2.0 - 1.0;
    zenith = horizon + beta * c * c;
  }
  let c = unit.x * unit.x;
  return vec2f(zenith, 1.0 - 2.0 * c);
}

fn skyViewUnit(cosZenith: f32, cosAzimuth: f32, ground: bool, r: f32, bottom: f32) -> vec2f {
  let beta = acos(sqrt(max(0.0, r * r - bottom * bottom)) / r);
  let horizon = PI - beta;
  let zenith = acos(clamp(cosZenith, -1.0, 1.0));
  var y: f32;
  if (!ground) {
    let c = clamp(zenith / horizon, 0.0, 1.0);
    y = (1.0 - sqrt(1.0 - c)) * 0.5;
  } else {
    let c = clamp((zenith - horizon) / beta, 0.0, 1.0);
    y = sqrt(c) * 0.5 + 0.5;
  }
  let x = sqrt(clamp(0.5 - cosAzimuth * 0.5, 0.0, 1.0));
  return vec2f(x, y);
}

// One texel of the table, for this group's wavelengths (the groups add).
@fragment
fn skyViewFragment(in: SkyVarying) -> @location(0) vec4f {
  let r = length(sky.position);
  let f = skyFrame();
  var spectral = vec4f(0.0);
  if (in.position.y >= SKY_VIEW_SIZE.y) {
    // The sun's mean radiance through the atmosphere (the disk's color).
    if (sky.sunCos <= 1.0) {
      spectral = atmosphere.solarIrradiance / sky.sunSolidAngle * sunTransmittance(r, dot(f.up, sky.sun));
    }
  } else {
    let unit = vec2f(
      texelToUnit(in.position.x / SKY_VIEW_SIZE.x, SKY_VIEW_SIZE.x),
      texelToUnit(in.position.y / SKY_VIEW_SIZE.y, SKY_VIEW_SIZE.y),
    );
    let angles = skyViewAngles(unit, r, atmosphere.bottomRadius);
    let sinZenith = sin(angles.x);
    let cosAzimuth = angles.y;
    let sinAzimuth = sqrt(max(0.0, 1.0 - cosAzimuth * cosAzimuth));
    let direction = f.up * cos(angles.x) + (f.toward * cosAzimuth + f.side * sinAzimuth) * sinZenith;
    let s = march(sky.position, direction, sky.sun, 1e9, SKY_VIEW_STEPS, false);
    spectral = s.radiance * atmosphere.solarIrradiance;
  }
  return vec4f(min(toRgb(spectral, in.group) * sky.exposure, vec3f(SKY_MAX)), 1.0);
}

@group(2) @binding(1) var skyView: texture_2d<f32>;
@group(2) @binding(2) var skyViewSampler: sampler;

// The sky in `direction` from the table (pre-exposed), and whether the
// ground is in the way.
struct TableSky {
  color: vec3f,
  ground: bool,
};

fn skyFromTable(direction: vec3f) -> TableSky {
  let r = length(sky.position);
  let f = skyFrame();
  let cosZenith = dot(direction, f.up);
  let bottom = sky.bottomRadius;
  let ground = cosZenith < 0.0 && r * r * (cosZenith * cosZenith - 1.0) + bottom * bottom >= 0.0;
  let horizontal = direction - f.up * cosZenith;
  let length2 = dot(horizontal, horizontal);
  let cosAzimuth = select(1.0, dot(horizontal, f.toward) * inverseSqrt(length2), length2 > 1e-12);
  let unit = skyViewUnit(cosZenith, cosAzimuth, ground, r, bottom);
  // The horizon lies between two rows (sky above, ground below): stay on
  // this side of it, or the filter blends the sky with the ground.
  let half = SKY_VIEW_SIZE.y * 0.5;
  var row = unitToTexel(unit.y, SKY_VIEW_SIZE.y) * SKY_VIEW_SIZE.y;
  row = select(min(row, half - 0.5), max(row, half + 0.5), ground);
  let uv = vec2f(unitToTexel(unit.x, SKY_VIEW_SIZE.x), row / SKY_VIEW_ROWS);
  return TableSky(textureSampleLevel(skyView, skyViewSampler, uv, 0.0).rgb, ground);
}

// The sky from the table, and the sun's disk.
@fragment
fn skyFromTableFragment(in: SkyVarying) -> @location(0) vec4f {
  let direction = viewDirection(in.position.xy);
  let s = skyFromTable(direction);
  var color = s.color;
  if (!s.ground) {
    let sun = textureLoad(skyView, vec2i(0, i32(SKY_VIEW_SIZE.y)), 0).rgb;
    color += sun * sunDisk(direction);
  }
  return vec4f(min(color, vec3f(2.0 * SKY_MAX)), 1.0);
}

// A face of the environment cube from the view's table: the uniform is a
// 90° face view at the same camera, its exposure the reciprocal of the
// view's (the table is pre-exposed; the environment is in cd/m²).
@fragment
fn environmentFromTableFragment(in: SkyVarying) -> @location(0) vec4f {
  let s = skyFromTable(viewDirection(in.position.xy));
  return vec4f(s.color * sky.exposure, 1.0);
}

// --- the sun's light on the scene ----------------------------------------------

// The sun's illuminance on a surface facing it, by altitude and the sun's
// zenith cosine, in linear sRGB lux times SUN_LIGHT_SCALE (fp16 stops at
// 65,504; the sun outside the atmosphere is 132.5 klx). Columns are the
// zenith cosine, packed quadratically toward 0 (sunsets), rows the
// altitude, packed toward the ground. Below the horizon the disk sets: the
// visible part of it scales the light. The opaque pass reads it per pixel
// (opaque.wgsl `sunLight`, the same mapping).
const SUN_LIGHT_SIZE = vec2f(256.0, 64.0);
const SUN_LIGHT_SCALE = 1e-5;
const SUN_ANGULAR_RADIUS = 0.004675;

@fragment
fn sunLightFragment(in: SkyVarying) -> @location(0) vec4f {
  let a = atmosphere;
  let unit = vec2f(
    texelToUnit(in.position.x / SUN_LIGHT_SIZE.x, SUN_LIGHT_SIZE.x),
    texelToUnit(in.position.y / SUN_LIGHT_SIZE.y, SUN_LIGHT_SIZE.y),
  );
  let s = unit.x * 2.0 - 1.0;
  let mu = sign(s) * s * s;
  let r = a.bottomRadius + (a.topRadius - a.bottomRadius) * unit.y * unit.y;
  // The horizon's zenith cosine from this altitude, and how much of the
  // disk is above it (its center's elevation over the horizon, in radii).
  let muHorizon = -sqrt(max(0.0, 1.0 - (a.bottomRadius / r) * (a.bottomRadius / r)));
  let above = asin(clamp(mu, -1.0, 1.0)) - asin(muHorizon);
  let visible = clamp(0.5 + above / (2.0 * SUN_ANGULAR_RADIUS), 0.0, 1.0);
  let t = transmittanceToTop(r, max(mu, muHorizon + 1e-4));
  let rgb = toRgb(atmosphere.solarIrradiance * t * visible, in.group);
  return vec4f(rgb * SUN_LIGHT_SCALE, 1.0);
}

// --- aerial perspective --------------------------------------------------------

// Hillaire's froxel volume over the view's frustum, 32 × 32 × 32: the light
// the air scatters toward the camera between it and each froxel's
// distance (linear sRGB, cd/m², not exposed), and how much it dims what is
// there (transmittance, each channel the bands' average weighted by their
// color). Slices are spaced quadratically between aerialStart and
// aerialEnd. Each depth slice is one render pass (a 3D target's slice);
// the instance index carries the wavelength group (bit 0) and the slice.
// The opaque pass reads it per pixel (opaque.wgsl `aerialPerspective`).
const AERIAL_SIZE = 32.0;
const AERIAL_STEPS = 16;

struct Aerial {
  @location(0) inscatter: vec4f,
  @location(1) transmittance: vec4f,
};

@fragment
fn aerialFragment(in: SkyVarying) -> Aerial {
  let group = in.group & 1u;
  let slice = in.group >> 1u;
  let ndc = vec2f(in.position.x / AERIAL_SIZE * 2.0 - 1.0, 1.0 - in.position.y / AERIAL_SIZE * 2.0);
  let direction = normalize(sky.forward + sky.right * (ndc.x * sky.tanX) + sky.up * (ndc.y * sky.tanY));
  let w = (f32(slice) + 0.5) / AERIAL_SIZE;
  let distance = sky.aerialStart + (sky.aerialEnd - sky.aerialStart) * w * w;
  // Stop short of the ground: the surface there is the scene's, not the
  // planet's (march adds the ground only where it ends at the ground).
  let r = length(sky.position);
  let mu = dot(sky.position, direction) / r;
  var extent = distance;
  if (hitsGround(r, mu)) {
    extent = min(extent, sphereDistance(r, mu, atmosphere.bottomRadius, true) * 0.999);
  }
  let s = march(sky.position, direction, sky.sun, extent, AERIAL_STEPS, false);
  var total = vec3f(0.0);
  for (var b = 0u; b < 8u; b++) {
    total += sky.weights[b].xyz;
  }
  let base = group * 4u;
  let t = s.transmittance.x * sky.weights[base].xyz
    + s.transmittance.y * sky.weights[base + 1u].xyz
    + s.transmittance.z * sky.weights[base + 2u].xyz
    + s.transmittance.w * sky.weights[base + 3u].xyz;
  var out: Aerial;
  out.inscatter = vec4f(toRgb(s.radiance * atmosphere.solarIrradiance, group), 1.0);
  out.transmittance = vec4f(t / total, 1.0);
  return out;
}
