// Per-view culling. Draw items are records without instances and the
// instances of instanced records. `cullRecords` runs once per record and
// `cullInstances` once per instance-table slot: each writes its item's
// camera-relative matrix, culls it and compacts visible items into their
// batch's slice of the item list. `writeDrawArgs` then runs once per batch
// and writes one indirect draw per batch, so the bundle issues one indirect
// call per batch rather than per item. Each batch's visible items are
// counted straight into its arguments' instance count (cleared before each
// view): no separate counts buffer, one storage binding fewer (the base
// tier's 8, CESIUM2_WEBGPU_PLAN.md §13.15).

import common;
import cullTables;

void append(uint batch, uint item) {
  uint slot = countInstance(argumentSlot(batch));
  itemList[batches[batch].itemBase + slot] = item;
}

DrawItem drawItem(float4x4 m, uint record, uint feature, uint instance, uint tint) {
  DrawItem item;
  item.relModel = m;
  item.record = record;
  item.feature = feature;
  item.instance = instance;
  item.tint = tint;
  return item;
}

[shader("compute")]
[numthreads(64, 1, 1)]
void cullRecords(uint3 gid : SV_DispatchThreadID) {
  uint i = gid.x;
  if (i >= params.recordCount) {
    return;
  }
  DrawRecord r = drawRecord(i);
  if (r.instanceCount != 0u) {
    return; // its instances are the items (`cullInstances`)
  }
  Transform t = transforms[r.transform];
  float4x4 m = relativeMatrix(t);
  items[i] = drawItem(m, i, 0u, 0u, WHITE);
  if (drawable(r, t) && inFrustum(m, r.center, r.radius * t.scale)) {
    append(r.batch, i);
  }
}

[shader("compute")]
[numthreads(64, 1, 1)]
void cullInstances(uint3 gid : SV_DispatchThreadID) {
  // Rows past 65,535 groups come as a second dimension.
  uint j = gid.x + gid.y * WorkgroupCount().x * 64u;
  if (j >= params.instanceCount) {
    return;
  }
  Instance inst = instanceTable[j];
  if (inst.record == NONE) {
    return;
  }
  DrawRecord r = drawRecord(inst.record);
  Transform t = transforms[r.transform];
  // The instance's rows are the rows of its affine matrix.
  float4x4 local = float4x4(inst.row0, inst.row1, inst.row2, float4(0, 0, 0, 1));
  float4x4 m = mul(relativeMatrix(t), local);
  uint feature = 0u;
  if (inst.feature != NONE && r.featureId != 0u) {
    feature = r.featureId + inst.feature;
  }
  uint item = params.firstInstanceItem + j;
  items[item] = drawItem(m, inst.record, feature, j - r.instanceFirst, inst.tint);
  // The largest axis scale: the length of the longest column.
  float scale = t.scale * max(
      length(float3(local[0][0], local[1][0], local[2][0])),
      max(length(float3(local[0][1], local[1][1], local[2][1])),
          length(float3(local[0][2], local[1][2], local[2][2]))));
  // A distance rule (layout.ts InstanceFlags): within or beyond the
  // distance in the high half, from this view's camera.
  bool shown = true;
  if ((inst.flags & 6u) != 0u) {
    float distance = f16tof32(inst.flags >> 16u);
    bool within = length(mul(m, float4(r.center, 1.0)).xyz) <= distance;
    shown = (inst.flags & 2u) != 0u ? within : !within;
  }
  if ((inst.flags & 1u) == 0u && shown && drawable(r, t) &&
      inFrustum(m, r.center, r.radius * scale)) {
    append(r.batch, item);
  }
}

[shader("compute")]
[numthreads(64, 1, 1)]
void writeDrawArgs(uint3 gid : SV_DispatchThreadID) {
  uint b = gid.x;
  if (b >= params.batchCount) {
    return;
  }
  Batch batch = batches[b];
  uint a = argumentSlot(b);
  storeIndexedArguments(a, batch.indexCount, batch.firstIndex);
}
