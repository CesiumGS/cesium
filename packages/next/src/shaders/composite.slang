// Translucency's composite (translucent.wgsl): per pixel, the translucent
// layers' light C and the light T they let through, blended over the
// opaque pass's resolved targets as premultiplied color with alpha 1 - T:
// scene-referred light over the scene target (its alpha, coverage, as
// "over"), display-referred (unlit) color over the display target, whose
// alpha (the unlit share) only drops by T. The present pass then tonemaps
// the glass's own light with what shows through it.

struct TranslucentParams {
  uint width;
  uint height;
  uint nodesBase;
  uint capacity;
  float logNear;
  float invLogRange;
  float bias;
  float pad;
};

[[vk::binding(0, 0)]] ConstantBuffer<TranslucentParams> translucency;
[[vk::binding(1, 0)]] StructuredBuffer<uint> lists;
[[vk::binding(2, 0)]] Texture2D<float4> momentsZero;
[[vk::binding(3, 0)]] Texture2D<float4> accumulatedLit;
[[vk::binding(4, 0)]] Texture2D<float4> accumulatedUnlit;

static const uint LIST_HEADER = 4u;
// A node's `next` word: the next node plus one, below its samples' bits
// (translucent.wgsl `appendNode`). The scene's targets are 4× (SCENE_TARGETS).
static const uint LIST_SAMPLE_SHIFT = 28u;
static const uint LIST_NEXT = (1u << LIST_SAMPLE_SHIFT) - 1u;
static const uint SAMPLES = 4u;
// Layers per pixel sorted; past these, the nearest are kept.
static const uint MAX_LAYERS = 32u;

[shader("vertex")]
float4 vs(uint i : SV_VertexID) : SV_Position {
  float2 uv = float2(float((i << 1u) & 2u), float(i & 2u));
  return float4(uv * 2.0 - 1.0, 0.0, 1.0);
}

struct CompositeOut {
  float4 scene : SV_Target0;
  float4 display : SV_Target1;
};

// The exact way, in two steps. First a compute pass (`sortLists`), a thread
// a pixel: its list sorted nearest first, blended front to back until next
// to nothing shows through, into `sortedLit` and `sortedUnlit` (the moments'
// accumulation targets, which this way doesn't otherwise use); then
// `fsSorted` puts them over the opaque pass's. The sort is in workgroup
// memory, each thread its own MAX_LAYERS slots: done in the fragment
// shader, two private arrays of MAX_LAYERS held every pixel's registers,
// light lists or none, and the pass took tens of milliseconds.
[[vk::binding(5, 0)]] [[vk::image_format("rgba16f")]] WTexture2D<float4> sortedLit;
[[vk::binding(6, 0)]] [[vk::image_format("rgba16f")]] WTexture2D<float4> sortedUnlit;

static const uint SORT_THREADS = 32u; // 8 × 4: MAX_LAYERS × 8 bytes each, 8 KB
groupshared float sortDepths[MAX_LAYERS * SORT_THREADS];
groupshared uint sortNodes[MAX_LAYERS * SORT_THREADS];

// A thread's slot i: interleaved, so the threads' slots i are adjacent
// (no bank conflicts).
uint slot(uint i, uint lane) {
  return i * SORT_THREADS + lane;
}

[shader("compute")]
[numthreads(8, 4, 1)]
void sortLists(uint3 id : SV_DispatchThreadID, uint lane : SV_GroupIndex) {
  if (id.x >= translucency.width || id.y >= translucency.height) {
    return;
  }
  uint next = lists[LIST_HEADER + id.y * translucency.width + id.x];
  uint count = 0u;
  while (next != 0u) {
    uint node = translucency.nodesBase + (next - 1u) * 4u;
    float depth = asfloat(lists[node + 2u]);
    next = lists[node + 3u] & LIST_NEXT;
    // Reverse-Z: nearer is greater. Full, a layer farther than every kept
    // one is dropped; nearer, it takes the farthest's place.
    uint i = count;
    if (count == MAX_LAYERS) {
      if (depth <= sortDepths[slot(MAX_LAYERS - 1u, lane)]) {
        continue;
      }
      i = MAX_LAYERS - 1u;
    } else {
      count++;
    }
    while (i > 0u && sortDepths[slot(i - 1u, lane)] < depth) {
      sortDepths[slot(i, lane)] = sortDepths[slot(i - 1u, lane)];
      sortNodes[slot(i, lane)] = sortNodes[slot(i - 1u, lane)];
      i--;
    }
    sortDepths[slot(i, lane)] = depth;
    sortNodes[slot(i, lane)] = node;
  }
  // Each sample blended on its own (a node over the samples it covers),
  // then the four averaged: glass's edges antialias. The loops over the
  // samples unrolled, so their sums stay in registers.
  float3 lit[SAMPLES];
  float3 unlit[SAMPLES];
  float4 through = float4(1.0);
  [ForceUnroll]
  for (uint s = 0u; s < SAMPLES; s++) {
    lit[s] = float3(0.0);
    unlit[s] = float3(0.0);
  }
  for (uint k = 0u; k < count && any(through > 1e-3); k++) {
    uint node = sortNodes[slot(k, lane)];
    float2 rg = unpackHalf2x16ToFloat(lists[node]);
    float2 ba = unpackHalf2x16ToFloat(lists[node + 1u]);
    uint covers = lists[node + 3u] >> LIST_SAMPLE_SHIFT;
    float alpha = abs(ba.y);
    float3 color = float3(rg, ba.x) * alpha;
    [ForceUnroll]
    for (uint s = 0u; s < SAMPLES; s++) {
      if ((covers & (1u << s)) != 0u) {
        if (ba.y < 0.0) {
          unlit[s] += color * through[s];
        } else {
          lit[s] += color * through[s];
        }
        through[s] *= 1.0 - alpha;
      }
    }
  }
  // Every pixel written: no list, no light and nothing hidden (alpha 0).
  float hidden = 1.0 - dot(through, float4(1.0 / float(SAMPLES)));
  float3 litSum = (lit[0] + lit[1] + lit[2] + lit[3]) / float(SAMPLES);
  float3 unlitSum = (unlit[0] + unlit[1] + unlit[2] + unlit[3]) / float(SAMPLES);
  sortedLit.Store(id.xy, float4(litSum, hidden));
  sortedUnlit.Store(id.xy, float4(unlitSum, hidden));
}

// The exact way's second step: what `sortLists` blended, over the opaque
// pass's targets (as premultiplied color; alpha 0 changes nothing).
[shader("fragment")]
CompositeOut fsSorted(float4 frag : SV_Position) {
  int3 p = int3(int2(frag.xy), 0);
  float4 lit = accumulatedLit.Load(p);
  if (!(lit.a > 0.0)) {
    discard;
  }
  CompositeOut out;
  out.scene = lit;
  out.display = accumulatedUnlit.Load(p);
  return out;
}

// The moments' way: the weighted sums normalized so the layers together
// hide exactly what their total absorbance does.
[shader("fragment")]
CompositeOut fsMoments(float4 frag : SV_Position) {
  int3 p = int3(int2(frag.xy), 0);
  float b0 = momentsZero.Load(p).r;
  if (b0 < 0.00100050033) {
    discard;
  }
  float4 lit = accumulatedLit.Load(p);
  float4 unlit = accumulatedUnlit.Load(p);
  // No weight (every layer estimated hidden): nothing to put back.
  if (!(lit.a > 0.0)) {
    discard;
  }
  float opacity = 1.0 - exp(-b0);
  float k = opacity / lit.a;
  CompositeOut out;
  out.scene = float4(lit.rgb * k, opacity);
  out.display = float4(unlit.rgb * k, opacity);
  return out;
}
