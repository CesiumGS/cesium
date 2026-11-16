// Per-view culling. Draw items are records without instances and the
// instances of instanced records. `cullRecords` runs once per record and
// `cullInstances` once per instance-table slot: each writes its item's
// camera-relative matrix, culls it and compacts visible items into their
// batch's slice of the item list. `writeDrawArgs` then runs once per batch
// and writes one indirect draw per batch, so the bundle issues one indirect
// call per batch rather than per item. Each batch's visible items are
// counted straight into its arguments' instance count (cleared before each
// view): no separate counts buffer, one storage binding fewer (the base
// tier's 8, docs/design/gpu-limits-and-capacities.md).
//
// Two-phase occlusion culling (the `...Occluded` kernels, a view's own cull
// only; render/view/occlusionCull.ts): the first phase tests each item the
// frustum keeps, in a batch that may be culled (`Batch.flags` bit 0: opaque
// triangles only, never a translucent draw), against the depth pyramid the
// view's last tick left, seen from where that tick's camera was. An item it
// hides goes to the retest list instead of its batch. The view draws the
// first phase's depth, builds a pyramid of it, and `retestOccluded` tests the
// listed items against that: those now visible go to their batch's second
// set of arguments and slice, which the second-phase bundles draw in the same
// tick. What last tick's depth hid and this tick's doesn't is drawn this tick:
// nothing pops in. The pyramid's texels hold the farthest depth of what they
// cover, so the test only ever hides what is behind drawn opaque depth.

import common;
import cullTables;
import placement;
import hzbTest;

// Group 2 of the occlusion kernels (render/view/occlusionCull.ts writes it).
struct OcclusionCull {
  // The camera the last pyramid was built for, seen from this tick's render
  // space: its axes (xyz) and the offset along each of this tick's eye from
  // its eye (w). Camera space: x right, y up, z forward.
  float4 lastRight;
  float4 lastUp;
  float4 lastForward;
  float4 lastLens;   // its tanX, tanY, near, and the depth bias
  // This tick's camera (w: 0).
  float4 right;
  float4 up;
  float4 forward;
  float4 lens;
  uint width;        // the frame's, pixels
  uint height;
  uint levels;       // the pyramid's
  uint test;         // 1: the first phase tests the last pyramid; 0: none to test
  uint argumentRows; // the batch rows: the second set of arguments follows them
  uint itemRows;     // the items: the second slices follow, then the retest list
  uint counters;     // the counters' first word in `args`
  uint pad;
};

[[vk::binding(0, 2)]] ConstantBuffer<OcclusionCull> occlusion;
[[vk::binding(1, 2)]] Texture2D<float> pyramid;

// The counters, from `occlusion.counters` (OcclusionCullCounters in
// occlusionCull.ts): items the first phase listed for the retest and their
// triangles; items the second phase found visible and their triangles.
static const uint LISTED = 0u;
static const uint LISTED_TRIANGLES = 1u;
static const uint SHOWN_AGAIN = 2u;
static const uint SHOWN_AGAIN_TRIANGLES = 3u;

void append(uint batch, uint item) {
  uint slot = countInstance(argumentSlot(batch));
  itemList[batches[batch].itemBase + slot] = item;
}

DrawItem drawItem(float4x4 m, float3 drawn, uint record, uint feature, uint instance, uint tint) {
  DrawItem item;
  item.relModel = m;
  item.drawn = float4(drawn, 0.0);
  item.record = record;
  item.feature = feature;
  item.instance = instance;
  item.tint = tint;
  return item;
}

// A record's camera-relative matrix and its culling sphere's radius: the
// sphere the frustum test and the occlusion test both take.
float4x4 recordMatrix(DrawRecord r, Transform t, out float radius) {
  radius = r.radius * t.scale;
  return relativeMatrix(t);
}

// An instance's camera-relative matrix and its culling sphere's radius.
float4x4 instanceMatrix(Instance inst, DrawRecord r, Transform t, out float4x4 local, out float radius) {
  // The instance's rows are the rows of its affine matrix.
  local = float4x4(inst.row0, inst.row1, inst.row2, float4(0, 0, 0, 1));
  // The largest axis scale: the length of the longest column.
  float scale = t.scale * max(
      length(float3(local[0][0], local[1][0], local[2][0])),
      max(length(float3(local[0][1], local[1][1], local[2][1])),
          length(float3(local[0][2], local[1][2], local[2][2]))));
  radius = r.radius * scale;
  return mul(relativeMatrix(t), local);
}

// Whether a sphere (`center` camera-relative, in render space) is certainly
// hidden by the pyramid seen from a camera's axes (w: the offset of this
// tick's eye along each) and lens. A sphere with no bound (a radius past
// float32's reach, `routes.ts`) never is.
bool sphereHidden(float3 center, float radius, float4 right, float4 up, float4 forward, float4 lens) {
  if (!(radius < 1.0e30)) {
    return false;
  }
  PyramidCamera camera;
  camera.width = occlusion.width;
  camera.height = occlusion.height;
  camera.levels = occlusion.levels;
  camera.tanX = lens.x;
  camera.tanY = lens.y;
  camera.near = lens.z;
  camera.bias = lens.w;
  float3 c = float3(dot(right.xyz, center) + right.w,
                    dot(up.xyz, center) + up.w,
                    dot(forward.xyz, center) + forward.w);
  // The box around the sphere along the camera's axes, read through the
  // widest window: a draw's cull has the finest level's verdict.
  return boxHidden(pyramid, camera, c, float3(radius, 0.0, 0.0),
                   float3(0.0, radius, 0.0), float3(0.0, 0.0, radius),
                   MAX_WINDOW);
}

// Whether a batch's items may be culled by the pyramid (Batch.flags bit 0).
bool occludable(uint batch) {
  return (batches[batch].flags & 1u) != 0u;
}

uint trianglesOf(uint batch) {
  return batches[batch].indexCount / 3u;
}

// The first phase's verdict for an item the frustum keeps: its batch's
// arguments, or the retest list when the last pyramid hides it.
void place(uint batch, uint item, float3 center, float radius) {
  if (occlusion.test != 0u && occludable(batch) &&
      sphereHidden(center, radius, occlusion.lastRight, occlusion.lastUp,
                   occlusion.lastForward, occlusion.lastLens)) {
    uint k = addToCounter(occlusion.counters + LISTED, 1u);
    addToCounter(occlusion.counters + LISTED_TRIANGLES, trianglesOf(batch));
    itemList[2u * occlusion.itemRows + min(k, occlusion.itemRows - 1u)] = item;
    return;
  }
  append(batch, item);
}

[ForceInline]
void cullRecord(uint i, bool occluded) {
  if (i >= params.recordCount) {
    return;
  }
  DrawRecord r = drawRecord(i);
  if (r.instanceCount != 0u) {
    return; // its instances are the items (`cullInstances`)
  }
  Transform t = transforms[r.transform];
  float radius;
  float4x4 m = recordMatrix(r, t, radius);
  // A placed draw is drawn at its origin moved by the placement's order-0
  // displacement, summed exactly with the camera-relative offset; the
  // culling sphere (moved by it too, in model space) tests m.
  float3 drawn = float3(m[0][3], m[1][3], m[2][3]);
  if (r.placement != NO_PLACEMENT) {
    float3 offsetHi;
    float3 offsetLo;
    placementOffset(r.placement, offsetHi, offsetLo);
    drawn = drawnTranslation(t, offsetHi, offsetLo);
  }
  items[i] = drawItem(m, drawn, i, 0u, 0u, WHITE);
  if (drawable(r, t) && inFrustum(m, r.center, radius)) {
    if (occluded) {
      place(r.batch, i, mul(m, float4(r.center, 1.0)).xyz, radius);
    } else {
      append(r.batch, i);
    }
  }
}

[ForceInline]
void cullInstance(uint j, bool occluded) {
  if (j >= params.instanceCount) {
    return;
  }
  Instance inst = instanceTable[j];
  if (inst.record == NONE) {
    return;
  }
  DrawRecord r = drawRecord(inst.record);
  Transform t = transforms[r.transform];
  float4x4 local;
  float radius;
  float4x4 m = instanceMatrix(inst, r, t, local, radius);
  uint feature = 0u;
  if (inst.feature != NONE && r.featureId != 0u) {
    feature = r.featureId + inst.feature;
  }
  uint item = params.firstInstanceItem + j;
  items[item] = drawItem(m, float3(m[0][3], m[1][3], m[2][3]), inst.record, feature, j - r.instanceFirst, inst.tint);
  // A distance rule (layout.ts InstanceFlags): within or beyond the
  // distance in the high half, from this view's camera.
  bool shown = true;
  if ((inst.flags & 6u) != 0u) {
    float distance = f16tof32(inst.flags >> 16u);
    bool within = length(mul(m, float4(r.center, 1.0)).xyz) <= distance;
    shown = (inst.flags & 2u) != 0u ? within : !within;
  }
  if ((inst.flags & 1u) == 0u && shown && drawable(r, t) &&
      inFrustum(m, r.center, radius)) {
    if (occluded) {
      place(r.batch, item, mul(m, float4(r.center, 1.0)).xyz, radius);
    } else {
      append(r.batch, item);
    }
  }
}

[ForceInline]
void writeArgs(uint b, bool occluded) {
  if (b >= params.batchCount) {
    return;
  }
  Batch batch = batches[b];
  uint a = argumentSlot(b);
  storeIndexedArguments(a, batch.indexCount, batch.firstIndex);
  if (occluded) {
    storeIndexedArguments(retestArgumentSlot(b, occlusion.argumentRows),
                          batch.indexCount, batch.firstIndex);
  }
}

[shader("compute")]
[numthreads(64, 1, 1)]
void cullRecords(uint3 gid : SV_DispatchThreadID) {
  cullRecord(gid.x, false);
}

[shader("compute")]
[numthreads(64, 1, 1)]
void cullInstances(uint3 gid : SV_DispatchThreadID) {
  // Rows past 65,535 groups come as a second dimension.
  cullInstance(gid.x + gid.y * WorkgroupCount().x * 64u, false);
}

[shader("compute")]
[numthreads(64, 1, 1)]
void writeDrawArgs(uint3 gid : SV_DispatchThreadID) {
  writeArgs(gid.x, false);
}

[shader("compute")]
[numthreads(64, 1, 1)]
void cullRecordsOccluded(uint3 gid : SV_DispatchThreadID) {
  cullRecord(gid.x, true);
}

[shader("compute")]
[numthreads(64, 1, 1)]
void cullInstancesOccluded(uint3 gid : SV_DispatchThreadID) {
  cullInstance(gid.x + gid.y * WorkgroupCount().x * 64u, true);
}

[shader("compute")]
[numthreads(64, 1, 1)]
void writeDrawArgsOccluded(uint3 gid : SV_DispatchThreadID) {
  writeArgs(gid.x, true);
}

// The second phase: each listed item against this tick's pyramid (built from
// the first phase's depth), from this tick's camera. A visible one goes to
// its batch's second set of arguments and its second slice of the list.
[shader("compute")]
[numthreads(64, 1, 1)]
void retestOccluded(uint3 gid : SV_DispatchThreadID) {
  uint k = gid.x + gid.y * WorkgroupCount().x * 64u;
  if (k >= min(counted(occlusion.counters + LISTED), occlusion.itemRows)) {
    return;
  }
  uint item = itemList[2u * occlusion.itemRows + k];
  float radius;
  float4x4 m;
  DrawRecord r;
  if (item < params.firstInstanceItem) {
    r = drawRecord(item);
    m = recordMatrix(r, transforms[r.transform], radius);
  } else {
    Instance inst = instanceTable[min(item - params.firstInstanceItem, params.instanceCount - 1u)];
    r = drawRecord(inst.record);
    float4x4 local;
    m = instanceMatrix(inst, r, transforms[r.transform], local, radius);
  }
  uint batch = r.batch;
  if (sphereHidden(mul(m, float4(r.center, 1.0)).xyz, radius, occlusion.right,
                   occlusion.up, occlusion.forward, occlusion.lens)) {
    return;
  }
  addToCounter(occlusion.counters + SHOWN_AGAIN, 1u);
  addToCounter(occlusion.counters + SHOWN_AGAIN_TRIANGLES, trianglesOf(batch));
  uint slot = countInstance(retestArgumentSlot(batch, occlusion.argumentRows));
  itemList[occlusion.itemRows + batches[batch].itemBase + slot] = item;
}
