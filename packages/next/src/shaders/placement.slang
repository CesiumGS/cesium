// A draw's per-vertex placement (spec section 7.6; plan 5a's calls 40 to
// 43; plan 13.26): up to three weighted displacement terms,
// p' = p + sum of wi * Di(p), data in the world's placements buffer plus
// this function, not code inside one shader, so a later compute pass can
// evaluate it at sample points the content never had (section 8.2). A
// term's displacement is a cubic lattice's or a vertex attribute's; its
// weight a constant times up to two factors of a parameter's float. The
// float64 CPU twins are scene/warpEvaluate.ts `placeWithTerms` and
// `placeJacobianWithTerms`; the buffer's layout is
// scene/placementTable.ts's.
//
// The surface vertex stage calls `placeVertex` on the mesh's position
// before the custom vertex stage, so the draw's transform carries the
// large offset and the placement moves vertices in model space (call 40).
// It returns the placement's Jacobian J = I + sum of wi * dDi/dp beside
// the position (plan 13.26, increment 2a): the stage turns the vertex's
// tangent by J and its normal by J's cofactor matrix (`turnNormal`), so
// shading follows the surface as drawn, however steep a warp makes it. A
// lattice's Jacobian is the cubic's analytic derivative; an attribute
// term's is zero (data has no derivative in space), so under one the
// normal stays as the mesh stores it. A record without a placement
// (`NO_PLACEMENT`) gets its position back unchanged and the identity.
module placement;

import exactSum;

// The placements: parameters (one float each) and each placed draw's
// block, float4 rows (scene/placementTable.ts). Vertex stage only.
[[vk::binding(7, 1)]] StructuredBuffer<float4> placements;

public static const uint NO_PLACEMENT = 0xffffffffu;
// Terms of a fitted operation's polynomial per axis (scene/placement.ts).
public static const uint PLACEMENT_TERMS = 20u;

// Term kinds, and the rows of a term (scene/placementTable.ts).
static const uint WARP_LATTICE = 1u;
static const uint WARP_ATTRIBUTE = 2u;
// A compiled route (transform graph, scene/world/routes.ts): the displacement
// is the route's own function, evaluated by the route's pipeline variant
// (`routeVertex`), not here. The block's term row is
// [WARP_ROUTE, 0, body row, the route's uniform rows], and the vertex stage
// here leaves the position as it is.
static const uint WARP_ROUTE = 3u;
static const uint TERM_ROWS = 3u;
// Rows before a lattice body's cells: the center and 1 / scale, then the
// lattice's constant displacement (its value at the center) as hi and lo.
static const uint LATTICE_HEAD_ROWS = 3u;

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

// A compiled route's unit reads its draws' rows through this (surface.slang
// `routeRow`): the same seam, outside this module's own reads.
public float4 placementBlockRow(uint row) {
  return placementRow(row);
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

static const float3x3 IDENTITY_JACOBIAN = float3x3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
static const float3x3 ZERO_JACOBIAN = float3x3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);

// A matrix's column (Slang's `m[i]` is its row).
float3 jacobianColumn(float3x3 j, int c) {
  return float3(j[0][c], j[1][c], j[2][c]);
}

// A lattice's displacement at model-space `p` (scene/warpTerms.ts
// `CubicLattice`) less its constant part, which `placementOffset` carries
// (the cell polynomials' constant coefficients hold the rest), and its
// Jacobian `dD/dp` into `jacobian`: its body's first row holds the center
// and 1 / scale, the next two the constant part, then each cell's rows of
// coefficients per monomial. One cell has v = u. The cell's cubic in v has
// the derivative of each monomial per axis, and dv/dp = cells / scale on
// every axis (past the cube the edge cell extrapolates at the same rate).
// Each row's `w` is a scalar over the same cells (`ClipField`, a curved
// clip's signed distance, 0 where the lattice has none), evaluated beside the
// displacement from the same rows into `clip`.
float3 latticeDisplacement(uint body, uint cells, float3 p, out float3x3 jacobian, out float clip) {
  float4 origin = placementRow(body);
  float3 v = (p - origin.xyz) * origin.w;
  float dvdp = origin.w;
  uint cell = 0u;
  if (cells > 1u) {
    float n = float(cells);
    float3 s = (v + 1.0) * (0.5 * n);
    float3 f = clamp(floor(s), float3(0.0), float3(n - 1.0));
    v = 2.0 * (s - f) - 1.0;
    uint3 i = uint3(f);
    cell = (i.z * cells + i.y) * cells + i.x;
    dvdp *= n;
  }
  // Each axis' powers 1, v, v², v³ and their derivatives 0, 1, 2v, 3v².
  float4 px = float4(1.0, v.x, v.x * v.x, v.x * v.x * v.x);
  float4 py = float4(1.0, v.y, v.y * v.y, v.y * v.y * v.y);
  float4 pz = float4(1.0, v.z, v.z * v.z, v.z * v.z * v.z);
  float4 qx = float4(0.0, 1.0, 2.0 * v.x, 3.0 * v.x * v.x);
  float4 qy = float4(0.0, 1.0, 2.0 * v.y, 3.0 * v.y * v.y);
  float4 qz = float4(0.0, 1.0, 2.0 * v.z, 3.0 * v.z * v.z);
  uint first = body + LATTICE_HEAD_ROWS + cell * PLACEMENT_TERMS;
  float3 d = float3(0.0);
  float3 gx = float3(0.0);
  float3 gy = float3(0.0);
  float3 gz = float3(0.0);
  float scalar = 0.0;
  for (uint k = 0u; k < PLACEMENT_TERMS; k++) {
    uint e = TERM_POWERS[k];
    uint a = e & 3u;
    uint b = (e >> 2u) & 3u;
    uint c = (e >> 4u) & 3u;
    float4 row = placementRow(first + k);
    float3 coefficient = row.xyz;
    d += coefficient * (px[a] * py[b] * pz[c]);
    scalar += row.w * (px[a] * py[b] * pz[c]);
    gx += coefficient * (qx[a] * (py[b] * pz[c]));
    gy += coefficient * (qy[b] * (px[a] * pz[c]));
    gz += coefficient * (qz[c] * (px[a] * py[b]));
  }
  jacobian = transpose(float3x3(gx * dvdp, gy * dvdp, gz * dvdp));
  clip = scalar;
  return d;
}

// A term's displacement Di at model-space `p` (`head`: its row's words,
// `block`: the block's first row): the lattice's, or the vertex's
// attribute (minus the point, if it holds a position) from the mesh's
// attribute directory (`directory`, the vertex, its feature's row); and
// its Jacobian `dDi/dp` into `jacobian`. An attribute is data, with no
// derivative in space, so its Jacobian is zero: the point's own is the
// identity (`Placed.jacobian`), and a normal is not turned by it. A lattice
// also gives its clip field's value into `clip` (0 for an attribute).
float3 termDisplacement(uint4 head, uint block, float3 p, uint vertexIndex, uint directory, uint feature,
                        out float3x3 jacobian, out float clip) {
  if ((head.x & 255u) == WARP_LATTICE) {
    return latticeDisplacement(block + head.z, head.w, p, jacobian, clip);
  }
  jacobian = ZERO_JACOBIAN;
  clip = 0.0;
  if ((head.x & 255u) == WARP_ROUTE) {
    return float3(0.0);
  }
  float3 other = placementAttribute(directory, head.z, vertexIndex, feature).xyz;
  return head.w != 0u ? other - p : other;
}

// Where a placement puts a vertex, and how it turns its surface.
public struct Placed {
  public float3 position;     // model space
  public float3x3 jacobian;   // d(position) / d(design position): I + the sum of wi * dDi/dp
  public float clip;          // the first lattice's clip field at the design position (a curved clip's signed distance); 0 if none
};

// Where the draw's placement (`DrawRecord.placement`, its block's header
// row) puts the vertex at model-space `positionMC`, in model space: the
// position plus each term's weight times its displacement, less each
// lattice's constant part (`placementOffset`: the draw's transform carries
// it, so the drawn position is this one relative to where the draw's origin
// is drawn); and the
// placement's Jacobian there, which turns tangents (J t) and normals
// (`turnNormal`). Without a placement: the position as it is, and the
// identity. `clip` is the block's first lattice's scalar (not weighted: a
// lattice that only carries it has weight 0).
public Placed placeVertex(uint placement, float3 positionMC, uint vertexIndex, uint directory, uint feature) {
  Placed placed;
  placed.position = positionMC;
  placed.jacobian = IDENTITY_JACOBIAN;
  placed.clip = 0.0;
  if (placement == NO_PLACEMENT) {
    return placed;
  }
  uint count = asuint(placementRow(placement).x);
  float3 d = float3(0.0);
  float3x3 j = ZERO_JACOBIAN;
  bool clipTaken = false;
  for (uint i = 0u; i < count; i++) {
    uint row = placement + 1u + i * TERM_ROWS;
    uint4 head = asuint(placementRow(row));
    float w = termWeight(row, head);
    float3x3 jd;
    float clip;
    d += w * termDisplacement(head, placement, positionMC, vertexIndex, directory, feature, jd, clip);
    j += w * jd;
    if (!clipTaken && (head.x & 255u) == WARP_LATTICE) {
      placed.clip = clip;
      clipTaken = true;
    }
  }
  placed.position = positionMC + d;
  placed.jacobian = IDENTITY_JACOBIAN + j;
  return placed;
}

// `placeVertex`'s position alone.
public float3 placePosition(uint placement, float3 positionMC, uint vertexIndex, uint directory, uint feature) {
  return placeVertex(placement, positionMC, vertexIndex, directory, feature).position;
}

// A normal `n` turned by a placement's Jacobian `j`: the cofactor matrix
// (det(J) J⁻ᵀ, no inverse) takes a surface's normal to the normal of the
// surface J carries it to, and a negative determinant (a fold) keeps the
// normal on its side. Unit length.
public float3 turnNormal(float3x3 j, float3 n) {
  float3 c0 = jacobianColumn(j, 0);
  float3 c1 = jacobianColumn(j, 1);
  float3 c2 = jacobianColumn(j, 2);
  float3 a = cross(c1, c2);
  float3 turned = a * n.x + cross(c2, c0) * n.y + cross(c0, c1) * n.z;
  return normalize(dot(c0, a) < 0.0 ? -turned : turned);
}

// The draw's order-0 displacement: the sum of its lattice terms' weights
// times their constant parts, in model space, as hi (`hi`) and lo (`lo`)
// float32 parts that add exactly to the sum to about 1e-14 of it (a
// product by `twoProd`). The vertex stage's `placeVertex` leaves it out: the
// cull kernel adds it to the camera-relative transform (cullTables.slang
// `drawnTranslation`), where it meets the origin's equal and opposite
// offset from the camera before either is rounded (plan 13.26, the second
// review's flaw 3: added to a vertex in model space the two cancel at the
// float32 precision of tens of kilometers, 4 mm at 36 km). Zero for a draw
// without a placement and for attribute terms.
public void placementOffset(uint placement, out float3 hi, out float3 lo) {
  hi = float3(0.0);
  lo = float3(0.0);
  if (placement == NO_PLACEMENT) {
    return;
  }
  uint count = asuint(placementRow(placement).x);
  for (uint i = 0u; i < count; i++) {
    uint row = placement + 1u + i * TERM_ROWS;
    uint4 head = asuint(placementRow(row));
    if ((head.x & 255u) != WARP_LATTICE) {
      continue;
    }
    float w = termWeight(row, head);
    uint body = placement + head.z;
    float3 constantHi = placementRow(body + 1u).xyz;
    float3 constantLo = placementRow(body + 2u).xyz;
    for (uint a = 0u; a < 3u; a++) {
      float2 p = twoProd(w, constantHi[a]);
      float2 s = twoSum(hi[a], p.x);
      hi[a] = s.x;
      lo[a] += s.y + p.y + w * constantLo[a];
    }
  }
  for (uint a = 0u; a < 3u; a++) {
    float2 s = twoSum(hi[a], lo[a]);
    hi[a] = s.x;
    lo[a] = s.y;
  }
}

// Where a placement of lattice terms puts a point of the model, in model
// space, in one float32 value: the point's displacement, order 0 included,
// for the kernels that write a point's position (a point source's frame
// kernel, vector/points.slang) rather than draw a vertex. Attribute terms
// (data per vertex) move nothing here.
public float3 placeAnchor(uint placement, float3 p) {
  if (placement == NO_PLACEMENT) {
    return p;
  }
  uint count = asuint(placementRow(placement).x);
  float3 d = float3(0.0);
  for (uint i = 0u; i < count; i++) {
    uint row = placement + 1u + i * TERM_ROWS;
    uint4 head = asuint(placementRow(row));
    if ((head.x & 255u) != WARP_LATTICE) {
      continue;
    }
    float w = termWeight(row, head);
    uint body = placement + head.z;
    float3x3 jacobian;
    float clip;
    float3 residual = latticeDisplacement(body, head.w, p, jacobian, clip);
    float3 offset0 = placementRow(body + 1u).xyz + placementRow(body + 2u).xyz;
    d += w * (offset0 + residual);
  }
  return p + d;
}
