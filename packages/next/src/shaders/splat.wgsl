// Point splats into the opaque pass (World.drawSplats): the tiny symbols
// pointCull.slang rasterized in the view's cull pass, drawn as a triangle
// over the view, after its other opaque draws: each pixel a splat covers
// takes its color (display-referred, as unlit symbols' is), its feature
// (picking) and its depth, depth-tested against what is drawn (a hill
// still hides the points behind it). common.wgsl precedes.

@group(0) @binding(0) var<uniform> view: View;
@group(1) @binding(0) var<storage, read> splatDepth: array<u32>;
@group(1) @binding(1) var<storage, read> splatColor: array<u32>;
@group(1) @binding(2) var<storage, read> splatFeature: array<u32>;

@vertex
fn vs(@builtin(vertex_index) v: u32) -> @builtin(position) vec4f {
  let uv = vec2f(f32((v << 1u) & 2u), f32(v & 2u));
  return vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
}

// As opaque.wgsl's `FsOut`, with the splat's depth.
struct SplatOut {
  @location(0) color: vec4f,
  @location(1) featureId: vec2u,
  @location(2) display: vec4f,
  @builtin(frag_depth) depth: f32,
};

@fragment
fn fs(@builtin(position) frag: vec4f) -> SplatOut {
  let px = vec2u(frag.xy);
  let at = px.y * u32(view.viewport.x) + px.x;
  let bits = splatDepth[at];
  if (bits == 0u) {
    discard;
  }
  let srgb = unpack4x8unorm(splatColor[at]);
  let feature = splatFeature[at];
  var out: SplatOut;
  // Unlit: no scene light (the scene target isn't written). Over what is
  // drawn by its coverage of the pixel, premultiplied (antialiased edges).
  out.color = vec4f(0.0);
  out.display = vec4f(pow(srgb.rgb, vec3f(2.2)) * srgb.a, srgb.a);
  out.featureId = vec2u(feature & 0xffffu, feature >> 16u);
  out.depth = bitcast<f32>(bits);
  return out;
}
