// Per-view draw preparation. `main` runs once per draw record: camera-relative
// transform, culling, and compaction of visible records into their batch's
// instance list. `writeArgs` then runs once per batch and writes one indirect
// draw per batch, so the bundle issues one indirect call per batch rather
// than per record. `batchCounts` is cleared before each view.

struct PrepParams {
  recordCount: u32,
  batchCount: u32,
  _pad0: u32,
  _pad1: u32,
};

struct Batch {
  instanceBase: u32,   // first slot of this batch in `instanceList`
  indexCount: u32,
  firstIndex: u32,
  _pad: u32,
};

@group(0) @binding(0) var<uniform> view: View;
@group(1) @binding(0) var<storage, read> records: array<DrawRecord>;
@group(1) @binding(1) var<storage, read_write> instances: array<DrawInstance>;
@group(1) @binding(2) var<storage, read_write> instanceList: array<u32>;
@group(1) @binding(3) var<storage, read_write> batchCounts: array<atomic<u32>>;
@group(1) @binding(4) var<storage, read> batches: array<Batch>;
@group(1) @binding(5) var<storage, read_write> args: array<u32>;
@group(1) @binding(6) var<uniform> params: PrepParams;

// WGS84 radii, inverted: camera and occludee in ellipsoid-scaled space.
const INV_RADII = vec3f(1.0 / 6378137.0, 1.0 / 6378137.0, 1.0 / 6356752.314245179);

// 1.x EllipsoidalOccluder.isScaledSpacePointVisible: whether a point (the
// tile's horizon-occlusion point) can be seen past the ellipsoid's limb.
fn horizonVisible(occludee: vec3f) -> bool {
  let cv = (view.cameraHi + view.cameraLo) * INV_RADII;
  let vhMagnitudeSquared = dot(cv, cv) - 1.0;
  let vt = occludee - cv;
  let vtDotVc = -dot(vt, cv);
  let occluded = select(
    vtDotVc > vhMagnitudeSquared &&
      (vtDotVc * vtDotVc) / dot(vt, vt) > vhMagnitudeSquared,
    vtDotVc > 0.0,
    vhMagnitudeSquared < 0.0,
  );
  return !occluded;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= params.recordCount) {
    return;
  }
  let r = records[i];

  // The only place large world coordinates meet the camera. The hi and lo
  // differences each cancel exactly before they are combined, so the result
  // keeps float32 precision relative to the (small) camera distance.
  let rel = (r.originHi - view.cameraHi) + (r.originLo - view.cameraLo);

  var m = r.model;
  m[3] = vec4f(m[3].xyz + rel, 1.0);
  instances[i].relModel = m;

  // Hidden, empty, or not selected for this view (multi-view tile selection
  // shares one draw table and picks LOD per view through the mask).
  if ((r.flags & 1u) != 0u || r.indexCount == 0u || (r.viewMask & view.viewBit) == 0u) {
    return;
  }
  // Globe tiles behind the ellipsoid's horizon.
  if ((r.flags & 4u) != 0u && !horizonVisible(r.horizonPoint)) {
    return;
  }
  let center = rel + r.center;
  for (var p = 0u; p < 5u; p++) {
    let plane = view.planes[p];
    if (dot(plane.xyz, center) + plane.w < -r.radius) {
      return;
    }
  }
  let slot = atomicAdd(&batchCounts[r.batch], 1u);
  instanceList[batches[r.batch].instanceBase + slot] = i;
}

@compute @workgroup_size(64)
fn writeArgs(@builtin(global_invocation_id) gid: vec3u) {
  let b = gid.x;
  if (b >= params.batchCount) {
    return;
  }
  let batch = batches[b];
  let a = b * 5u;
  args[a] = batch.indexCount;
  args[a + 1u] = atomicLoad(&batchCounts[b]);
  args[a + 2u] = batch.firstIndex;
  args[a + 3u] = 0u;
  // The draw index comes from `instanceList` bound as an instance-step vertex
  // buffer at the batch's offset, so firstInstance stays 0 and the
  // `indirect-first-instance` feature is not needed.
  args[a + 4u] = 0u;
}
