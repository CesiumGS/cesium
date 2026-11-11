// B-rep patch dicing (CESIUM2_WEBGPU_PLAN.md §13.33, "Step 5 redirected",
// part 1): per view, after the cull, `dicePatches` turns each visible patch
// draw's spans into chunks of at most 8 × 8 cells and `writePatchArgs` writes
// the draw's one non-indexed indirect draw (vertexCount = 8 · 8 · 6 and
// instanceCount = chunks). The vertex stage (surface.slang `patchVertex`)
// evaluates a chunk's cells.
//
// A patch draw is its own batch and its own record (the item is the
// record's), so a draw's dispatch reads its cull count from the batch's
// arguments: 0 where the cull dropped it. Per span, a thread:
//   1. skips a span outside the frustum (not under a placement: a warp moves
//      what the span's sphere bounds, the record's sphere carries the pad);
//   2. finds the pixels a model metre covers at the face's nearest distance
//      (perspective and orthographic alike: the view's rows over the depth w,
//      which is a constant 1 in an orthographic projection), the same for
//      every span of the face, so neighbouring spans put matching samples on
//      their shared boundaries;
//   3. takes the cells per unit of (u, v) that keep the error within the
//      target in pixels, from the face's constants (src/brep/gpuPatches.ts
//      `diceDensity` is this, with the derivation): the error's terms
//      D_u / ρ_u² + D_uv / (ρ_u ρ_v) + D_v / ρ_v² that aren't zero share
//      the target equally;
//   4. rounds n_u and n_v up to 1 to 64 and appends the span's chunks.
// A placement adds error the constants don't hold: `jacobian` scales them and
// `curvature` (its second derivative) adds D' += curvature · speeds² / 8,
// both bounds the CPU computes per draw (scene/world/patches.ts).
import common;
import cullTables;
import patch;

// A patch draw's parameters (scene/world/patches.ts `PATCH_DICE_BYTES`).
struct PatchDice {
  uint record;          // the draw's record, and its item
  uint batch;           // its batch: the arguments' row
  uint spans;
  uint capacity;        // chunks its list holds
  float errorPixels;    // the target: the error a cell may leave, pixels
  float jacobian;       // a placement's Jacobian bound (1: none)
  float curvature;      // its second derivative's bound, per model metre (0: none)
  uint pad;
};

[[vk::binding(0, 2)]] ConstantBuffer<PatchDice> dice;
// The slab's arena, which holds the draw's span records and control points.
[[vk::binding(1, 2)]] StructuredBuffer<float> arena;
// The draw's chunks: (record, span, cell origin and counts packed, 0), one
// instance each: `i0 | j0 << 8 | n_u << 16 | n_v << 24`, the origin in cells.
[[vk::binding(2, 2)]] RWStructuredBuffer<uint4> chunks;

// The cells a side of `x` per unit takes, 1 to MAX_CELLS (NaN or beyond: the most).
uint cellCount(float x) {
  float y = (x == x) ? min(x, 1.0e6) : 1.0e6;
  return uint(clamp(ceil(y), 1.0, float(MAX_CELLS)));
}

[shader("compute")]
[numthreads(64, 1, 1)]
void dicePatches(uint3 gid : SV_DispatchThreadID) {
  uint index = gid.x;
  if (index >= dice.spans) {
    return;
  }
  uint a = argumentSlot(dice.batch);
  if (countedInstances(a) == 0u) {
    return; // the cull dropped the draw in this view
  }
  DrawRecord r = drawRecord(dice.record);
  float4x4 m = items[dice.record].relModel;
  SpanWords w;
  uint base = r.positionOffset + index * SPAN_WORDS;
  for (uint k = 0u; k < SPAN_WORDS; k++) {
    w.u[k] = asuint(arena[base + k]);
  }
  PatchSpan s = unpackSpan(w);

  float scale = max(
      length(float3(m[0][0], m[1][0], m[2][0])),
      max(length(float3(m[0][1], m[1][1], m[2][1])),
          length(float3(m[0][2], m[1][2], m[2][2]))));
  if (r.placement == NONE && !inFrustum(m, s.sphere.xyz, s.sphere.w * scale)) {
    return;
  }

  // Pixels per model metre at the face's nearest depth.
  float3 center = mul(m, float4(s.faceSphere.xyz, 1.0)).xyz;
  float4 clip = mul(view.viewProj, float4(center, 1.0));
  float perspective = length(view.viewProj[3].xyz);
  float depth = max(clip.w - s.faceSphere.w * scale * perspective, perspective * view.near);
  float rows = max(
      length(view.viewProj[0].xyz) * view.viewport.x,
      length(view.viewProj[1].xyz) * view.viewport.y) * 0.5;
  float pixels = rows * scale / max(depth, 1.0e-6);
  float error = dice.errorPixels / max(pixels, 1.0e-12);

  float3 d = s.density;
  float2 v = s.speed;
  float du = dice.jacobian * d.x + dice.curvature * v.x * v.x * 0.125;
  float duv = dice.jacobian * d.y + dice.curvature * 2.0 * v.x * v.y * 0.125;
  float dv = dice.jacobian * d.z + dice.curvature * v.y * v.y * 0.125;
  // The terms that are not zero share the target equally.
  float shares = float(int(du > 0.0) + int(duv > 0.0) + int(dv > 0.0));
  float ru = sqrt(shares * du / error);
  float rv = sqrt(shares * dv / error);
  float wanted = shares * duv / error;
  float have = ru * rv;
  if (have < wanted) {
    if (ru > 0.0 && rv > 0.0) {
      float f = sqrt(wanted / have);
      ru *= f;
      rv *= f;
    } else if (ru > 0.0) {
      rv = wanted / ru;
    } else if (rv > 0.0) {
      ru = wanted / rv;
    } else {
      ru = sqrt(wanted);
      rv = ru;
    }
  }
  uint nu = cellCount(ru * (s.rect.y - s.rect.x));
  uint nv = cellCount(rv * (s.rect.w - s.rect.z));

  uint across = (nu + CHUNK_CELLS - 1u) / CHUNK_CELLS;
  uint total = across * ((nv + CHUNK_CELLS - 1u) / CHUNK_CELLS);
  uint first = countChunks(a, total);
  for (uint c = 0u; c < total; c++) {
    if (first + c >= dice.capacity) {
      break;
    }
    uint i0 = (c % across) * CHUNK_CELLS;
    uint j0 = (c / across) * CHUNK_CELLS;
    chunks[first + c] = uint4(dice.record, index, i0 | (j0 << 8u) | (nu << 16u) | (nv << 24u), 0u);
  }
}

// The draw's arguments from the chunks the dice wrote: one instance each of
// a chunk's 8 × 8 cells × 6 vertices (no chunks: none drawn).
[shader("compute")]
[numthreads(1, 1, 1)]
void writePatchArgs() {
  uint a = argumentSlot(dice.batch);
  storePatchArguments(
      a, 6u * CHUNK_CELLS * CHUNK_CELLS, min(countedChunks(a), dice.capacity));
}
