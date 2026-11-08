// A draw's per-vertex placement (spec section 7.6; plan 5a's calls 40 to
// 43): data in the world's placements buffer plus this function, not code
// inside one shader, so a later compute pass can evaluate it at sample
// points the content never had (section 8.2). Its float64 CPU twin is
// scene/placement.ts `placePosition`; the buffer's layout is
// scene/placementTable.ts's.
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

static const uint PLACEMENT_DUAL = 1u;
static const uint PLACEMENT_FITTED = 2u;
static const uint PLACEMENT_BLEND = 3u;

// Each term's exponents of u's x, y and z, 2 bits each (x | y << 2 |
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

// A fitted body's displacement at model-space `p`: its center and
// 1 / scale, then a row of coefficients per term.
float3 fittedDisplacement(uint body, float3 p) {
  float4 origin = placementRow(body);
  float3 u = (p - origin.xyz) * origin.w;
  float3 d = float3(0.0);
  for (uint k = 0u; k < PLACEMENT_TERMS; k++) {
    uint e = TERM_POWERS[k];
    float m = powerOf(u.x, e & 3u) * powerOf(u.y, (e >> 2u) & 3u) * powerOf(u.z, (e >> 4u) & 3u);
    d += placementRow(body + 1u + k).xyz * m;
  }
  return d;
}

// Where the draw's placement (`DrawRecord.placement`) puts the vertex at
// model-space `positionMC`, in model space: the dual position read from
// the mesh's attribute directory (`directory`, the vertex, its feature's
// row), a fitted operation's displacement added, or a blend of two.
public float3 placePosition(uint placement, float3 positionMC, uint vertexIndex, uint directory, uint feature) {
  if (placement == NO_PLACEMENT) {
    return positionMC;
  }
  uint4 header = asuint(placementRow(placement));
  if (header.x == PLACEMENT_DUAL) {
    float3 other = placementAttribute(directory, header.z, vertexIndex, feature).xyz;
    return lerp(positionMC, other, placementParameter(header.y));
  }
  if (header.x == PLACEMENT_FITTED) {
    return positionMC + fittedDisplacement(placement + 1u, positionMC);
  }
  if (header.x == PLACEMENT_BLEND) {
    float t = placementParameter(header.y);
    float3 from = float3(0.0);
    float3 to = float3(0.0);
    if (header.z != NO_PLACEMENT) {
      from = fittedDisplacement(header.z, positionMC);
    }
    if (header.w != NO_PLACEMENT) {
      to = fittedDisplacement(header.w, positionMC);
    }
    return positionMC + lerp(from, to, t);
  }
  return positionMC;
}
