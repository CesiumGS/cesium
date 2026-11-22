// A 3D rgba16float storage texture, written (the aerial perspective
// volume). RWTexture3D is read-write, which WGSL allows only for some
// formats; WTexture3D is write-only.
[[vk::binding(0, 0)]] [format("rgba16f")] WTexture3D<float4> volume;

[shader("compute")]
[numthreads(4, 4, 4)]
void main(uint3 id : SV_DispatchThreadID) { volume.Store(id, float4(1, 0.5, 0.25, 1)); }
