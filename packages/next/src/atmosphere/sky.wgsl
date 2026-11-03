// The sky behind a view's scene (plan §4.2), appended to atmosphere.wgsl:
// a fullscreen triangle at the far plane, drawn where nothing else is
// (depth equal to the cleared 0, reverse-Z), once per group of four
// wavelengths and added up. Each pixel marches its view ray through the
// atmosphere with the transmittance and multiple-scattering tables; the
// sun's disk is added where the ray meets it. Output is pre-exposed linear
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
  _pad: f32,
  weights: array<vec4f, 8>, // the 8 bands to linear sRGB (cd/m² per W·m⁻²·sr⁻¹·nm⁻¹)
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

@fragment
fn skyFragment(in: SkyVarying) -> @location(0) vec4f {
  let ndc = vec2f(in.position.x / sky.size.x * 2.0 - 1.0, 1.0 - in.position.y / sky.size.y * 2.0);
  let direction = normalize(sky.forward + sky.right * (ndc.x * sky.tanX) + sky.up * (ndc.y * sky.tanY));
  let s = march(sky.position, direction, sky.sun, 1e9, i32(sky.steps), false);
  var spectral = s.radiance * atmosphere.solarIrradiance;

  // The sun's disk, seen through the whole atmosphere (unless the planet
  // is in the way), with limb darkening (a linear law, u = 0.6). It is a
  // few pixels across at most fields of view: its edge is antialiased by
  // the pixel's coverage (its distance to the rim, in pixels).
  let cosAngle = dot(direction, sky.sun);
  let r = length(sky.position);
  let mu = dot(sky.position, direction) / r;
  let pixel = 2.0 * sky.tanY / sky.size.y; // radians per pixel, about
  let sinRadius = sqrt(max(0.0, 1.0 - sky.sunCos * sky.sunCos));
  let sinAngle = sqrt(max(0.0, 1.0 - cosAngle * cosAngle));
  let disk = sky.sunCos <= 1.0;
  if (disk && cosAngle > 0.0 && sinAngle < sinRadius + pixel && !hitsGround(r, mu)) {
    let coverage = clamp((sinRadius - sinAngle) / pixel + 0.5, 0.0, 1.0);
    let x = min(sinAngle / sinRadius, 1.0);
    let limb = (1.0 - 0.6 * (1.0 - sqrt(max(0.0, 1.0 - x * x)))) / (1.0 - 0.6 / 3.0);
    spectral += atmosphere.solarIrradiance / sky.sunSolidAngle * limb * coverage * s.transmittance;
  }

  let base = in.group * 4u;
  let rgb = spectral.x * sky.weights[base].xyz
    + spectral.y * sky.weights[base + 1u].xyz
    + spectral.z * sky.weights[base + 2u].xyz
    + spectral.w * sky.weights[base + 3u].xyz;
  return vec4f(min(rgb * sky.exposure, vec3f(SKY_MAX)), 1.0);
}
