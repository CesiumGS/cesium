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
  // The camera, km, planet-centered: on the sphere's normal, or from above
  // the atmosphere scaled by `shape`.
  position: vec3f,
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
  // The aerial-perspective volume's slice distances, km: the same for every
  // ray (the opaque pass interpolates across rays at a distance), from the
  // camera (or the atmosphere's nearest point, from above it) to its far
  // edge past the horizon.
  aerialStart: f32,
  aerialEnd: f32,
  // The stars' exposure scale against a dark sky, when more open than the
  // view's (`starExposure`); 0: the view's.
  starExposure: f32,
  // The Moon's illuminance as a share of the sun's above the atmosphere,
  // for the light the air scatters by night (the sky's, the haze's); 0
  // while the sun is up, or without the Moon.
  moonLight: f32,
  // The Moon (`moonDisk`): its center's direction from the camera (unit),
  // and the sine of its angular radius (0: none).
  moon: vec3f,
  moonSize: f32,
  // Its axes (Earth-fixed): toward the Earth's center (selenographic
  // longitude and latitude 0) and its north pole; its radiance per unit of
  // the map's albedo, as a share of the sun's irradiance (sr⁻¹).
  moonX: vec3f,
  moonScale: f32,
  moonZ: vec3f,
  // Earthshine: the Earth's light on the Moon's night side, per unit of
  // the map's albedo, as a share of the sun's irradiance (sr⁻¹).
  earthshine: f32,
  // From the Moon toward the sun (unit).
  moonSun: vec3f,
  _pad3: f32,
  // From above the atmosphere, the scale per axis that makes the body's
  // ellipsoid the atmosphere's ground sphere (`marchedSky`); 1 otherwise.
  shape: vec3f,
  // Device pixels per CSS pixel: the stars' point spread is sized for the
  // display as it's seen (a star a CSS pixel or two, at any density).
  starPixel: f32,
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

// --- the stars ------------------------------------------------------------------

// The stars behind the atmosphere (plan §4.2, the night sky), in the
// celestial frame (ICRF), turned to Earth-fixed axes by the time: points,
// each splatted into the view's star layer through a point spread function
// (`starVertex`), over a smooth background (the Milky Way, a low-passed
// cube in cd/m²) (atmosphere/stars.ts). Seen through the atmosphere:
// dimmed by its transmittance along the ray (to space), so they fade
// toward the horizon and into twilight, and show as the exposure opens at
// night; at a daylight exposure they're far below black.
struct Stars {
  // Earth-fixed to ICRF, by rows; rows[0].w: 1 with stars, 0 without.
  rows: array<vec4f, 3>,
};

@group(3) @binding(0) var<uniform> stars: Stars;
@group(3) @binding(1) var starBackground: texture_cube<f32>;
@group(3) @binding(2) var starSampler: sampler;
// The view's stars, splatted (cd/m², not exposed).
@group(3) @binding(4) var starLayer: texture_2d<f32>;
// Per star: direction (ICRF) and illuminance (lux), then color.
@group(3) @binding(5) var<storage, read> starPoints: array<vec4f>;

// The stars' light at a pixel looking along `direction` (cd/m²).
fn starLight(pixel: vec2f, direction: vec3f) -> vec3f {
  let d = vec3f(
    dot(stars.rows[0].xyz, direction),
    dot(stars.rows[1].xyz, direction),
    dot(stars.rows[2].xyz, direction),
  );
  let background = textureSampleLevel(starBackground, starSampler, d, 0.0).rgb * stars.rows[0].w;
  return textureLoad(starLayer, vec2i(pixel), 0).rgb + background;
}

// A star's point spread function, in CSS pixels (`starPixel`): a sharp
// core (a Gaussian integrated over each pixel, so its light sums to the
// same wherever it falls: no shimmer as the view turns) and a faint wide
// halo, glare that shows only around the bright ones (Spencer et al.
// 1995's bloom, the eye's or a lens's scatter): a bright star, its core
// past white, is larger, as the eye sees it.
const STAR_CORE = 0.6;
const STAR_HALO = 3.0;
const STAR_HALO_SHARE = 0.05;
const STAR_MAX = 60000.0;

struct StarSplat {
  @builtin(position) position: vec4f,
  @location(0) center: vec2f,
  @location(1) @interpolate(flat) light: vec3f,
};

// erf (Winitzki's approximation, within 1e-4).
fn erfApprox(x: f32) -> f32 {
  let x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}

// One star as a square around it, as large as its halo stays visible at
// the most open exposure the stars get; off screen if behind the camera or
// too faint to show at all.
@vertex
fn starVertex(@builtin(vertex_index) corner: u32, @builtin(instance_index) index: u32) -> StarSplat {
  var out: StarSplat;
  out.position = vec4f(2.0, 2.0, 0.0, 1.0);
  out.center = vec2f(0.0);
  out.light = vec3f(0.0);
  let a = starPoints[index * 2u];
  let b = starPoints[index * 2u + 1u];
  // ICRF to Earth-fixed: the rows' transpose.
  let d = stars.rows[0].xyz * a.x + stars.rows[1].xyz * a.y + stars.rows[2].xyz * a.z;
  let z = dot(d, sky.forward);
  if (z < 0.01) {
    return out;
  }
  let ndc = vec2f(dot(d, sky.right) / (z * sky.tanX), dot(d, sky.up) / (z * sky.tanY));
  let pixel = vec2f((ndc.x * 0.5 + 0.5) * sky.size.x, (0.5 - ndc.y * 0.5) * sky.size.y);
  // Its illuminance over the pixel's solid angle there: radiance.
  let pixelAngle = 2.0 * sky.tanY / sky.size.y;
  let omega = pixelAngle * pixelAngle * z * z * z;
  let light = min(b.xyz * (a.w / omega), vec3f(STAR_MAX));
  let brightest = max(light.r, max(light.g, light.b)) * max(sky.exposure, sky.starExposure);
  if (brightest * 0.4 < 1e-4) {
    return out;
  }
  let haloSize = STAR_HALO * sky.starPixel;
  let halo = brightest * STAR_HALO_SHARE / (2.0 * PI * haloSize * haloSize);
  let radius = clamp(haloSize * sqrt(2.0 * log(max(halo / 0.002, 1.0))), 2.0 * sky.starPixel, 64.0);
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let p = pixel + corners[corner] * radius;
  out.position = vec4f(p.x / sky.size.x * 2.0 - 1.0, 1.0 - p.y / sky.size.y * 2.0, 0.0, 1.0);
  out.center = pixel;
  out.light = light;
  return out;
}

@fragment
fn starFragment(in: StarSplat) -> @location(0) vec4f {
  let d = in.position.xy - in.center;
  let core = STAR_CORE * sky.starPixel;
  let haloSize = STAR_HALO * sky.starPixel;
  let s = 1.0 / (sqrt(2.0) * core);
  let sharp = 0.25
    * (erfApprox((d.x + 0.5) * s) - erfApprox((d.x - 0.5) * s))
    * (erfApprox((d.y + 0.5) * s) - erfApprox((d.y - 0.5) * s));
  let halo = exp(-dot(d, d) / (2.0 * haloSize * haloSize)) / (2.0 * PI * haloSize * haloSize);
  return vec4f(in.light * mix(sharp, halo, STAR_HALO_SHARE), 0.0);
}

// The exposure the stars are shown at against `background` (pre-exposed,
// this group's share of the sky, `share` of the whole): the view's, or
// the stars' own (`View.starExposure`, the eye's view of them) where the
// sky is dark, fading out as the sky brightens toward a few percent of
// white (twilight's blue hides them, as it does to the eye).
fn starExposure(background: vec3f, share: f32) -> f32 {
  let y = dot(background, vec3f(0.2126, 0.7152, 0.0722)) / share;
  let dark = 1.0 - smoothstep(0.002, 0.03, y);
  return sky.exposure + max(sky.starExposure - sky.exposure, 0.0) * dark;
}

// --- the moon -------------------------------------------------------------------

// The Moon's albedo map (equirectangular, longitude 0 at the center, the
// near side; linear once sampled), with the stars' sampler.
@group(3) @binding(3) var moonMap: texture_2d<f32>;

// Texel 1 of the table's sun row holds the sun's light through the air
// along the Moon's direction at this scale (not exposed: at night's open
// exposures it would pass fp16's range).
const MOON_ROW_SCALE = 1e-5;

// The Moon's disk at `direction`: its radiance as a multiple of the sun's
// irradiance above the atmosphere (sr⁻¹; the air's transmittance toward it
// still to apply), and how much of the pixel it covers (it hides the
// stars). The sunlit part shades as Lommel-Seeliger, 2μ₀ / (μ₀ + μ) (flat
// at full, as the Moon looks), by the map's albedo; `moonScale` sets the
// whole disk's brightness by phase (Allen's magnitudes).
struct MoonSample {
  radiance: f32,
  coverage: f32,
};

fn moonDisk(direction: vec3f) -> MoonSample {
  let m = sky.moon;
  let k = sky.moonSize;
  if (k <= 0.0 || dot(direction, m) <= 0.0) {
    return MoonSample(0.0, 0.0);
  }
  let pixel = 2.0 * sky.tanY / sky.size.y; // radians per pixel, about
  // The direction's offset from the center, across the disk.
  let offset = direction - m * dot(direction, m);
  let sinAngle = length(offset);
  if (sinAngle >= k + pixel) {
    return MoonSample(0.0, 0.0);
  }
  let coverage = clamp((k - sinAngle) / pixel + 0.5, 0.0, 1.0);
  // The surface seen there (rim pixels: the limb), facing the camera.
  var q = offset / k;
  let q2 = dot(q, q);
  if (q2 > 1.0) {
    q *= inverseSqrt(q2);
  }
  let mu = sqrt(max(0.0, 1.0 - dot(q, q)));
  let normal = q - m * mu;
  let mu0 = dot(normal, sky.moonSun);
  let moonY = cross(sky.moonZ, sky.moonX);
  let longitude = atan2(dot(normal, moonY), dot(normal, sky.moonX));
  let latitude = asin(clamp(dot(normal, sky.moonZ), -1.0, 1.0));
  let uv = vec2f(0.5 + longitude / (2.0 * PI), 0.5 - latitude / PI);
  let albedo = dot(textureSampleLevel(moonMap, starSampler, uv, 0.0).rgb, vec3f(0.2126, 0.7152, 0.0722));
  // The sunlit part, and everywhere the Earth's light (seen from about
  // where it comes from: flat, as at full).
  let sunlit = select(0.0, sky.moonScale * 2.0 * mu0 / (mu0 + mu), mu0 > 0.0);
  return MoonSample((sunlit + sky.earthshine) * albedo * coverage, coverage);
}

// This group's share of a transmittance weighted by its bands' luminance:
// the two groups' shares add up to the mean (the stars' dimming, gray).
fn luminanceShare(t: vec4f, group: u32) -> f32 {
  let y = vec3f(0.2126, 0.7152, 0.0722);
  var total = 0.0;
  for (var b = 0u; b < 8u; b++) {
    total += dot(sky.weights[b].xyz, y);
  }
  let base = group * 4u;
  return (t.x * dot(sky.weights[base].xyz, y)
    + t.y * dot(sky.weights[base + 1u].xyz, y)
    + t.z * dot(sky.weights[base + 2u].xyz, y)
    + t.w * dot(sky.weights[base + 3u].xyz, y)) / total;
}

// --- the night sky's own light -------------------------------------------------

// A moonless night is lit by the sky itself, about 1 mlux on the ground
// (Leinert et al. 1998, "The 1997 reference of diffuse night sky
// brightness"): airglow, a shell of the upper atmosphere (87-97 km:
// oxygen's green line, OH, sodium) glowing by night, 1.1e-4 cd/m² at the
// zenith seen from the ground (21.9 V mag/arcsec² for the whole sky, about
// 60% of it), several times more toward the horizon where a ray runs
// longer through the shell (van Rhijn), and from orbit a thin line along
// the planet's edge; a mild yellow-green (the green line over the red
// lines and the continuum, as long exposures show it); and from beyond the atmosphere, the zodiacal
// light and the stars too faint for the star map, warm white, 0.8e-4
// cd/m², dimmed by the air like the stars. Linear sRGB, cd/m² (per km of
// the shell for airglow); a day sky is 10⁷ times brighter.
const AIRGLOW_BOTTOM = 87.0;
const AIRGLOW_TOP = 97.0;
const AIRGLOW = vec3f(0.855, 1.069, 0.748) * 1.4e-5;
const STARLIGHT = vec3f(1.07, 0.99, 0.86) * 0.8e-4;

// How much of [a, b] along a ray (from radius r, zenith cosine mu) is
// inside a sphere.
fn sphereSpan(r: f32, mu: f32, radius: f32, a: f32, b: f32) -> f32 {
  let disc = r * r * (mu * mu - 1.0) + radius * radius;
  if (disc <= 0.0 || b <= a) {
    return 0.0;
  }
  let s = sqrt(disc);
  return max(min(-r * mu + s, b) - max(-r * mu - s, a), 0.0);
}

// The night sky's own light along a ray (pre-exposure), this group's part
// (the groups add): `toSpace` is this group's share of the transmittance
// to space (`luminanceShare`), 0 where the ground is in the way. Airglow
// on the near side of the ray's lowest point is seen through the thin
// air above it (from orbit), on the far side through the whole ray.
fn nightGlow(r: f32, mu: f32, ground: bool, toSpace: f32) -> vec3f {
  let bottom = atmosphere.bottomRadius;
  let end = select(1e9, sphereDistance(r, mu, bottom, true), ground);
  let lowest = clamp(-r * mu, 0.0, end);
  let r1 = bottom + AIRGLOW_BOTTOM;
  let r2 = bottom + AIRGLOW_TOP;
  let near = sphereSpan(r, mu, r2, 0.0, lowest) - sphereSpan(r, mu, r1, 0.0, lowest);
  let far = sphereSpan(r, mu, r2, lowest, end) - sphereSpan(r, mu, r1, lowest, end);
  return AIRGLOW * (near * 0.5 + far * select(toSpace, 0.5, ground)) + STARLIGHT * toSpace;
}

// --- per pixel (above the atmosphere) -------------------------------------------

// The sky's light along `direction` (spectral, this group's wavelengths).
fn skyAlong(direction: vec3f, sun: vec3f) -> vec4f {
  return march(sky.position, direction, sun, 1e9, i32(sky.steps), false).radiance * atmosphere.solarIrradiance;
}

// The sky marched along a pixel's ray (pre-exposed), and this group's
// share of the transmittance to space (0 where the ground is in the way).
struct MarchedSky {
  color: vec3f,
  toSpace: f32,
  // Along the ray (this group's wavelengths); 0 where the ground is.
  transmittance: vec4f,
};

fn marchedSky(pixel: vec2f, group: u32) -> MarchedSky {
  let seen = viewDirection(pixel);
  // Marched where the ellipsoid is the ground sphere (`sky.shape`): a scale
  // keeps what touches what, so the planet's edge and the glow along it
  // are the ellipsoid's (the scene's ground) wherever the camera is. The
  // shell's thickness changes by 0.3% at most, the angles by 0.2°.
  let direction = normalize(sky.shape * seen);
  let sun = normalize(sky.shape * sky.sun);
  let s = march(sky.position, direction, sun, 1e9, i32(sky.steps), false);
  var spectral = s.radiance * atmosphere.solarIrradiance;
  // From far away the atmosphere's rim is a pixel or less across, its
  // bright part a fraction of one: one ray per pixel catches it in some
  // pixels and not others (the glow breaks up and blinks as the camera
  // moves). The rim varies only across its width, so where the ray passes
  // within a pixel of the shell, average 8 rays spread across the pixel
  // toward the planet's center.
  let r0 = length(sky.position);
  let mu0 = dot(sky.position, direction) / r0;
  let closest = r0 * sqrt(max(0.0, 1.0 - mu0 * mu0));
  let pixelAngle = 2.0 * sky.tanY / sky.size.y;
  let footprint = max(-r0 * mu0, 0.0) * pixelAngle;
  if (r0 > atmosphere.topRadius && mu0 < 0.0
      && closest < atmosphere.topRadius + footprint
      && closest > atmosphere.bottomRadius - footprint) {
    let center = -sky.position / r0;
    let across = normalize(center - direction * dot(center, direction));
    var sum = vec4f(0.0);
    for (var k = 0; k < 8; k++) {
      let offset = (f32(k) + 0.5) / 8.0 - 0.5;
      sum += skyAlong(normalize(direction + across * (offset * pixelAngle)), sun);
    }
    spectral = sum * 0.125;
  }
  // The disk, seen through the whole atmosphere unless the planet is in
  // the way.
  let r = length(sky.position);
  let mu = dot(sky.position, direction) / r;
  let ground = hitsGround(r, mu);
  if (!ground) {
    spectral += atmosphere.solarIrradiance / sky.sunSolidAngle * sunDisk(seen) * s.transmittance;
  }
  // By night, the Moon's light scattered as the sun's is (its light is the
  // sun's, reflected).
  if (sky.moonLight > 0.0) {
    let moon = march(sky.position, direction, normalize(sky.shape * sky.moon), 1e9, i32(sky.steps), false);
    spectral += moon.radiance * atmosphere.solarIrradiance * sky.moonLight;
  }
  let toSpace = select(luminanceShare(s.transmittance, group), 0.0, ground);
  return MarchedSky(
    (toRgb(spectral, group) + nightGlow(r, mu, ground, toSpace)) * sky.exposure,
    toSpace,
    select(s.transmittance, vec4f(0.0), ground),
  );
}

// The sky alone (the environment's faces from above the atmosphere).
@fragment
fn skyFragment(in: SkyVarying) -> @location(0) vec4f {
  return vec4f(min(marchedSky(in.position.xy, in.group).color, vec3f(SKY_MAX)), 1.0);
}

// The sky behind a view, with the Moon and the stars through it.
@fragment
fn skyStarsFragment(in: SkyVarying) -> @location(0) vec4f {
  let m = marchedSky(in.position.xy, in.group);
  let direction = viewDirection(in.position.xy);
  let moon = moonDisk(direction);
  let moonLight = toRgb(atmosphere.solarIrradiance * moon.radiance * m.transmittance, in.group) * sky.exposure;
  let starry = starLight(in.position.xy, direction) * m.toSpace * starExposure(m.color, 0.5) * (1.0 - moon.coverage);
  return vec4f(min(m.color + moonLight + starry, vec3f(SKY_MAX)), 1.0);
}

// --- the sky-view table ---------------------------------------------------------

const SKY_VIEW_SIZE = vec2f(192.0, 108.0);
// The sky's rows, one for the sun's radiance, then the Moon's sky: the
// light it scatters, by night (the same mapping about the Moon's
// direction; zeros while the sun is up).
const SKY_VIEW_ROWS = 217.0;
const MOON_SKY_ROW = 109.0;
const SKY_VIEW_STEPS = 30;

// The camera's local frame: up, and the horizontal direction of the sun.
struct SkyFrame {
  up: vec3f,
  toward: vec3f,
  side: vec3f,
};

fn skyFrame() -> SkyFrame {
  return frameToward(sky.sun);
}

// The camera's local frame about a light's direction.
fn frameToward(light: vec3f) -> SkyFrame {
  let up = normalize(sky.position);
  var toward = light - up * dot(light, up);
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
  var toSpace = 0.0;
  if (in.position.y >= MOON_SKY_ROW) {
    if (sky.moonLight <= 0.0) {
      return vec4f(0.0);
    }
    let m = frameToward(sky.moon);
    let unit = vec2f(
      texelToUnit(in.position.x / SKY_VIEW_SIZE.x, SKY_VIEW_SIZE.x),
      texelToUnit((in.position.y - MOON_SKY_ROW) / SKY_VIEW_SIZE.y, SKY_VIEW_SIZE.y),
    );
    let s = march(sky.position, tableDirection(unit, r, m), sky.moon, 1e9, SKY_VIEW_STEPS, false);
    spectral = s.radiance * atmosphere.solarIrradiance * sky.moonLight;
  } else if (in.position.y >= SKY_VIEW_SIZE.y) {
    if (in.position.x >= 1.0) {
      // Texel 1: the sun's light through the air along the Moon's
      // direction (the Moon's color and dimming), scaled, not exposed.
      if (in.position.x < 2.0 && sky.moonSize > 0.0) {
        let light = atmosphere.solarIrradiance * sunTransmittance(r, dot(f.up, sky.moon));
        return vec4f(toRgb(light, in.group) * MOON_ROW_SCALE, 0.0);
      }
      return vec4f(0.0);
    }
    // Texel 0: the sun's mean radiance through the atmosphere (the disk's
    // color).
    if (sky.sunCos <= 1.0) {
      spectral = atmosphere.solarIrradiance / sky.sunSolidAngle * sunTransmittance(r, dot(f.up, sky.sun));
    }
  } else {
    let unit = vec2f(
      texelToUnit(in.position.x / SKY_VIEW_SIZE.x, SKY_VIEW_SIZE.x),
      texelToUnit(in.position.y / SKY_VIEW_SIZE.y, SKY_VIEW_SIZE.y),
    );
    let direction = tableDirection(unit, r, f);
    let s = march(sky.position, direction, sky.sun, 1e9, SKY_VIEW_STEPS, false);
    spectral = s.radiance * atmosphere.solarIrradiance;
    // Alpha: the transmittance to space, for the stars (the groups' shares
    // add up).
    let mu = dot(sky.position, direction) / r;
    let ground = hitsGround(r, mu);
    if (!ground) {
      toSpace = luminanceShare(s.transmittance, in.group);
    }
    let glow = nightGlow(r, mu, ground, toSpace);
    return vec4f(min((toRgb(spectral, in.group) + glow) * sky.exposure, vec3f(SKY_MAX)), toSpace);
  }
  return vec4f(min(toRgb(spectral, in.group) * sky.exposure, vec3f(SKY_MAX)), toSpace);
}

// A table texel's direction in a frame (`skyViewAngles`).
fn tableDirection(unit: vec2f, r: f32, f: SkyFrame) -> vec3f {
  let angles = skyViewAngles(unit, r, atmosphere.bottomRadius);
  let sinZenith = sin(angles.x);
  let cosAzimuth = angles.y;
  let sinAzimuth = sqrt(max(0.0, 1.0 - cosAzimuth * cosAzimuth));
  return f.up * cos(angles.x) + (f.toward * cosAzimuth + f.side * sinAzimuth) * sinZenith;
}

@group(2) @binding(1) var skyView: texture_2d<f32>;
@group(2) @binding(2) var skyViewSampler: sampler;

// The sky in `direction` from the table (pre-exposed), and whether the
// ground is in the way.
struct TableSky {
  color: vec3f,
  ground: bool,
  // The transmittance to space (gray), for the stars.
  toSpace: f32,
};

fn skyFromTable(direction: vec3f) -> TableSky {
  let r = length(sky.position);
  let f = skyFrame();
  let cosZenith = dot(direction, f.up);
  let bottom = sky.bottomRadius;
  let ground = cosZenith < 0.0 && r * r * (cosZenith * cosZenith - 1.0) + bottom * bottom >= 0.0;
  let texel = tableTexel(direction, f, 0.0, ground, r);
  var color = texel.rgb;
  if (sky.moonLight > 0.0) {
    color += tableTexel(direction, frameToward(sky.moon), MOON_SKY_ROW, ground, r).rgb;
  }
  return TableSky(color, ground, texel.a);
}

// The table's texel in `direction`, its rows from `first`, about the
// frame's light.
fn tableTexel(direction: vec3f, f: SkyFrame, first: f32, ground: bool, r: f32) -> vec4f {
  let cosZenith = dot(direction, f.up);
  let horizontal = direction - f.up * cosZenith;
  let length2 = dot(horizontal, horizontal);
  let cosAzimuth = select(1.0, dot(horizontal, f.toward) * inverseSqrt(length2), length2 > 1e-12);
  let unit = skyViewUnit(cosZenith, cosAzimuth, ground, r, sky.bottomRadius);
  // The horizon lies between two rows (sky above, ground below): stay on
  // this side of it, or the filter blends the sky with the ground.
  let half = SKY_VIEW_SIZE.y * 0.5;
  var row = unitToTexel(unit.y, SKY_VIEW_SIZE.y) * SKY_VIEW_SIZE.y;
  row = select(min(row, half - 0.5), max(row, half + 0.5), ground);
  let uv = vec2f(unitToTexel(unit.x, SKY_VIEW_SIZE.x), (first + row) / SKY_VIEW_ROWS);
  return textureSampleLevel(skyView, skyViewSampler, uv, 0.0);
}

// The sky from the table, the sun's disk, the Moon and the stars.
@fragment
fn skyFromTableFragment(in: SkyVarying) -> @location(0) vec4f {
  let direction = viewDirection(in.position.xy);
  let s = skyFromTable(direction);
  var color = s.color;
  if (!s.ground) {
    let sun = textureLoad(skyView, vec2i(0, i32(SKY_VIEW_SIZE.y)), 0).rgb;
    color += sun * sunDisk(direction);
    let moon = moonDisk(direction);
    if (moon.coverage > 0.0) {
      let light = textureLoad(skyView, vec2i(1, i32(SKY_VIEW_SIZE.y)), 0).rgb / MOON_ROW_SCALE;
      color += light * moon.radiance * sky.exposure;
    }
    color += starLight(in.position.xy, direction) * s.toSpace * starExposure(s.color, 1.0) * (1.0 - moon.coverage);
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

// Hillaire's froxel volume over the view's frustum: 32 × 32 directions ×
// AERIAL_SLICES distances, spaced quadratically between aerialStart and
// aerialEnd (the same for every ray: the opaque pass interpolates across
// rays at a distance). Each froxel holds the light the air scatters toward
// the camera up to its distance (linear sRGB, cd/m², pre-exposed) and how
// much it dims what is there (transmittance, each channel the 8 bands'
// average weighted by their color).
//
// One workgroup per column, one thread per slice: each marches its own
// interval (from the slice before), then a parallel prefix scan in
// workgroup memory chains the intervals front to back (each slice's light
// is the one before's plus its interval's, dimmed by the transmittance so
// far). A thread marching each column whole kept 1,024 threads busy, too
// few to fill the GPU. The opaque pass reads the volume per pixel
// (opaque.wgsl `aerialPerspective`).
// Slices are many because the haze bends sharply where a ray reaches the
// ground (the air thickens toward it), exactly where the terrain is: with
// 32 slices over the 1,750 km a high camera sees, linear interpolation
// between them drew concentric ripples across the terrain.
//
// Two dispatches, one per group of four wavelengths (`AERIAL_GROUP`): the
// first writes its share, the second reads it, adds its own and writes the
// volume the opaque pass reads.
const AERIAL_SIZE = 32u;
const AERIAL_SLICES = 128u;
/** Steps per interval between slices. */
const AERIAL_SUBSTEPS = 2;

override AERIAL_GROUP: u32 = 0u;

@group(2) @binding(5) var aerialPartialInscatter: texture_3d<f32>;
@group(2) @binding(6) var aerialPartialTransmittance: texture_3d<f32>;
@group(2) @binding(7) var aerialInscatterOut: texture_storage_3d<rgba16float, write>;
@group(2) @binding(8) var aerialTransmittanceOut: texture_storage_3d<rgba16float, write>;

var<workgroup> scanRadiance: array<vec4f, AERIAL_SLICES>;
var<workgroup> scanTransmittance: array<vec4f, AERIAL_SLICES>;

@compute @workgroup_size(AERIAL_SLICES, 1, 1)
fn aerialCompute(
  @builtin(workgroup_id) column: vec3u,
  @builtin(local_invocation_index) j: u32,
) {
  let group = AERIAL_GROUP;
  let ndc = vec2f(
    (f32(column.x) + 0.5) / f32(AERIAL_SIZE) * 2.0 - 1.0,
    1.0 - (f32(column.y) + 0.5) / f32(AERIAL_SIZE) * 2.0,
  );
  let direction = normalize(sky.forward + sky.right * (ndc.x * sky.tanX) + sky.up * (ndc.y * sky.tanY));
  let span = vec2f(sky.aerialStart, sky.aerialEnd);
  let nu = dot(direction, sky.sun);
  let phaseR = rayleighPhase(nu);
  let phaseM = miePhase(nu);
  let moonNu = dot(direction, sky.moon);
  let moonPhaseR = rayleighPhase(moonNu) * sky.moonLight;
  let moonPhaseM = miePhase(moonNu) * sky.moonLight;
  // This slice's interval: from the slice before (the span's start for
  // the first) to its own distance.
  let w0 = (f32(j) - 0.5) / f32(AERIAL_SLICES);
  let w1 = (f32(j) + 0.5) / f32(AERIAL_SLICES);
  let a = select(span.x + (span.y - span.x) * w0 * w0, span.x, j == 0u);
  let b = span.x + (span.y - span.x) * w1 * w1;
  let dt = max(b - a, 0.0) / f32(AERIAL_SUBSTEPS);
  var radiance = vec4f(0.0);
  var transmittance = vec4f(1.0);
  for (var i = 0; i < AERIAL_SUBSTEPS; i++) {
    let p = sky.position + direction * (a + (f32(i) + 0.5) * dt);
    // Through the planet's sphere at its surface's air: the scene's
    // surface (the WGS84 ellipsoid, terrain) is above it, and the haze
    // must go on smoothly past where each ray meets it.
    let rp = max(length(p), atmosphere.bottomRadius + 1e-3);
    let muSun = dot(p, sky.sun) / rp;
    let m = medium(rp - atmosphere.bottomRadius);
    var scattered = (m.rayleigh * phaseR + m.mie * phaseM) * sunTransmittance(rp, muSun)
      + m.scattering * multipleScattering(rp, muSun);
    if (sky.moonLight > 0.0) {
      let muMoon = dot(p, sky.moon) / rp;
      scattered += (m.rayleigh * moonPhaseR + m.mie * moonPhaseM) * sunTransmittance(rp, muMoon)
        + m.scattering * multipleScattering(rp, muMoon) * sky.moonLight;
    }
    let segment = exp(-m.extinction * dt);
    radiance += transmittance * scattered * (1.0 - segment) / max(m.extinction, vec4f(1e-9));
    transmittance *= segment;
  }
  // Inclusive scan (Hillis and Steele): after it, slice j holds the
  // intervals 0..j chained.
  scanRadiance[j] = radiance;
  scanTransmittance[j] = transmittance;
  for (var offset = 1u; offset < AERIAL_SLICES; offset <<= 1u) {
    workgroupBarrier();
    var beforeRadiance = vec4f(0.0);
    var beforeTransmittance = vec4f(1.0);
    if (j >= offset) {
      beforeRadiance = scanRadiance[j - offset];
      beforeTransmittance = scanTransmittance[j - offset];
    }
    workgroupBarrier();
    radiance = beforeRadiance + beforeTransmittance * radiance;
    transmittance = beforeTransmittance * transmittance;
    scanRadiance[j] = radiance;
    scanTransmittance[j] = transmittance;
  }
  var total = vec3f(0.0);
  for (var k = 0u; k < 8u; k++) {
    total += sky.weights[k].xyz;
  }
  let base = group * 4u;
  // Pre-exposed (the view's exposure), as the scene target: haze toward
  // the sun reaches 70,000 cd/m² and more, past fp16's 65,504.
  var inscatter = toRgb(radiance * atmosphere.solarIrradiance, group) * sky.exposure;
  var t = (transmittance.x * sky.weights[base].xyz
    + transmittance.y * sky.weights[base + 1u].xyz
    + transmittance.z * sky.weights[base + 2u].xyz
    + transmittance.w * sky.weights[base + 3u].xyz) / total;
  let at = vec3u(column.xy, j);
  if (group == 1u) {
    inscatter += textureLoad(aerialPartialInscatter, at, 0).rgb;
    t += textureLoad(aerialPartialTransmittance, at, 0).rgb;
  }
  textureStore(aerialInscatterOut, at, vec4f(min(inscatter, vec3f(2.0 * SKY_MAX)), 1.0));
  textureStore(aerialTransmittanceOut, at, vec4f(t, 1.0));
}

// --- aerial perspective from high up, per screen texel -------------------------

// From high up (`Sky.ts` SCREEN_HAZE_FROM), the per-vertex march spans the
// coarsest tiles' triangles, hundreds of kilometers: interpolated across
// them, the haze at the day/night line (lit, then in the Earth's shadow)
// drew blocky streaks. Here each texel of a screen-sized grid marches its
// own ray to the ground, in the space where the ellipsoid is the ground
// sphere (`marchedSky`: the globe's surface exactly, its terrain's heights
// small from that high); the opaque pass samples it (opaque.wgsl). The
// groups' wavelengths add up, as the sky's. Rays past the planet carry the
// atmosphere's light along them, for the limb's texels.
const AERIAL_SCREEN = vec2f(640.0, 400.0);

struct AerialScreen {
  @location(0) inscatter: vec4f,
  @location(1) transmittance: vec4f,
};

@fragment
fn aerialScreenFragment(in: SkyVarying) -> AerialScreen {
  let ndc = vec2f(in.position.x / AERIAL_SCREEN.x * 2.0 - 1.0, 1.0 - in.position.y / AERIAL_SCREEN.y * 2.0);
  let seen = normalize(sky.forward + sky.right * (ndc.x * sky.tanX) + sky.up * (ndc.y * sky.tanY));
  let direction = normalize(sky.shape * seen);
  let sun = normalize(sky.shape * sky.sun);
  let r = length(sky.position);
  let mu = dot(sky.position, direction) / r;
  // To just short of the ground: its own light (the surface's) is drawn.
  var reach = 1e9;
  if (hitsGround(r, mu)) {
    reach = sphereDistance(r, mu, atmosphere.bottomRadius, true) * 0.9999;
  }
  let s = march(sky.position, direction, sun, reach, i32(sky.steps), false);
  var spectral = s.radiance * atmosphere.solarIrradiance;
  if (sky.moonLight > 0.0) {
    let moon = march(sky.position, direction, normalize(sky.shape * sky.moon), reach, i32(sky.steps), false);
    spectral += moon.radiance * atmosphere.solarIrradiance * sky.moonLight;
  }
  var total = vec3f(0.0);
  for (var k = 0u; k < 8u; k++) {
    total += sky.weights[k].xyz;
  }
  let base = in.group * 4u;
  let t = (s.transmittance.x * sky.weights[base].xyz
    + s.transmittance.y * sky.weights[base + 1u].xyz
    + s.transmittance.z * sky.weights[base + 2u].xyz
    + s.transmittance.w * sky.weights[base + 3u].xyz) / total;
  return AerialScreen(
    vec4f(min(toRgb(spectral, in.group) * sky.exposure, vec3f(SKY_MAX)), 0.0),
    vec4f(t, 0.0),
  );
}
