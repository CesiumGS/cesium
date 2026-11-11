// Ray casting against draw geometry (World.castRays). The CPU picks the
// draws whose bounds a ray crosses and splits each into jobs of 64
// triangles; one workgroup runs a job, one thread tests one triangle
// (Möller–Trumbore, both faces) and keeps the nearest hit per ray with an
// atomic min on the distance's bits (non-negative floats order as u32s).
// Clips are not tested here: the kernel keeps one hit per ray, so a hit the
// clips remove is found on the CPU in float64 and the ray cast again from
// behind it (scene/world/rays.ts).
// Brute force over candidate draws: a BVH replaces the job list later
// (plan §13.10). A cast's rays are in one anchor's coordinates
// (CastOptions.anchor), and only draws under that anchor are candidates,
// so a ray and a transform's origin share coordinates.

import common;

struct Ray {
  float3 originHi;         // origin in the cast's anchor, split hi/lo
  float maxDistance;
  float3 originLo;
  uint pad0;
  float3 direction;        // unit, the anchor's axes
  uint pad1;
};

struct Job {
  uint ray;
  uint record;
  uint firstTriangle;
  uint instance;           // instance-table slot, or 0xffffffff
};

[[vk::binding(0, 0)]] StructuredBuffer<Ray> rays;
[[vk::binding(1, 0)]] StructuredBuffer<Job> jobs;
[[vk::binding(2, 0)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(3, 0)]] StructuredBuffer<Transform> transforms;
[[vk::binding(4, 0)]] StructuredBuffer<Instance> instanceTable;
[[vk::binding(5, 0)]] StructuredBuffer<float> vertices;
[[vk::binding(6, 0)]] StructuredBuffer<uint> indices;
[[vk::binding(7, 0)]] RWStructuredBuffer<Atomic<uint>> hits;

static const uint NONE = 0xffffffffu;

// A draw's record: the only read of `records` here (the per-draw constants
// seam, plan 5a's call 37; this kernel binds its own tables).
[ForceInline]
DrawRecord drawRecord(uint index) {
  return records[index];
}

float3 position(uint offset, uint index) {
  uint b = offset + index * 3u;
  return float3(vertices[b], vertices[b + 1u], vertices[b + 2u]);
}

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 wg : SV_GroupID, uint lane : SV_GroupIndex) {
  uint jobIndex = wg.y * WorkgroupCount().x + wg.x;
  uint jobCount, stride;
  jobs.GetDimensions(jobCount, stride);
  if (jobIndex >= jobCount) {
    return;
  }
  Job job = jobs[jobIndex];
  // The record's fields, read once here: Slang splits a large struct's
  // load into a read of each field where it is used, and the repeated
  // bounds-checked reads cost this kernel 30% (the gate, plan §3.4).
  DrawRecord r = drawRecord(job.record);
  uint indexCount = r.indexCount;
  uint firstIndex = r.firstIndex;
  uint positionOffset = r.positionOffset;
  uint triangle = job.firstTriangle + lane;
  if (triangle * 3u + 2u >= indexCount) {
    return;
  }
  Transform t = transforms[r.transform];
  Ray ray = rays[job.ray];
  // Relative to the transform's origin: the difference is exact
  // (SplitPosition), so nearby geometry keeps float32 precision.
  float3 origin = SplitPosition(ray.originHi, ray.originLo)
                      .difference(SplitPosition(t.originHi, t.originLo));
  // The instance's affine, by row (as Slang indexes matrices).
  float3x3 local = float3x3(1, 0, 0, 0, 1, 0, 0, 0, 1);
  float3 offset = float3(0.0);
  if (job.instance != NONE) {
    Instance inst = instanceTable[job.instance];
    local = float3x3(inst.row0.xyz, inst.row1.xyz, inst.row2.xyz);
    offset = float3(inst.row0.w, inst.row1.w, inst.row2.w);
  }
  uint first = firstIndex + triangle * 3u;
  float3 a = mul(t.linear, mul(local, position(positionOffset, indices[first])) + offset);
  float3 b = mul(t.linear, mul(local, position(positionOffset, indices[first + 1u])) + offset);
  float3 c = mul(t.linear, mul(local, position(positionOffset, indices[first + 2u])) + offset);

  float3 e1 = b - a;
  float3 e2 = c - a;
  float3 p = cross(ray.direction, e2);
  float det = dot(e1, p);
  if (abs(det) < 1e-12) {
    return;
  }
  float inv = 1.0 / det;
  float3 s = origin - a;
  float u = dot(s, p) * inv;
  if (u < 0.0 || u > 1.0) {
    return;
  }
  float3 q = cross(s, e1);
  float v = dot(ray.direction, q) * inv;
  if (v < 0.0 || u + v > 1.0) {
    return;
  }
  float d = dot(e2, q) * inv;
  if (d >= 0.0 && d <= ray.maxDistance) {
    hits[job.ray].min(asuint(d));
  }
}

// A pick's hit triangle (render/view/pickDomain.ts, shaders/pickDomain.slang):
// the triangle's three stored positions, as the vertex arena holds them
// (before any placement or transform), into the pick's result for the CPU to
// weight by the barycentrics. Run once for each slab that holds meshes; the
// one holding the hit draw's mesh writes. The result's words are
// pickDomain.slang's (render/layout.ts `PICK_RESULT_WORDS`): the draw (0),
// the triangle (2), whether the positions follow (9), the positions (10 to 18).
struct PickTriangleParams {
  uint slab;
  uint3 pad;
};

[[vk::binding(8, 0)]] RWStructuredBuffer<uint> pickResult;
// Per batch, the slab of its mesh.
[[vk::binding(9, 0)]] StructuredBuffer<uint> pickBatchSlabs;
[[vk::binding(10, 0)]] ConstantBuffer<PickTriangleParams> pickTriangleParams;

[shader("compute")]
[numthreads(1, 1, 1)]
void pickTriangle() {
  uint draw = pickResult[0];
  uint number = pickResult[2];
  if (draw == NONE || number == NONE) {
    return;
  }
  DrawRecord r = drawRecord(draw);
  if (pickBatchSlabs[r.batch] != pickTriangleParams.slab) {
    return;
  }
  uint first = r.firstIndex + number * 3u;
  for (uint k = 0u; k < 3u; k++) {
    float3 p = position(r.positionOffset, indices[first + k]);
    pickResult[10u + k * 3u] = asuint(p.x);
    pickResult[11u + k * 3u] = asuint(p.y);
    pickResult[12u + k * 3u] = asuint(p.z);
  }
  pickResult[9] = 1u;
}