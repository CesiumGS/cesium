// A draw's per-vertex placement (spec section 7.6; plan 5a's calls 40 to
// 43; plan 13.26): up to three weighted displacement terms,
// p' = p + sum of wi * Di(p), data in the world's placements buffer plus
// this function, not code inside one shader, so a later compute pass can
// evaluate it at sample points the content never had (section 8.2). A
// term's displacement is a cubic lattice's or a vertex attribute's; its
// weight a constant times up to two factors of a parameter's float. The
// float64 CPU twin is scene/warpEvaluate.ts `placeWithTerms`; the buffer's
// layout is scene/placementTable.ts's.
//
// The surface vertex stage calls `placePosition` on the mesh's position
// before the custom vertex stage, so the draw's transform carries the
// large offset and the placement moves vertices in model space (call 40).
// A record without a placement (`NO_PLACEMENT`) gets its position back
// unchanged.
module placement;

// The placements: parameters (one float each) and each placed draw's
// block, float4 rows (scene/placementTable.ts). Vertex stage only.
[[vk::binding(7, 1)]] StructuredBuffer<float4> placements;

public static const uint NO_PLACEMENT = 0xffffffffu;
// Terms of a fitted operation's polynomial per axis (scene/placement.ts).
public static const uint PLACEMENT_TERMS = 20u;

// Term kinds, and the rows of a term (scene/placementTable.ts).
static const uint WARP_LATTICE = 1u;
static const uint WARP_ATTRIBUTE = 2u;
static const uint TERM_ROWS = 3u;

// Each monomial's exponents of v's x, y and z, 2 bits each (x | y << 2 |
// z << 4), in scene/placement.ts PLACEMENT_MONOMIALS's order.
static const uint TERM_POWERS[20] = {
  0u, 1u, 4u, 16u,
  2u, 5u, 17u, 8u, 20u, 32u,
  3u, 6u, 18u, 9u, 21u, 33u, 12u, 24u, 36u, 48u
};

// A named attribute of a vertex (surface.slang `readNamed`, defined in the
// unit this module is linked into).
__target_intrinsic(wgsl, "readNamed($0, $1, $2, $3)")
float4 placementAttribute(uint directory, uint hash, uint vertexIndex, uint feature);

// The only read of `placements` (the buffer's seam, test/seams.test.ts).
[ForceInline]
float4 placementRow(uint row) {
  return placements[row];
}

// A parameter's float (its word in the buffer).
float placementParameter(uint word) {
  return placementRow(word >> 2u)[word & 3u];
}

// `x` to the power `e` (0 to 3).
float powerOf(float x, uint e) {
  return e == 0u ? 1.0 : (e == 1u ? x : (e == 2u ? x * x : x * x * x));
}

// A term's weight: its row's scale times its factors' values, each
// `offset + slope * parameter` (the factor rows follow the term's).
float termWeight(uint row, uint4 head) {
  float w = asfloat(head.y);
  uint factors = (head.x >> 8u) & 3u;
  for (uint f = 0u; f < factors; f++) {
    float4 factor = placementRow(row + 1u + f);
    w *= factor.y + factor.z * placementParameter(asuint(factor.x));
  }
  return w;
}

// A lattice's displacement at model-space `p` (scene/warpTerms.ts
// `CubicLattice`): its body's first row holds the center and 1 / scale,
// then each cell's rows of coefficients per monomial. One cell has v = u.
float3 latticeDisplacement(uint body, uint cells, float3 p) {
  float4 origin = placementRow(body);
  float3 v = (p - origin.xyz) * origin.w;
  uint cell = 0u;
  if (cells > 1u) {
    float n = float(cells);
    float3 s = (v + 1.0) * (0.5 * n);
    float3 f = clamp(floor(s), float3(0.0), float3(n - 1.0));
    v = 2.0 * (s - f) - 1.0;
    uint3 i = uint3(f);
    cell = (i.z * cells + i.y) * cells + i.x;
  }
  uint first = body + 1u + cell * PLACEMENT_TERMS;
  float3 d = float3(0.0);
  for (uint k = 0u; k < PLACEMENT_TERMS; k++) {
    uint e = TERM_POWERS[k];
    float m = powerOf(v.x, e & 3u) * powerOf(v.y, (e >> 2u) & 3u) * powerOf(v.z, (e >> 4u) & 3u);
    d += placementRow(first + k).xyz * m;
  }
  return d;
}

// A term's displacement Di at model-space `p` (`head`: its row's words,
// `block`: the block's first row): the lattice's, or the vertex's
// attribute (minus the point, if it holds a position) from the mesh's
// attribute directory (`directory`, the vertex, its feature's row).
float3 termDisplacement(uint4 head, uint block, float3 p, uint vertexIndex, uint directory, uint feature) {
  if ((head.x & 255u) == WARP_LATTICE) {
    return latticeDisplacement(block + head.z, head.w, p);
  }
  float3 other = placementAttribute(directory, head.z, vertexIndex, feature).xyz;
  return head.w != 0u ? other - p : other;
}

// Where the draw's placement (`DrawRecord.placement`, its block's header
// row) puts the vertex at model-space `positionMC`, in model space: the
// position plus each term's weight times its displacement.
public float3 placePosition(uint placement, float3 positionMC, uint vertexIndex, uint directory, uint feature) {
  if (placement == NO_PLACEMENT) {
    return positionMC;
  }
  uint count = asuint(placementRow(placement).x);
  float3 d = float3(0.0);
  for (uint i = 0u; i < count; i++) {
    uint row = placement + 1u + i * TERM_ROWS;
    uint4 head = asuint(placementRow(row));
    d += termWeight(row, head) * termDisplacement(head, placement, positionMC, vertexIndex, directory, feature);
  }
  return positionMC + d;
}
