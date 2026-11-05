// Per-view culling. Draw items are records without instances and
// the instances of instanced records. `cullRecords` runs once per record
// and `cullInstances` once per instance-table slot: each writes its item's
// camera-relative matrix, culls it and compacts visible items into their
// batch's slice of the item list. `writeDrawArgs` then runs once per batch and
// writes one indirect draw per batch, so the bundle issues one indirect call
// per batch rather than per item. Each batch's visible items are counted
// straight into its arguments' instance count (cleared before each view):
// no separate counts buffer, one storage binding fewer (the base tier's 8,
// CESIUM2_WEBGPU_PLAN.md §13.15).

struct CullParams {
  recordCount: u32,
  batchCount: u32,
  instanceCount: u32,  // instance-table slots in use (high-water mark)
  firstInstanceItem: u32, // item index of instance slot 0 (= max records)
};

struct Batch {
  itemBase: u32,   // first slot of this batch in `itemList`
  indexCount: u32,
  firstIndex: u32,
  _pad: u32,
};

@group(0) @binding(0) var<uniform> view: View;
@group(1) @binding(0) var<storage, read> records: array<DrawRecord>;
@group(1) @binding(1) var<storage, read> transforms: array<Transform>;
@group(1) @binding(2) var<storage, read> instanceTable: array<Instance>;
@group(1) @binding(3) var<storage, read_write> items: array<DrawItem>;
@group(1) @binding(4) var<storage, read_write> itemList: array<u32>;
@group(1) @binding(6) var<storage, read> batches: array<Batch>;
// Five words a batch (drawIndexedIndirect): index count, instance count
// (the visible items, counted by `append`), first index, base vertex,
// first instance.
@group(1) @binding(7) var<storage, read_write> args: array<atomic<u32>>;
@group(1) @binding(8) var<uniform> params: CullParams;

const NONE: u32 = 0xffffffffu;
const WHITE: u32 = 0xffffffffu;

// The transform as a camera-relative matrix. This is the only place large
// world coordinates meet the camera: the hi and lo differences each cancel
// exactly before they are combined, so the result keeps float32 precision
// relative to the (small) camera distance.
fn relativeMatrix(t: Transform) -> mat4x4f {
  let rel = hiLoDifference(t.originHi, t.originLo, view.cameraHi, view.cameraLo);
  return mat4x4f(
    vec4f(t.linear[0], 0.0),
    vec4f(t.linear[1], 0.0),
    vec4f(t.linear[2], 0.0),
    vec4f(rel, 1.0),
  );
}

// Hidden, empty, or not selected for this view (multi-view tile selection
// shares one draw table and picks LOD per view through the mask).
fn drawable(r: DrawRecord, t: Transform) -> bool {
  // A height capture's view (View.time.y 1) culls what isn't ground
  // (RecordFlags.notGround).
  return (r.flags & 1u) == 0u && (t.flags & 1u) == 0u && r.indexCount != 0u &&
    (r.viewMask & view.viewBit) != 0u &&
    !(view.time.y > 0.5 && (r.flags & 32u) != 0u);
}

fn inFrustum(m: mat4x4f, center: vec3f, radius: f32) -> bool {
  let c = (m * vec4f(center, 1.0)).xyz;
  for (var p = 0u; p < 5u; p++) {
    let plane = view.planes[p];
    if (dot(plane.xyz, c) + plane.w < -radius) {
      return false;
    }
  }
  return true;
}

fn append(batch: u32, item: u32) {
  let slot = atomicAdd(&args[batch * 5u + 1u], 1u);
  itemList[batches[batch].itemBase + slot] = item;
}

@compute @workgroup_size(64)
fn cullRecords(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= params.recordCount) {
    return;
  }
  let r = records[i];
  if (r.instanceCount != 0u) {
    return; // its instances are the items (`cullInstances`)
  }
  let t = transforms[r.transform];
  let m = relativeMatrix(t);
  items[i] = DrawItem(m, i, 0u, 0u, WHITE);
  if (drawable(r, t) && inFrustum(m, r.center, r.radius * t.scale)) {
    append(r.batch, i);
  }
}

@compute @workgroup_size(64)
fn cullInstances(
  @builtin(global_invocation_id) gid: vec3u,
  @builtin(num_workgroups) groups: vec3u,
) {
  // Rows past 65,535 groups come as a second dimension.
  let j = gid.x + gid.y * groups.x * 64u;
  if (j >= params.instanceCount) {
    return;
  }
  let inst = instanceTable[j];
  if (inst.record == NONE) {
    return;
  }
  let r = records[inst.record];
  let t = transforms[r.transform];
  let local = mat4x4f(
    vec4f(inst.row0.x, inst.row1.x, inst.row2.x, 0.0),
    vec4f(inst.row0.y, inst.row1.y, inst.row2.y, 0.0),
    vec4f(inst.row0.z, inst.row1.z, inst.row2.z, 0.0),
    vec4f(inst.row0.w, inst.row1.w, inst.row2.w, 1.0),
  );
  let m = relativeMatrix(t) * local;
  var feature = 0u;
  if (inst.feature != NONE && r.featureId != 0u) {
    feature = r.featureId + inst.feature;
  }
  let item = params.firstInstanceItem + j;
  items[item] = DrawItem(m, inst.record, feature, j - r.instanceFirst, inst.tint);
  let scale = t.scale * max(
    length(local[0].xyz),
    max(length(local[1].xyz), length(local[2].xyz)),
  );
  // A distance rule (layout.ts InstanceFlags): within or beyond the
  // distance in the high half, from this view's camera.
  var shown = true;
  if ((inst.flags & 6u) != 0u) {
    let distance = unpack2x16float(inst.flags).y;
    let within = length((m * vec4f(r.center, 1.0)).xyz) <= distance;
    shown = select(!within, within, (inst.flags & 2u) != 0u);
  }
  if ((inst.flags & 1u) == 0u && shown && drawable(r, t) &&
      inFrustum(m, r.center, r.radius * scale)) {
    append(r.batch, item);
  }
}

@compute @workgroup_size(64)
fn writeDrawArgs(@builtin(global_invocation_id) gid: vec3u) {
  let b = gid.x;
  if (b >= params.batchCount) {
    return;
  }
  let batch = batches[b];
  let a = b * 5u;
  atomicStore(&args[a], batch.indexCount);
  // args[a + 1]: the instance count `append` counted.
  atomicStore(&args[a + 2u], batch.firstIndex);
  atomicStore(&args[a + 3u], 0u);
  // The item index comes from `itemList` bound as an instance-step
  // vertex buffer at the batch's offset, so firstInstance stays 0 and the
  // `indirect-first-instance` feature is not needed.
  atomicStore(&args[a + 4u], 0u);
}
