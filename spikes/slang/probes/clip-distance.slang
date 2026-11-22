// Clip distances (WGSL's `clip_distances`), for clipping planes in the
// vertex stage.
struct VsOut { float4 position : SV_Position; float clip : SV_ClipDistance0; };

[shader("vertex")]
VsOut vs(uint vid : SV_VertexID) { VsOut o; o.position = float4(0, 0, 0, 1); o.clip = 1.0; return o; }

[shader("fragment")]
float4 fs() : SV_Target { return float4(1); }
