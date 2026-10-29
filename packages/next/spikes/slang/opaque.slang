// Slang port of src/shaders/opaque.wgsl. The material is bound at link time.
module opaque;
import common;
import material;

extern struct Material : IMaterial;

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(0, 1)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(1, 1)]] StructuredBuffer<DrawInstance> instances;
[[vk::binding(2, 1)]] StructuredBuffer<float> vertices;

struct VsOut {
  float4 position : SV_Position;
  float3 normal : NORMAL;
  nointerpolation uint draw : DRAW;
};

[shader("vertex")]
VsOut vs(uint vertexIndex : SV_VertexID, uint drawIndex : SV_InstanceID) {
  uint base = vertexIndex * 6;
  float3 position = float3(vertices[base], vertices[base + 1], vertices[base + 2]);
  float3 normal = float3(vertices[base + 3], vertices[base + 4], vertices[base + 5]);
  float4x4 m = instances[drawIndex].relModel;
  VsOut output;
  output.position = mul(view.viewProj, mul(m, float4(position, 1.0)));
  output.normal = mul(m, float4(normal, 0.0)).xyz;
  output.draw = drawIndex;
  return output;
}

struct FsOut {
  float4 color : SV_Target0;
  uint2 featureId : SV_Target1;
};

[shader("fragment")]
FsOut fs(VsOut input) {
  DrawRecord r = records[input.draw];
  MaterialInput m;
  m.baseColor = r.color;
  m.normal = normalize(input.normal);
  m.sunDirection = view.sunDirection.xyz;
  m.flags = r.flags;
  Material material;
  FsOut output;
  output.color = float4(material.shade(m), 1.0);
  output.featureId = uint2(r.featureId & 0xffffu, r.featureId >> 16u);
  return output;
}
