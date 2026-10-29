struct PrepParams_std140_0
{
    @align(16) count_0 : u32,
    @align(4) writeFirstInstance_0 : u32,
    @align(8) pad0_0 : u32,
    @align(4) pad1_0 : u32,
};

@binding(3) @group(1) var<uniform> params_0 : PrepParams_std140_0;
struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
};

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
struct DrawInstance_std430_0
{
    @align(16) relModel_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
};

@binding(1) @group(1) var<storage, read_write> instances_0 : array<DrawInstance_std430_0>;

@binding(2) @group(1) var<storage, read_write> args_0 : array<u32>;

@compute
@workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var i_0 : u32 = gid_0.x;
    if((i_0 >= (params_0.count_0)))
    {
        return;
    }
    var r_0 : DrawRecord_std430_0 = records_0[i_0];
    var rel_0 : vec3<f32> = r_0.originHi_0 - view_0.cameraHi_0 + (r_0.originLo_0 - view_0.cameraLo_0);
    var visible_0 : bool;
    if((((r_0.flags_0) & (u32(1)))) == u32(0))
    {
        visible_0 = ((r_0.indexCount_0) > u32(0));
    }
    else
    {
        visible_0 = false;
    }
    var p_0 : u32 = u32(0);
    loop
    {
        if((p_0 < u32(5)))
        {
        }
        else
        {
            break;
        }
        if(((dot(view_0.planes_0[p_0].xyz, rel_0) + view_0.planes_0[p_0].w) < (- r_0.radius_0)))
        {
            visible_0 = false;
        }
        p_0 = p_0 + u32(1);
    }
    var m_0 : mat4x4<f32> = mat4x4<f32>(r_0.model_0.data_0[i32(0)][i32(0)], r_0.model_0.data_0[i32(1)][i32(0)], r_0.model_0.data_0[i32(2)][i32(0)], r_0.model_0.data_0[i32(3)][i32(0)], r_0.model_0.data_0[i32(0)][i32(1)], r_0.model_0.data_0[i32(1)][i32(1)], r_0.model_0.data_0[i32(2)][i32(1)], r_0.model_0.data_0[i32(3)][i32(1)], r_0.model_0.data_0[i32(0)][i32(2)], r_0.model_0.data_0[i32(1)][i32(2)], r_0.model_0.data_0[i32(2)][i32(2)], r_0.model_0.data_0[i32(3)][i32(2)], r_0.model_0.data_0[i32(0)][i32(3)], r_0.model_0.data_0[i32(1)][i32(3)], r_0.model_0.data_0[i32(2)][i32(3)], r_0.model_0.data_0[i32(3)][i32(3)]);
    m_0[i32(0)][i32(3)] = m_0[i32(0)][i32(3)] + rel_0.x;
    m_0[i32(1)][i32(3)] = m_0[i32(1)][i32(3)] + rel_0.y;
    m_0[i32(2)][i32(3)] = m_0[i32(2)][i32(3)] + rel_0.z;
    var _S1 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(m_0[i32(0)][i32(0)], m_0[i32(1)][i32(0)], m_0[i32(2)][i32(0)], m_0[i32(3)][i32(0)]), vec4<f32>(m_0[i32(0)][i32(1)], m_0[i32(1)][i32(1)], m_0[i32(2)][i32(1)], m_0[i32(3)][i32(1)]), vec4<f32>(m_0[i32(0)][i32(2)], m_0[i32(1)][i32(2)], m_0[i32(2)][i32(2)], m_0[i32(3)][i32(2)]), vec4<f32>(m_0[i32(0)][i32(3)], m_0[i32(1)][i32(3)], m_0[i32(2)][i32(3)], m_0[i32(3)][i32(3)]) );
    instances_0[i_0].relModel_0.data_0 = _S1;
    var a_0 : u32 = i_0 * u32(5);
    args_0[a_0] = r_0.indexCount_0;
    if(visible_0)
    {
        p_0 = u32(1);
    }
    else
    {
        p_0 = u32(0);
    }
    args_0[a_0 + u32(1)] = p_0;
    args_0[a_0 + u32(2)] = r_0.firstIndex_0;
    args_0[a_0 + u32(3)] = (bitcast<u32>((r_0.baseVertex_0)));
    if((params_0.writeFirstInstance_0) == u32(1))
    {
        p_0 = i_0;
    }
    else
    {
        p_0 = u32(0);
    }
    args_0[a_0 + u32(4)] = p_0;
    return;
}

