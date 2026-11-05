// The sky behind a view's scene (plan §4.2), with air.slang's model
// (Sky.ts).
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
import air;

struct Sky {
  // The camera, km, planet-centered: on the sphere's normal, or from above
  // the atmosphere scaled by `shape`.
  float3 position;
  float exposure;
  float3 sun;        // unit, toward the sun
  float sunCos;      // cosine of the sun's angular radius; > 1: no disk
  float3 forward;
  float tanX;        // tangent of the half field of view, horizontal
  float3 right;
  float tanY;
  float3 up;
  float sunSolidAngle;
  float2 size;       // the view, pixels
  float steps;
  float bottomRadius; // the planet's, km
  float4 weights[8];  // the 8 bands to linear sRGB (cd/m² per W·m⁻²·sr⁻¹·nm⁻¹)
  // The aerial-perspective volume's slice distances, km: the same for every
  // ray (the opaque pass interpolates across rays at a distance), from the
  // camera (or the atmosphere's nearest point, from above it) to its far
  // edge past the horizon.
  float aerialStart;
  float aerialEnd;
  // The stars' exposure scale against a dark sky, when more open than the
  // view's (`starExposure`); 0: the view's.
  float starExposure;
  // The Moon's illuminance as a share of the sun's above the atmosphere,
  // for the light the air scatters by night (the sky's, the haze's); 0
  // while the sun is up, or without the Moon.
  float moonLight;
  // The Moon (`moonDisk`): its center's direction from the camera (unit),
  // and the sine of its angular radius (0: none).
  float3 moon;
  float moonSize;
  // Its axes (Earth-fixed): toward selenographic longitude and latitude 0
  // (the near side's center, within 8° of the Earth: libration) and its
  // north pole; its radiance per unit of the map's albedo, as a share of
  // the sun's irradiance (sr⁻¹).
  float3 moonX;
  float moonScale;
  float3 moonZ;
  // Earthshine: the Earth's light on the Moon's night side, per unit of
  // the map's albedo, as a share of the sun's irradiance (sr⁻¹).
  float earthshine;
  // From the Moon toward the sun (unit).
  float3 moonSun;
  // The mean light the ground around emits (its cities' lamps), cd/m²
  // (globe/cityLight.ts); 0 without the night lights.
  float cityLight;
  // From above the atmosphere, the scale per axis that makes the body's
  // ellipsoid the atmosphere's ground sphere (`marchedSky`); 1 otherwise.
  float3 shape;
  // Device pixels per CSS pixel: the stars' point spread is sized for the
  // display as it's seen (a star a CSS pixel or two, at any density).
  float starPixel;
};

[[vk::binding(0, 2)]] ConstantBuffer<Sky> sky;

struct SkyVarying {
  float4 position : SV_Position;
  uint group : GROUP; // flat: integers are
};

[shader("vertex")]
SkyVarying skyVertex(uint i : SV_VertexID, uint group : SV_InstanceID) {
  float2 xy = float2(float((i << 1u) & 2u), float(i & 2u)) * 2.0 - 1.0;
  SkyVarying out;
  out.position = float4(xy, 0.0, 1.0);
  out.group = group;
  return out;
}

// Each group's sum stays below half of fp16's largest value (the sun's
// disk, pre-exposed, can come close).
static const float SKY_MAX = 30000.0;

float3 toRgb(float4 spectral, uint group) {
  uint base = group * 4u;
  return spectral.x * sky.weights[base].xyz
      + spectral.y * sky.weights[base + 1u].xyz
      + spectral.z * sky.weights[base + 2u].xyz
      + spectral.w * sky.weights[base + 3u].xyz;
}

float3 viewDirection(float2 pixel) {
  float2 ndc = float2(pixel.x / sky.size.x * 2.0 - 1.0, 1.0 - pixel.y / sky.size.y * 2.0);
  return normalize(sky.forward + sky.right * (ndc.x * sky.tanX) + sky.up * (ndc.y * sky.tanY));
}

// The sun's disk at `direction`: limb darkening (a linear law, u = 0.6)
// times the pixel's coverage (its distance to the rim, in pixels), as a
// fraction of the disk's mean radiance; 0 away from it.
float sunDisk(float3 direction) {
  if (sky.sunCos > 1.0) {
    return 0.0;
  }
  float cosAngle = dot(direction, sky.sun);
  float pixel = 2.0 * sky.tanY / sky.size.y; // radians per pixel, about
  float sinRadius = sqrt(max(0.0, 1.0 - sky.sunCos * sky.sunCos));
  float sinAngle = sqrt(max(0.0, 1.0 - cosAngle * cosAngle));
  if (cosAngle <= 0.0 || sinAngle >= sinRadius + pixel) {
    return 0.0;
  }
  float coverage = clamp((sinRadius - sinAngle) / pixel + 0.5, 0.0, 1.0);
  float x = min(sinAngle / sinRadius, 1.0);
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
  float4 rows[3];
};

[[vk::binding(0, 3)]] ConstantBuffer<Stars> stars;
[[vk::binding(1, 3)]] TextureCube<float4> starBackground;
[[vk::binding(2, 3)]] SamplerState starSampler;
// The view's stars, splatted (cd/m², not exposed).
[[vk::binding(4, 3)]] Texture2D<float4> starLayer;
// Per star: direction (ICRF) and illuminance (lux), then color.
[[vk::binding(5, 3)]] StructuredBuffer<float4> starPoints;

// The stars' light at a pixel looking along `direction` (cd/m²).
float3 starLight(float2 pixel, float3 direction) {
  float3 d = float3(
      dot(stars.rows[0].xyz, direction),
      dot(stars.rows[1].xyz, direction),
      dot(stars.rows[2].xyz, direction));
  float3 background = starBackground.SampleLevel(starSampler, d, 0.0).rgb * stars.rows[0].w;
  return starLayer.Load(int3(int2(pixel), 0)).rgb + background;
}

// A star's point spread function, in CSS pixels (`starPixel`): a sharp
// core (a Gaussian integrated over each pixel, so its light sums to the
// same wherever it falls: no shimmer as the view turns) and a faint wide
// halo, glare that shows only around the bright ones (Spencer et al.
// 1995's bloom, the eye's or a lens's scatter): a bright star, its core
// past white, is larger, as the eye sees it.
static const float STAR_CORE = 0.6;
static const float STAR_HALO = 3.0;
static const float STAR_HALO_SHARE = 0.05;
static const float STAR_MAX = 60000.0;

// Read by field in `starFragment`: a varying `nointerpolation` struct
// passed whole is copied with its interpolation where WGSL forbids it.
struct StarSplat {
  float4 position : SV_Position;
  float2 center : CENTER;
  nointerpolation float3 light : LIGHT;
};

// erf (Winitzki's approximation, within 1e-4).
float erfApprox(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}

// One star as a square around it, as large as its halo stays visible at
// the most open exposure the stars get; off screen if behind the camera or
// too faint to show at all.
[shader("vertex")]
StarSplat starVertex(uint corner : SV_VertexID, uint index : SV_InstanceID) {
  StarSplat out;
  out.position = float4(2.0, 2.0, 0.0, 1.0);
  out.center = float2(0.0);
  out.light = float3(0.0);
  float4 a = starPoints[index * 2u];
  float4 b = starPoints[index * 2u + 1u];
  // ICRF to Earth-fixed: the rows' transpose.
  float3 d = stars.rows[0].xyz * a.x + stars.rows[1].xyz * a.y + stars.rows[2].xyz * a.z;
  float z = dot(d, sky.forward);
  if (z < 0.01) {
    return out;
  }
  float2 ndc = float2(dot(d, sky.right) / (z * sky.tanX), dot(d, sky.up) / (z * sky.tanY));
  float2 pixel = float2((ndc.x * 0.5 + 0.5) * sky.size.x, (0.5 - ndc.y * 0.5) * sky.size.y);
  // Its illuminance over the pixel's solid angle there: radiance.
  float pixelAngle = 2.0 * sky.tanY / sky.size.y;
  float omega = pixelAngle * pixelAngle * z * z * z;
  float3 light = min(b.xyz * (a.w / omega), float3(STAR_MAX));
  float brightest = max(light.r, max(light.g, light.b)) * max(sky.exposure, sky.starExposure);
  if (brightest * 0.4 < 1e-4) {
    return out;
  }
  float haloSize = STAR_HALO * sky.starPixel;
  float halo = brightest * STAR_HALO_SHARE / (2.0 * PI * haloSize * haloSize);
  float radius = clamp(haloSize * sqrt(2.0 * log(max(halo / 0.002, 1.0))), 2.0 * sky.starPixel, 64.0);
  float2 corners[6] = {
    float2(-1.0, -1.0), float2(1.0, -1.0), float2(-1.0, 1.0),
    float2(-1.0, 1.0), float2(1.0, -1.0), float2(1.0, 1.0)
  };
  float2 p = pixel + corners[corner] * radius;
  out.position = float4(p.x / sky.size.x * 2.0 - 1.0, 1.0 - p.y / sky.size.y * 2.0, 0.0, 1.0);
  out.center = pixel;
  out.light = light;
  return out;
}

[shader("fragment")]
float4 starFragment(StarSplat in) : SV_Target0 {
  float2 d = in.position.xy - in.center;
  float core = STAR_CORE * sky.starPixel;
  float haloSize = STAR_HALO * sky.starPixel;
  float s = 1.0 / (sqrt(2.0) * core);
  float sharp = 0.25
      * (erfApprox((d.x + 0.5) * s) - erfApprox((d.x - 0.5) * s))
      * (erfApprox((d.y + 0.5) * s) - erfApprox((d.y - 0.5) * s));
  float halo = exp(-dot(d, d) / (2.0 * haloSize * haloSize)) / (2.0 * PI * haloSize * haloSize);
  return float4(in.light * lerp(sharp, halo, STAR_HALO_SHARE), 0.0);
}

// The exposure the stars are shown at against `background` (pre-exposed,
// this group's share of the sky, `share` of the whole): the view's, or
// the stars' own (`View.starExposure`, the eye's view of them) where the
// sky is dark, fading out as the sky brightens toward a few percent of
// white (twilight's blue hides them, as it does to the eye).
float starExposure(float3 background, float share) {
  float y = dot(background, float3(0.2126, 0.7152, 0.0722)) / share;
  float dark = 1.0 - smoothstep(0.002, 0.03, y);
  return sky.exposure + max(sky.starExposure - sky.exposure, 0.0) * dark;
}

// --- the moon -------------------------------------------------------------------

// The Moon's albedo map (equirectangular, longitude 0 at the center, the
// near side; linear once sampled), with the stars' sampler.
[[vk::binding(3, 3)]] Texture2D<float4> moonMap;

// Texel 1 of the table's sun row holds the sun's light through the air
// along the Moon's direction at this scale (not exposed: at night's open
// exposures it would pass fp16's range).
static const float MOON_ROW_SCALE = 1e-5;

// The Moon's disk at `direction`: its radiance as a multiple of the sun's
// irradiance above the atmosphere (sr⁻¹; the air's transmittance toward it
// still to apply), and how much of the pixel it covers (it hides the
// stars). The sunlit part shades as Lommel-Seeliger, 2μ₀ / (μ₀ + μ) (flat
// at full, as the Moon looks), by the map's albedo; `moonScale` sets the
// whole disk's brightness by phase (Allen's magnitudes).
struct MoonSample {
  float radiance;
  float coverage;
};

MoonSample moonSample(float radiance, float coverage) {
  MoonSample s;
  s.radiance = radiance;
  s.coverage = coverage;
  return s;
}

// The Moon's surface seen along `direction` (rim pixels: the limb), its
// normal facing the camera.
float3 moonSurface(float3 direction) {
  float3 m = sky.moon;
  float3 q = (direction - m * dot(direction, m)) / sky.moonSize;
  float q2 = dot(q, q);
  if (q2 > 1.0) {
    q *= rsqrt(q2);
  }
  return q - m * sqrt(max(0.0, 1.0 - dot(q, q)));
}

// Where the map shows the surface of normal `normal`.
float2 moonUv(float3 normal) {
  float3 moonY = cross(sky.moonZ, sky.moonX);
  float longitude = atan2(dot(normal, moonY), dot(normal, sky.moonX));
  float latitude = asin(clamp(dot(normal, sky.moonZ), -1.0, 1.0));
  return float2(0.5 + longitude / (2.0 * PI), 0.5 - latitude / PI);
}

MoonSample moonDisk(float3 direction) {
  float3 m = sky.moon;
  float k = sky.moonSize;
  if (k <= 0.0 || dot(direction, m) <= 0.0) {
    return moonSample(0.0, 0.0);
  }
  float pixel = 2.0 * sky.tanY / sky.size.y; // radians per pixel, about
  // The direction's offset from the center, across the disk.
  float3 offset = direction - m * dot(direction, m);
  float sinAngle = length(offset);
  if (sinAngle >= k + pixel) {
    return moonSample(0.0, 0.0);
  }
  float coverage = clamp((k - sinAngle) / pixel + 0.5, 0.0, 1.0);
  float3 normal = moonSurface(direction);
  float mu = -dot(normal, m);
  float mu0 = dot(normal, sky.moonSun);
  float2 uv = moonUv(normal);
  // The map's footprint: the surface a pixel away, two ways across the
  // line of sight (the pixel's footprint is round there, so any two do);
  // toward the limb and the poles it stretches, and the map is filtered
  // over it (anisotropically, across its levels).
  float3 across = normalize(cross(m, abs(m.z) > 0.9 ? float3(1.0, 0.0, 0.0) : float3(0.0, 0.0, 1.0)));
  float2 dx = moonUv(moonSurface(direction + across * pixel)) - uv;
  float2 dy = moonUv(moonSurface(direction + cross(m, across) * pixel)) - uv;
  dx.x -= round(dx.x); // across the seam at 180°
  dy.x -= round(dy.x);
  float albedo = dot(moonMap.SampleGrad(starSampler, uv, dx, dy).rgb, float3(0.2126, 0.7152, 0.0722));
  // The sunlit part, and everywhere the Earth's light (seen from about
  // where it comes from: flat, as at full).
  float sunlit = mu0 > 0.0 ? sky.moonScale * 2.0 * mu0 / (mu0 + mu) : 0.0;
  return moonSample((sunlit + sky.earthshine) * albedo * coverage, coverage);
}

// This group's share of a transmittance weighted by its bands' luminance:
// the two groups' shares add up to the mean (the stars' dimming, gray).
float luminanceShare(float4 t, uint group) {
  float3 y = float3(0.2126, 0.7152, 0.0722);
  float total = 0.0;
  for (uint b = 0u; b < 8u; b++) {
    total += dot(sky.weights[b].xyz, y);
  }
  uint base = group * 4u;
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
// lines and the continuum, as long exposures show it); and from beyond the
// atmosphere, the zodiacal light and the stars too faint for the star map,
// warm white, 0.8e-4 cd/m², dimmed by the air like the stars. Linear sRGB,
// cd/m² (per km of the shell for airglow); a day sky is 10⁷ times brighter.
static const float AIRGLOW_BOTTOM = 87.0;
static const float AIRGLOW_TOP = 97.0;
static const float3 AIRGLOW = float3(0.855, 1.069, 0.748) * 1.4e-5;
static const float3 STARLIGHT = float3(1.07, 0.99, 0.86) * 0.8e-4;

// How much of [a, b] along a ray (from radius r, zenith cosine mu) is
// inside a sphere.
float sphereSpan(float r, float mu, float radius, float a, float b) {
  float disc = r * r * (mu * mu - 1.0) + radius * radius;
  if (disc <= 0.0 || b <= a) {
    return 0.0;
  }
  float s = sqrt(disc);
  return max(min(-r * mu + s, b) - max(-r * mu - s, a), 0.0);
}

// A city's light by night, this group's half (the groups add). The ground
// around emits `sky.cityLight` on average (its lamps, on the streets and
// what they light): seen below the horizon, and lighting what stands on it
// from below through the environment. Its air scatters a share of that
// back down, the sky glow: an urban sky at the zenith some 0.02 to 0.04
// cd/m² (16 to 17 V mag/arcsec², against the natural sky's 22) over
// ground of 0.2 to 0.3 (Falchi et al. 2016's atlas; Garstang 1986's
// model), brighter toward the horizon as the line of sight runs longer
// through the lit air, and fading with height above it (its haze within
// a kilometer or two, the air's scale height of eight). Sodium and LED
// light, warm.
static const float3 CITY_GLOW_COLOR = float3(1.25, 0.95, 0.62);
static const float CITY_SKY_SHARE = 0.1;

float3 cityGlow(float height, float mu, bool ground) {
  if (sky.cityLight <= 0.0) {
    return float3(0.0);
  }
  if (ground) {
    return CITY_GLOW_COLOR * (sky.cityLight * 0.5);
  }
  float horizon = 1.0 + 2.0 * pow(1.0 - clamp(mu, 0.0, 1.0), 3.0);
  float air = 0.6 * exp(-max(height, 0.0) / 1.5) + 0.4 * exp(-max(height, 0.0) / 8.0);
  return CITY_GLOW_COLOR * (sky.cityLight * CITY_SKY_SHARE * horizon * air * 0.5);
}

// The night sky's own light along a ray (pre-exposure), this group's part
// (the groups add): `toSpace` is this group's share of the transmittance
// to space (`luminanceShare`), 0 where the ground is in the way. Airglow
// on the near side of the ray's lowest point is seen through the thin
// air above it (from orbit), on the far side through the whole ray.
float3 nightGlow(float r, float mu, bool ground, float toSpace) {
  float bottom = atmosphere.bottomRadius;
  float end = ground ? sphereDistance(r, mu, bottom, true) : 1e9;
  float lowest = clamp(-r * mu, 0.0, end);
  float r1 = bottom + AIRGLOW_BOTTOM;
  float r2 = bottom + AIRGLOW_TOP;
  float near = sphereSpan(r, mu, r2, 0.0, lowest) - sphereSpan(r, mu, r1, 0.0, lowest);
  float far = sphereSpan(r, mu, r2, lowest, end) - sphereSpan(r, mu, r1, lowest, end);
  return AIRGLOW * (near * 0.5 + far * (ground ? 0.5 : toSpace)) + STARLIGHT * toSpace
      + cityGlow(r - bottom, mu, ground);
}

// --- per pixel (above the atmosphere) -------------------------------------------

// The sky's light along `direction` (spectral, this group's wavelengths).
float4 skyAlong(float3 direction, float3 sun) {
  return march(sky.position, direction, sun, 1e9, int(sky.steps), false).radiance * atmosphere.solarIrradiance;
}

// The sky marched along a pixel's ray (pre-exposed), and this group's
// share of the transmittance to space (0 where the ground is in the way).
struct MarchedSky {
  float3 color;
  float toSpace;
  // Along the ray (this group's wavelengths); 0 where the ground is.
  float4 transmittance;
};

MarchedSky marchedSky(float2 pixel, uint group) {
  float3 seen = viewDirection(pixel);
  // Marched where the ellipsoid is the ground sphere (`sky.shape`): a scale
  // keeps what touches what, so the planet's edge and the glow along it
  // are the ellipsoid's (the scene's ground) wherever the camera is. The
  // shell's thickness changes by 0.3% at most, the angles by 0.2°.
  float3 direction = normalize(sky.shape * seen);
  float3 sun = normalize(sky.shape * sky.sun);
  Scattered s = march(sky.position, direction, sun, 1e9, int(sky.steps), false);
  float4 spectral = s.radiance * atmosphere.solarIrradiance;
  // From far away the atmosphere's rim is a pixel or less across, its
  // bright part a fraction of one: one ray per pixel catches it in some
  // pixels and not others (the glow breaks up and blinks as the camera
  // moves). The rim varies only across its width, so where the ray passes
  // within a pixel of the shell, average 8 rays spread across the pixel
  // toward the planet's center.
  float r0 = length(sky.position);
  float mu0 = dot(sky.position, direction) / r0;
  float closest = r0 * sqrt(max(0.0, 1.0 - mu0 * mu0));
  float pixelAngle = 2.0 * sky.tanY / sky.size.y;
  float footprint = max(-r0 * mu0, 0.0) * pixelAngle;
  if (r0 > atmosphere.topRadius && mu0 < 0.0
      && closest < atmosphere.topRadius + footprint
      && closest > atmosphere.bottomRadius - footprint) {
    float3 center = -sky.position / r0;
    float3 across = normalize(center - direction * dot(center, direction));
    float4 sum = float4(0.0);
    for (int k = 0; k < 8; k++) {
      float offset = (float(k) + 0.5) / 8.0 - 0.5;
      sum += skyAlong(normalize(direction + across * (offset * pixelAngle)), sun);
    }
    spectral = sum * 0.125;
  }
  // The disk, seen through the whole atmosphere unless the planet is in
  // the way.
  float r = length(sky.position);
  float mu = dot(sky.position, direction) / r;
  bool ground = hitsGround(r, mu);
  if (!ground) {
    spectral += atmosphere.solarIrradiance / sky.sunSolidAngle * sunDisk(seen) * s.transmittance;
  }
  // By night, the Moon's light scattered as the sun's is (its light is the
  // sun's, reflected).
  if (sky.moonLight > 0.0) {
    Scattered moon = march(sky.position, direction, normalize(sky.shape * sky.moon), 1e9, int(sky.steps), false);
    spectral += moon.radiance * atmosphere.solarIrradiance * sky.moonLight;
  }
  float toSpace = ground ? 0.0 : luminanceShare(s.transmittance, group);
  MarchedSky result;
  result.color = (toRgb(spectral, group) + nightGlow(r, mu, ground, toSpace)) * sky.exposure;
  result.toSpace = toSpace;
  result.transmittance = ground ? float4(0.0) : s.transmittance;
  return result;
}

// The sky alone (the environment's faces from above the atmosphere).
[shader("fragment")]
float4 skyFragment(SkyVarying in) : SV_Target0 {
  return float4(min(marchedSky(in.position.xy, in.group).color, float3(SKY_MAX)), 1.0);
}

// The sky behind a view, with the Moon and the stars through it.
[shader("fragment")]
float4 skyStarsFragment(SkyVarying in) : SV_Target0 {
  MarchedSky m = marchedSky(in.position.xy, in.group);
  float3 direction = viewDirection(in.position.xy);
  MoonSample moon = moonDisk(direction);
  float3 moonLight = toRgb(atmosphere.solarIrradiance * moon.radiance * m.transmittance, in.group) * sky.exposure;
  float3 starry = starLight(in.position.xy, direction) * m.toSpace * starExposure(m.color, 0.5) * (1.0 - moon.coverage);
  return float4(min(m.color + moonLight + starry, float3(SKY_MAX)), 1.0);
}

// --- the sky-view table ---------------------------------------------------------

static const float2 SKY_VIEW_SIZE = float2(192.0, 108.0);
// The sky's rows, one for the sun's radiance, then the Moon's sky: the
// light it scatters, by night (the same mapping about the Moon's
// direction; zeros while the sun is up).
static const float SKY_VIEW_ROWS = 217.0;
static const float MOON_SKY_ROW = 109.0;
static const int SKY_VIEW_STEPS = 30;

// The camera's local frame: up, and the horizontal direction of the sun.
struct SkyFrame {
  float3 up;
  float3 toward;
  float3 side;
};

// The camera's local frame about a light's direction.
SkyFrame frameToward(float3 light) {
  float3 up = normalize(sky.position);
  float3 toward = light - up * dot(light, up);
  if (dot(toward, toward) < 1e-10) {
    // The sun at the zenith or nadir: any horizontal direction.
    toward = cross(up, abs(up.x) > 0.9 ? float3(0.0, 1.0, 0.0) : float3(1.0, 0.0, 0.0));
  }
  toward = normalize(toward);
  SkyFrame f;
  f.up = up;
  f.toward = toward;
  f.side = cross(up, toward);
  return f;
}

SkyFrame skyFrame() {
  return frameToward(sky.sun);
}

// (zenith angle, azimuth cosine) of a table coordinate in [0, 1]². The
// horizon is the middle row; rows are packed quadratically toward it, from
// the zenith above and the nadir below. Columns go from toward the sun (0)
// to away (1), packed toward the sun (Hillaire's mappings).
float2 skyViewAngles(float2 unit, float r, float bottom) {
  float beta = acos(sqrt(max(0.0, r * r - bottom * bottom)) / r);
  float horizon = PI - beta; // zenith angle of the horizon
  float zenith;
  if (unit.y < 0.5) {
    float c = 1.0 - unit.y * 2.0;
    zenith = horizon * (1.0 - c * c);
  } else {
    float c = unit.y * 2.0 - 1.0;
    zenith = horizon + beta * c * c;
  }
  float c = unit.x * unit.x;
  return float2(zenith, 1.0 - 2.0 * c);
}

float2 skyViewUnit(float cosZenith, float cosAzimuth, bool ground, float r, float bottom) {
  float beta = acos(sqrt(max(0.0, r * r - bottom * bottom)) / r);
  float horizon = PI - beta;
  float zenith = acos(clamp(cosZenith, -1.0, 1.0));
  float y;
  if (!ground) {
    float c = clamp(zenith / horizon, 0.0, 1.0);
    y = (1.0 - sqrt(1.0 - c)) * 0.5;
  } else {
    float c = clamp((zenith - horizon) / beta, 0.0, 1.0);
    y = sqrt(c) * 0.5 + 0.5;
  }
  float x = sqrt(clamp(0.5 - cosAzimuth * 0.5, 0.0, 1.0));
  return float2(x, y);
}

// A table texel's direction in a frame (`skyViewAngles`).
float3 tableDirection(float2 unit, float r, SkyFrame f) {
  float2 angles = skyViewAngles(unit, r, atmosphere.bottomRadius);
  float sinZenith = sin(angles.x);
  float cosAzimuth = angles.y;
  float sinAzimuth = sqrt(max(0.0, 1.0 - cosAzimuth * cosAzimuth));
  return f.up * cos(angles.x) + (f.toward * cosAzimuth + f.side * sinAzimuth) * sinZenith;
}

// One texel of the table, for this group's wavelengths (the groups add).
[shader("fragment")]
float4 skyViewFragment(SkyVarying in) : SV_Target0 {
  float r = length(sky.position);
  SkyFrame f = skyFrame();
  float4 spectral = float4(0.0);
  float toSpace = 0.0;
  if (in.position.y >= MOON_SKY_ROW) {
    if (sky.moonLight <= 0.0) {
      return float4(0.0);
    }
    SkyFrame m = frameToward(sky.moon);
    float2 unit = float2(
        texelToUnit(in.position.x / SKY_VIEW_SIZE.x, SKY_VIEW_SIZE.x),
        texelToUnit((in.position.y - MOON_SKY_ROW) / SKY_VIEW_SIZE.y, SKY_VIEW_SIZE.y));
    Scattered s = march(sky.position, tableDirection(unit, r, m), sky.moon, 1e9, SKY_VIEW_STEPS, false);
    spectral = s.radiance * atmosphere.solarIrradiance * sky.moonLight;
  } else if (in.position.y >= SKY_VIEW_SIZE.y) {
    if (in.position.x >= 1.0) {
      // Texel 1: the sun's light through the air along the Moon's
      // direction (the Moon's color and dimming), scaled, not exposed.
      if (in.position.x < 2.0 && sky.moonSize > 0.0) {
        float4 light = atmosphere.solarIrradiance * sunTransmittance(r, dot(f.up, sky.moon));
        return float4(toRgb(light, in.group) * MOON_ROW_SCALE, 0.0);
      }
      return float4(0.0);
    }
    // Texel 0: the sun's mean radiance through the atmosphere (the disk's
    // color).
    if (sky.sunCos <= 1.0) {
      spectral = atmosphere.solarIrradiance / sky.sunSolidAngle * sunTransmittance(r, dot(f.up, sky.sun));
    }
  } else {
    float2 unit = float2(
        texelToUnit(in.position.x / SKY_VIEW_SIZE.x, SKY_VIEW_SIZE.x),
        texelToUnit(in.position.y / SKY_VIEW_SIZE.y, SKY_VIEW_SIZE.y));
    float3 direction = tableDirection(unit, r, f);
    Scattered s = march(sky.position, direction, sky.sun, 1e9, SKY_VIEW_STEPS, false);
    spectral = s.radiance * atmosphere.solarIrradiance;
    // Alpha: the transmittance to space, for the stars (the groups' shares
    // add up).
    float mu = dot(sky.position, direction) / r;
    bool ground = hitsGround(r, mu);
    if (!ground) {
      toSpace = luminanceShare(s.transmittance, in.group);
    }
    float3 glow = nightGlow(r, mu, ground, toSpace);
    return float4(min((toRgb(spectral, in.group) + glow) * sky.exposure, float3(SKY_MAX)), toSpace);
  }
  return float4(min(toRgb(spectral, in.group) * sky.exposure, float3(SKY_MAX)), toSpace);
}

[[vk::binding(1, 2)]] Texture2D<float4> skyView;
[[vk::binding(2, 2)]] SamplerState skyViewSampler;

// The sky in `direction` from the table (pre-exposed), and whether the
// ground is in the way.
struct TableSky {
  float3 color;
  bool ground;
  // The transmittance to space (gray), for the stars.
  float toSpace;
};

// The table's texel in `direction`, its rows from `first`, about the
// frame's light.
float4 tableTexel(float3 direction, SkyFrame f, float first, bool ground, float r) {
  float cosZenith = dot(direction, f.up);
  float3 horizontal = direction - f.up * cosZenith;
  float length2 = dot(horizontal, horizontal);
  float cosAzimuth = length2 > 1e-12 ? dot(horizontal, f.toward) * rsqrt(length2) : 1.0;
  float2 unit = skyViewUnit(cosZenith, cosAzimuth, ground, r, sky.bottomRadius);
  // The horizon lies between two rows (sky above, ground below): stay on
  // this side of it, or the filter blends the sky with the ground.
  float half = SKY_VIEW_SIZE.y * 0.5;
  float row = unitToTexel(unit.y, SKY_VIEW_SIZE.y) * SKY_VIEW_SIZE.y;
  row = ground ? max(row, half + 0.5) : min(row, half - 0.5);
  float2 uv = float2(unitToTexel(unit.x, SKY_VIEW_SIZE.x), (first + row) / SKY_VIEW_ROWS);
  return skyView.SampleLevel(skyViewSampler, uv, 0.0);
}

TableSky skyFromTable(float3 direction) {
  float r = length(sky.position);
  SkyFrame f = skyFrame();
  float cosZenith = dot(direction, f.up);
  float bottom = sky.bottomRadius;
  bool ground = cosZenith < 0.0 && r * r * (cosZenith * cosZenith - 1.0) + bottom * bottom >= 0.0;
  float4 texel = tableTexel(direction, f, 0.0, ground, r);
  float3 color = texel.rgb;
  if (sky.moonLight > 0.0) {
    color += tableTexel(direction, frameToward(sky.moon), MOON_SKY_ROW, ground, r).rgb;
  }
  TableSky t;
  t.color = color;
  t.ground = ground;
  t.toSpace = texel.a;
  return t;
}

// The sky from the table, the sun's disk, the Moon and the stars.
[shader("fragment")]
float4 skyFromTableFragment(SkyVarying in) : SV_Target0 {
  float3 direction = viewDirection(in.position.xy);
  TableSky s = skyFromTable(direction);
  float3 color = s.color;
  if (!s.ground) {
    float3 sun = skyView.Load(int3(0, int(SKY_VIEW_SIZE.y), 0)).rgb;
    color += sun * sunDisk(direction);
    MoonSample moon = moonDisk(direction);
    if (moon.coverage > 0.0) {
      float3 light = skyView.Load(int3(1, int(SKY_VIEW_SIZE.y), 0)).rgb / MOON_ROW_SCALE;
      color += light * moon.radiance * sky.exposure;
    }
    color += starLight(in.position.xy, direction) * s.toSpace * starExposure(s.color, 1.0) * (1.0 - moon.coverage);
  }
  return float4(min(color, float3(2.0 * SKY_MAX)), 1.0);
}

// A face of the environment cube from the view's table: the uniform is a
// 90° face view at the same camera, its exposure the reciprocal of the
// view's (the table is pre-exposed; the environment is in cd/m²).
[shader("fragment")]
float4 environmentFromTableFragment(SkyVarying in) : SV_Target0 {
  TableSky s = skyFromTable(viewDirection(in.position.xy));
  return float4(s.color * sky.exposure, 1.0);
}

// --- the sun's light on the scene ----------------------------------------------

// The sun's illuminance on a surface facing it, by altitude and the sun's
// zenith cosine, in linear sRGB lux times SUN_LIGHT_SCALE (fp16 stops at
// 65,504; the sun outside the atmosphere is 132.5 klx). Columns are the
// zenith cosine, packed quadratically toward 0 (sunsets), rows the
// altitude, packed toward the ground. Below the horizon the disk sets: the
// visible part of it scales the light. The opaque pass reads it per pixel
// (surface.slang `sunlightThroughAir`, the same mapping).
static const float2 SUN_LIGHT_SIZE = float2(256.0, 64.0);
static const float SUN_LIGHT_SCALE = 1e-5;
static const float SUN_ANGULAR_RADIUS = 0.004675;

[shader("fragment")]
float4 sunLightFragment(SkyVarying in) : SV_Target0 {
  Atmosphere a = atmosphere;
  float2 unit = float2(
      texelToUnit(in.position.x / SUN_LIGHT_SIZE.x, SUN_LIGHT_SIZE.x),
      texelToUnit(in.position.y / SUN_LIGHT_SIZE.y, SUN_LIGHT_SIZE.y));
  float s = unit.x * 2.0 - 1.0;
  float mu = sign(s) * s * s;
  float r = a.bottomRadius + (a.topRadius - a.bottomRadius) * unit.y * unit.y;
  // The horizon's zenith cosine from this altitude, and how much of the
  // disk is above it (its center's elevation over the horizon, in radii).
  float muHorizon = -sqrt(max(0.0, 1.0 - (a.bottomRadius / r) * (a.bottomRadius / r)));
  float above = asin(clamp(mu, -1.0, 1.0)) - asin(muHorizon);
  float visible = clamp(0.5 + above / (2.0 * SUN_ANGULAR_RADIUS), 0.0, 1.0);
  float4 t = transmittanceToTop(r, max(mu, muHorizon + 1e-4));
  float3 rgb = toRgb(atmosphere.solarIrradiance * t * visible, in.group);
  return float4(rgb * SUN_LIGHT_SCALE, 1.0);
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
// (surface.slang `aerialPerspective`).
// Slices are many because the haze bends sharply where a ray reaches the
// ground (the air thickens toward it), exactly where the terrain is: with
// 32 slices over the 1,750 km a high camera sees, linear interpolation
// between them drew concentric ripples across the terrain.
//
// Two dispatches, one per group of four wavelengths (`aerialCompute0`,
// `aerialCompute1`): the first writes its share, the second reads it, adds
// its own and writes the volume the opaque pass reads. Two entry points,
// not a pipeline constant: with the group a `[vk::constant_id]` constant,
// slangc 2026.21 ran for minutes and gigabytes on this kernel.
static const uint AERIAL_SIZE = 32u;
static const uint AERIAL_SLICES = 128u;
// Steps per interval between slices.
static const int AERIAL_SUBSTEPS = 2;

// In-scatter in slices 0..AERIAL_SLICES-1, transmittance in the next
// AERIAL_SLICES: one volume each (one sampled texture in the opaque pass,
// CESIUM2_WEBGPU_PLAN.md §13.15).
[[vk::binding(5, 2)]] Texture3D<float4> aerialPartial;
[[vk::binding(7, 2)]] [[vk::image_format("rgba16f")]] WTexture3D<float4> aerialOut;

groupshared float4 scanRadiance[AERIAL_SLICES];
groupshared float4 scanTransmittance[AERIAL_SLICES];

// The group a compile-time constant (a generic's value parameter, each
// entry point its own copy): as a function argument the first pass kept the
// second's reads and indexed the weights at run time, 40% slower.
void aerialColumn<let group : uint>(uint3 column, uint j) {
  float2 ndc = float2(
      (float(column.x) + 0.5) / float(AERIAL_SIZE) * 2.0 - 1.0,
      1.0 - (float(column.y) + 0.5) / float(AERIAL_SIZE) * 2.0);
  float3 direction = normalize(sky.forward + sky.right * (ndc.x * sky.tanX) + sky.up * (ndc.y * sky.tanY));
  float2 span = float2(sky.aerialStart, sky.aerialEnd);
  float nu = dot(direction, sky.sun);
  float phaseR = rayleighPhase(nu);
  float phaseM = miePhase(nu);
  float moonNu = dot(direction, sky.moon);
  float moonPhaseR = rayleighPhase(moonNu) * sky.moonLight;
  float moonPhaseM = miePhase(moonNu) * sky.moonLight;
  // This slice's interval: from the slice before (the span's start for
  // the first) to its own distance.
  float w0 = (float(j) - 0.5) / float(AERIAL_SLICES);
  float w1 = (float(j) + 0.5) / float(AERIAL_SLICES);
  float a = j == 0u ? span.x : span.x + (span.y - span.x) * w0 * w0;
  float b = span.x + (span.y - span.x) * w1 * w1;
  float dt = max(b - a, 0.0) / float(AERIAL_SUBSTEPS);
  float4 radiance = float4(0.0);
  float4 transmittance = float4(1.0);
  for (int i = 0; i < AERIAL_SUBSTEPS; i++) {
    float3 p = sky.position + direction * (a + (float(i) + 0.5) * dt);
    // Through the planet's sphere at its surface's air: the scene's
    // surface (the WGS84 ellipsoid, terrain) is above it, and the haze
    // must go on smoothly past where each ray meets it.
    float rp = max(length(p), atmosphere.bottomRadius + 1e-3);
    float muSun = dot(p, sky.sun) / rp;
    Medium m = medium(rp - atmosphere.bottomRadius);
    float4 scattered = (m.rayleigh * phaseR + m.mie * phaseM) * sunTransmittance(rp, muSun)
        + m.scattering * multipleScattering(rp, muSun);
    if (sky.moonLight > 0.0) {
      float muMoon = dot(p, sky.moon) / rp;
      scattered += (m.rayleigh * moonPhaseR + m.mie * moonPhaseM) * sunTransmittance(rp, muMoon)
          + m.scattering * multipleScattering(rp, muMoon) * sky.moonLight;
    }
    float4 segment = exp(-m.extinction * dt);
    radiance += transmittance * scattered * (1.0 - segment) / max(m.extinction, float4(1e-9));
    transmittance *= segment;
  }
  // Inclusive scan (Hillis and Steele): after it, slice j holds the
  // intervals 0..j chained.
  scanRadiance[j] = radiance;
  scanTransmittance[j] = transmittance;
  for (uint offset = 1u; offset < AERIAL_SLICES; offset <<= 1u) {
    GroupMemoryBarrierWithGroupSync();
    float4 beforeRadiance = float4(0.0);
    float4 beforeTransmittance = float4(1.0);
    if (j >= offset) {
      beforeRadiance = scanRadiance[j - offset];
      beforeTransmittance = scanTransmittance[j - offset];
    }
    GroupMemoryBarrierWithGroupSync();
    radiance = beforeRadiance + beforeTransmittance * radiance;
    transmittance = beforeTransmittance * transmittance;
    scanRadiance[j] = radiance;
    scanTransmittance[j] = transmittance;
  }
  float3 total = float3(0.0);
  for (uint k = 0u; k < 8u; k++) {
    total += sky.weights[k].xyz;
  }
  uint base = group * 4u;
  // Pre-exposed (the view's exposure), as the scene target: haze toward
  // the sun reaches 70,000 cd/m² and more, past fp16's 65,504.
  float3 inscatter = toRgb(radiance * atmosphere.solarIrradiance, group) * sky.exposure;
  float3 t = (transmittance.x * sky.weights[base].xyz
      + transmittance.y * sky.weights[base + 1u].xyz
      + transmittance.z * sky.weights[base + 2u].xyz
      + transmittance.w * sky.weights[base + 3u].xyz) / total;
  uint3 at = uint3(column.xy, j);
  uint3 atTransmittance = uint3(column.xy, j + AERIAL_SLICES);
  if (group == 1u) {
    inscatter += aerialPartial.Load(int4(int3(at), 0)).rgb;
    t += aerialPartial.Load(int4(int3(atTransmittance), 0)).rgb;
  }
  aerialOut.Store(at, float4(min(inscatter, float3(2.0 * SKY_MAX)), 1.0));
  aerialOut.Store(atTransmittance, float4(t, 1.0));
}

[shader("compute")]
[numthreads(AERIAL_SLICES, 1, 1)]
void aerialCompute0(uint3 column : SV_GroupID, uint j : SV_GroupIndex) {
  aerialColumn<0>(column, j);
}

[shader("compute")]
[numthreads(AERIAL_SLICES, 1, 1)]
void aerialCompute1(uint3 column : SV_GroupID, uint j : SV_GroupIndex) {
  aerialColumn<1>(column, j);
}

// --- aerial perspective from high up, per screen texel -------------------------

// From high up (`Sky.ts` SCREEN_HAZE_FROM), the per-vertex march spans the
// coarsest tiles' triangles, hundreds of kilometers: interpolated across
// them, the haze at the day/night line (lit, then in the Earth's shadow)
// drew blocky streaks. Here each texel of a screen-sized grid marches its
// own ray to the ground, in the space where the ellipsoid is the ground
// sphere (`marchedSky`: the globe's surface exactly, its terrain's heights
// small from that high); the opaque pass samples it (surface.slang). The
// groups' wavelengths add up, as the sky's. Rays past the planet carry the
// atmosphere's light along them, for the limb's texels.
static const float2 AERIAL_SCREEN = float2(640.0, 400.0);

struct AerialScreen {
  float4 inscatter : SV_Target0;
  float4 transmittance : SV_Target1;
};

[shader("fragment")]
AerialScreen aerialScreenFragment(SkyVarying in) {
  float2 ndc = float2(in.position.x / AERIAL_SCREEN.x * 2.0 - 1.0, 1.0 - in.position.y / AERIAL_SCREEN.y * 2.0);
  float3 seen = normalize(sky.forward + sky.right * (ndc.x * sky.tanX) + sky.up * (ndc.y * sky.tanY));
  float3 direction = normalize(sky.shape * seen);
  float3 sun = normalize(sky.shape * sky.sun);
  float r = length(sky.position);
  float mu = dot(sky.position, direction) / r;
  // To just short of the ground: its own light (the surface's) is drawn.
  float reach = 1e9;
  if (hitsGround(r, mu)) {
    reach = sphereDistance(r, mu, atmosphere.bottomRadius, true) * 0.9999;
  }
  Scattered s = march(sky.position, direction, sun, reach, int(sky.steps), false);
  float4 spectral = s.radiance * atmosphere.solarIrradiance;
  if (sky.moonLight > 0.0) {
    Scattered moon = march(sky.position, direction, normalize(sky.shape * sky.moon), reach, int(sky.steps), false);
    spectral += moon.radiance * atmosphere.solarIrradiance * sky.moonLight;
  }
  float3 total = float3(0.0);
  for (uint k = 0u; k < 8u; k++) {
    total += sky.weights[k].xyz;
  }
  uint base = in.group * 4u;
  float3 t = (s.transmittance.x * sky.weights[base].xyz
      + s.transmittance.y * sky.weights[base + 1u].xyz
      + s.transmittance.z * sky.weights[base + 2u].xyz
      + s.transmittance.w * sky.weights[base + 3u].xyz) / total;
  AerialScreen out;
  out.inscatter = float4(min(toRgb(spectral, in.group) * sky.exposure, float3(SKY_MAX)), 0.0);
  out.transmittance = float4(t, 0.0);
  return out;
}
