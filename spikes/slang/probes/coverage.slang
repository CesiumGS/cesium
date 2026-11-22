// The sample mask in and out (SV_Coverage), flat interpolation and
// instance_index, as the opaque pass's cutouts and point sets use them.
struct VsOut { float4 position : SV_Position; nointerpolation uint batch : BATCH; };
struct FsOut { float4 color : SV_Target; uint mask : SV_Coverage; };

[shader("vertex")]
VsOut vs(uint vid : SV_VertexID, uint iid : SV_InstanceID) {
  VsOut o;
  o.position = float4(float(vid & 1u), float(vid >> 1u), 0, 1);
  o.batch = iid;
  return o;
}

[shader("fragment")]
FsOut fs(VsOut i, uint inMask : SV_Coverage) {
  FsOut o;
  o.color = float4(1);
  o.mask = inMask & (i.batch | 1u);
  return o;
}
