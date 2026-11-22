// The primitive's index in the fragment stage (CAD edges): WGSL's
// `primitive_index`.
[shader("vertex")]
float4 vs(uint vid : SV_VertexID) : SV_Position { return float4(float(vid & 1u), float(vid >> 1u), 0, 1); }

[shader("fragment")]
float4 fs(uint primitive : SV_PrimitiveID) : SV_Target { return float4(float(primitive)); }
