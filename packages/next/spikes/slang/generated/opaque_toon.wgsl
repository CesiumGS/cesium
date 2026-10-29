@binding(2) @group(1) var<storage, read> vertices_0 : array<f32>;

struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
};

struct DrawInstance_std430_0
{
    @align(16) relModel_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
};

@binding(1) @group(1) var<storage, read> instances_0 : array<DrawInstance_std430_0>;

struct _MatrixStorage_float4x4_ColMajorstd140_0
{
    @align(16) data_1 : array<vec4<f32>, i32(4)>,
};

struct View_std140_0
{
    @align(16) viewProj_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) viewRotation_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) cameraHi_0 : vec3<f32>,
    @align(4) nearPlane_0 : f32,
    @align(16) cameraLo_0 : vec3<f32>,
    @align(4) aspect_0 : f32,
    @align(16) planes_0 : array<vec4<f32>, i32(5)>,
    @align(16) sunDirection_0 : vec4<f32>,
    @align(16) viewport_0 : vec4<f32>,
};

@binding(0) @group(0) var<uniform> view_0 : View_std140_0;
struct DrawRecord_std430_0
{
    @align(16) originHi_0 : vec3<f32>,
    @align(4) radius_0 : f32,
    @align(16) originLo_0 : vec3<f32>,
    @align(4) flags_0 : u32,
    @align(16) model_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) color_0 : vec4<f32>,
    @align(16) indexCount_0 : u32,
    @align(4) firstIndex_0 : u32,
    @align(8) baseVertex_0 : i32,
    @align(4) featureId_0 : u32,
};

@binding(0) @group(1) var<storage, read> records_0 : array<DrawRecord_std430_0>;

struct VsOut_0
{
    @builtin(position) position_0 : vec4<f32>,
    @location(0) normal_0 : vec3<f32>,
    @interpolate(flat) @location(1) draw_0 : u32,
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex_0 : u32, @builtin(instance_index) drawIndex_0 : u32) -> VsOut_0
{
    var base_0 : u32 = vertexIndex_0 * u32(6);
    var normal_1 : vec3<f32> = vec3<f32>(vertices_0[base_0 + u32(3)], vertices_0[base_0 + u32(4)], vertices_0[base_0 + u32(5)]);
    var _S1 : DrawInstance_std430_0 = instances_0[drawIndex_0];
    var _S2 : mat4x4<f32> = mat4x4<f32>(_S1.relModel_0.data_0[i32(0)][i32(0)], _S1.relModel_0.data_0[i32(1)][i32(0)], _S1.relModel_0.data_0[i32(2)][i32(0)], _S1.relModel_0.data_0[i32(3)][i32(0)], _S1.relModel_0.data_0[i32(0)][i32(1)], _S1.relModel_0.data_0[i32(1)][i32(1)], _S1.relModel_0.data_0[i32(2)][i32(1)], _S1.relModel_0.data_0[i32(3)][i32(1)], _S1.relModel_0.data_0[i32(0)][i32(2)], _S1.relModel_0.data_0[i32(1)][i32(2)], _S1.relModel_0.data_0[i32(2)][i32(2)], _S1.relModel_0.data_0[i32(3)][i32(2)], _S1.relModel_0.data_0[i32(0)][i32(3)], _S1.relModel_0.data_0[i32(1)][i32(3)], _S1.relModel_0.data_0[i32(2)][i32(3)], _S1.relModel_0.data_0[i32(3)][i32(3)]);
    var output_0 : VsOut_0;
    output_0.position_0 = ((((((vec4<f32>(vec3<f32>(vertices_0[base_0], vertices_0[base_0 + u32(1)], vertices_0[base_0 + u32(2)]), 1.0f)) * (_S2)))) * (mat4x4<f32>(view_0.viewProj_0.data_1[i32(0)][i32(0)], view_0.viewProj_0.data_1[i32(1)][i32(0)], view_0.viewProj_0.data_1[i32(2)][i32(0)], view_0.viewProj_0.data_1[i32(3)][i32(0)], view_0.viewProj_0.data_1[i32(0)][i32(1)], view_0.viewProj_0.data_1[i32(1)][i32(1)], view_0.viewProj_0.data_1[i32(2)][i32(1)], view_0.viewProj_0.data_1[i32(3)][i32(1)], view_0.viewProj_0.data_1[i32(0)][i32(2)], view_0.viewProj_0.data_1[i32(1)][i32(2)], view_0.viewProj_0.data_1[i32(2)][i32(2)], view_0.viewProj_0.data_1[i32(3)][i32(2)], view_0.viewProj_0.data_1[i32(0)][i32(3)], view_0.viewProj_0.data_1[i32(1)][i32(3)], view_0.viewProj_0.data_1[i32(2)][i32(3)], view_0.viewProj_0.data_1[i32(3)][i32(3)]))));
    output_0.normal_0 = (((vec4<f32>(normal_1, 0.0f)) * (_S2))).xyz;
    output_0.draw_0 = drawIndex_0;
    return output_0;
}

struct FsOut_0
{
    @location(0) color_1 : vec4<f32>,
    @location(1) featureId_1 : vec2<u32>,
};

struct pixelInput_0
{
    @location(0) normal_2 : vec3<f32>,
    @interpolate(flat) @location(1) draw_1 : u32,
};

struct MaterialInput_0
{
     baseColor_0 : vec4<f32>,
     normal_3 : vec3<f32>,
     sunDirection_1 : vec3<f32>,
     flags_1 : u32,
};

fn ToonMaterial_shade_0( input_0 : MaterialInput_0) -> vec3<f32>
{
    return input_0.baseColor_0.xyz * vec3<f32>((0.15000000596046448f + 1.6000000238418579f * (floor(max(dot(input_0.normal_3, input_0.sunDirection_1), 0.0f) * 3.0f + 0.5f) / 3.0f)));
}

@fragment
fn fs( _S3 : pixelInput_0, @builtin(position) position_1 : vec4<f32>) -> FsOut_0
{
    var r_0 : DrawRecord_std430_0 = records_0[_S3.draw_1];
    var m_0 : MaterialInput_0;
    m_0.baseColor_0 = r_0.color_0;
    m_0.normal_3 = normalize(_S3.normal_2);
    m_0.sunDirection_1 = view_0.sunDirection_0.xyz;
    m_0.flags_1 = r_0.flags_0;
    var output_1 : FsOut_0;
    output_1.color_1 = vec4<f32>(ToonMaterial_shade_0(m_0), 1.0f);
    output_1.featureId_1 = vec2<u32>(((r_0.featureId_0) & (u32(65535))), ((r_0.featureId_0) >> (u32(16))));
    return output_1;
}

