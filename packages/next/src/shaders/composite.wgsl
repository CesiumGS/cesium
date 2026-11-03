// Translucency's composite (translucent.wgsl): per pixel, the translucent
// layers' light C and the light T they let through, blended over the
// opaque pass's resolved targets as premultiplied color with alpha 1 - T:
// scene-referred light over the scene target (its alpha, coverage, as
// "over"), display-referred (unlit) color over the display target, whose
// alpha (the unlit share) only drops by T. The present pass then tonemaps
// the glass's own light with what shows through it.

struct TranslucentParams {
  width: u32,
  height: u32,
  nodesBase: u32,
  capacity: u32,
  logNear: f32,
  invLogRange: f32,
  bias: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> translucency: TranslucentParams;
@group(0) @binding(1) var<storage, read> lists: array<u32>;
@group(0) @binding(2) var momentsZero: texture_2d<f32>;
@group(0) @binding(3) var accumulatedLit: texture_2d<f32>;
@group(0) @binding(4) var accumulatedUnlit: texture_2d<f32>;

const LIST_HEADER = 4u;
// Layers per pixel sorted; past these, the nearest are kept.
const MAX_LAYERS = 32u;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let uv = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
}

struct CompositeOut {
  @location(0) scene: vec4f,
  @location(1) display: vec4f,
};

// The exact way: the pixel's list sorted nearest first, blended front to
// back until next to nothing shows through.
@fragment
fn fsExact(@builtin(position) frag: vec4f) -> CompositeOut {
  let pixel = u32(frag.y) * translucency.width + u32(frag.x);
  var next = lists[LIST_HEADER + pixel];
  if (next == 0u) {
    discard;
  }
  var depths: array<f32, MAX_LAYERS>;
  var nodes: array<u32, MAX_LAYERS>;
  var count = 0u;
  while (next != 0u) {
    let node = translucency.nodesBase + (next - 1u) * 4u;
    let depth = bitcast<f32>(lists[node + 2u]);
    next = lists[node + 3u];
    // Reverse-Z: nearer is greater. Full, a layer farther than every kept
    // one is dropped; nearer, it takes the farthest's place.
    var i = count;
    if (count == MAX_LAYERS) {
      if (depth <= depths[MAX_LAYERS - 1u]) {
        continue;
      }
      i = MAX_LAYERS - 1u;
    } else {
      count++;
    }
    while (i > 0u && depths[i - 1u] < depth) {
      depths[i] = depths[i - 1u];
      nodes[i] = nodes[i - 1u];
      i--;
    }
    depths[i] = depth;
    nodes[i] = node;
  }
  var lit = vec3f(0.0);
  var unlit = vec3f(0.0);
  var through = 1.0;
  for (var k = 0u; k < count && through > 1e-3; k++) {
    let node = nodes[k];
    let rg = unpack2x16float(lists[node]);
    let ba = unpack2x16float(lists[node + 1u]);
    let alpha = abs(ba.y);
    let light = vec3f(rg, ba.x) * (through * alpha);
    if (ba.y < 0.0) {
      unlit += light;
    } else {
      lit += light;
    }
    through *= 1.0 - alpha;
  }
  return CompositeOut(vec4f(lit, 1.0 - through), vec4f(unlit, 1.0 - through));
}

// The moments' way: the weighted sums normalized so the layers together
// hide exactly what their total absorbance does.
@fragment
fn fsMoments(@builtin(position) frag: vec4f) -> CompositeOut {
  let p = vec2u(frag.xy);
  let b0 = textureLoad(momentsZero, p, 0).r;
  if (b0 < 0.00100050033) {
    discard;
  }
  let lit = textureLoad(accumulatedLit, p, 0);
  let unlit = textureLoad(accumulatedUnlit, p, 0);
  // No weight (every layer estimated hidden): nothing to put back.
  if (!(lit.a > 0.0)) {
    discard;
  }
  let opacity = 1.0 - exp(-b0);
  let k = opacity / lit.a;
  return CompositeOut(vec4f(lit.rgb * k, opacity), vec4f(unlit.rgb * k, opacity));
}
