// The runtime boundary, declared in source: what code composed at run
// time (custom shaders, styles) refers to keeps its name in the WGSL, by
// `__extern_cpp` (value structs, their fields, helpers, a binding), with no
// rewriting of the output. Two structs share field names (the contract's
// VertexInput and VertexOutput both have positionMC: Slang issue #14028
// says such fields may merge). The engine calls a function the runtime
// code defines (the user's fragmentMain) by its literal name.
__extern_cpp struct VertexInput {
  __extern_cpp float3 positionMC;
  __extern_cpp float3 normalMC;
};
__extern_cpp struct VertexOutput {
  __extern_cpp float3 normalMC;
  __extern_cpp float3 positionMC;
};
__extern_cpp struct MaterialOutput {
  __extern_cpp float3 baseColor;
  __extern_cpp float alpha;
};
struct Tint { float4 color; };
[[vk::binding(0, 0)]] __extern_cpp ConstantBuffer<Tint> tint;

// A helper runtime code calls.
export __extern_cpp float3 materialTint(float3 c) { return c * tint.color.rgb; }

// Defined by the runtime code; called by name.
__target_intrinsic(wgsl, "userFragment($0)")
float3 userFragment(float3 color);

[shader("vertex")]
float4 vs(uint vid : SV_VertexID) : SV_Position {
  VertexInput i;
  i.positionMC = float3(float(vid & 1u), float(vid >> 1u), 0);
  i.normalMC = float3(0, 0, 1);
  VertexOutput o;
  o.normalMC = i.normalMC;
  o.positionMC = i.positionMC;
  return float4(o.positionMC + o.normalMC * 0.0, 1);
}

[shader("fragment")]
float4 fs(float4 p : SV_Position) : SV_Target {
  MaterialOutput m;
  m.baseColor = materialTint(float3(0.5));
  m.alpha = 1;
  return float4(userFragment(m.baseColor), m.alpha);
}
