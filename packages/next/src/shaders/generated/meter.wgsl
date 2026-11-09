// Generated from src/shaders/meter.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct MeterParams_std140_0
{
    @align(16) exposure_0 : f32,
    @align(4) width_0 : u32,
    @align(8) height_0 : u32,
    @align(4) layers_0 : u32,
};

@binding(1) @group(0) var<uniform> params_0 : MeterParams_std140_0;
@binding(0) @group(0) var image_0 : texture_2d<f32>;

@binding(3) @group(0) var layersLit_0 : texture_2d<f32>;

@binding(5) @group(0) var layersAbsorbance_0 : texture_2d<f32>;

@binding(4) @group(0) var layersUnlit_0 : texture_2d<f32>;

@binding(2) @group(0) var<storage, read_write> result_0 : array<vec4<f32>>;

var<workgroup> photopic_0 : array<atomic<u32>, i32(144)>;

var<workgroup> scotopic_0 : array<atomic<u32>, i32(144)>;

var<workgroup> peak_0 : vec2<f32>;

struct Layers_0
{
     light_0 : vec3<f32>,
     through_0 : f32,
};

fn layersAt_0( p_0 : vec3<i32>) -> Layers_0
{
    var none_0 : Layers_0;
    var _S1 : vec3<f32> = vec3<f32>(0.0f);
    none_0.light_0 = _S1;
    none_0.through_0 = 1.0f;
    if((params_0.layers_0) == u32(0))
    {
        return none_0;
    }
    var lit_0 : vec4<f32> = (textureLoad((layersLit_0), ((p_0)).xy, ((p_0)).z));
    var _S2 : f32 = lit_0.w;
    var toScreen_0 : f32;
    var hidden_0 : f32;
    if((params_0.layers_0) == u32(2))
    {
        var b0_0 : f32 = (textureLoad((layersAbsorbance_0), ((p_0)).xy, ((p_0)).z)).x;
        var _S3 : bool;
        if((b0_0 < 0.0010005002841353416f))
        {
            _S3 = true;
        }
        else
        {
            _S3 = !(_S2 > 0.0f);
        }
        if(_S3)
        {
            return none_0;
        }
        var hidden_1 : f32 = 1.0f - exp(- b0_0);
        toScreen_0 = hidden_1 / _S2;
        hidden_0 = hidden_1;
    }
    else
    {
        toScreen_0 = 1.0f;
        hidden_0 = _S2;
    }
    var shown_0 : vec3<f32> = max(lit_0.xyz, _S1) * vec3<f32>(toScreen_0);
    var all_0 : f32 = dot(shown_0, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f));
    var scene_0 : f32 = (textureLoad((layersUnlit_0), ((p_0)).xy, ((p_0)).z)).w * toScreen_0;
    var layers_1 : Layers_0;
    var _S4 : vec3<f32>;
    if((all_0 > 0.0f))
    {
        _S4 = shown_0 * vec3<f32>(min(scene_0 / all_0, 1.0f));
    }
    else
    {
        _S4 = _S1;
    }
    layers_1.light_0 = _S4;
    layers_1.through_0 = 1.0f - hidden_0;
    return layers_1;
}

fn binOf_0( luminance_0 : f32) -> u32
{
    return u32(clamp((log2(max(luminance_0, 1.00000001168609742e-07f)) - -24.0f) / 0.3333333432674408f, 0.0f, 143.0f));
}

var<workgroup> below_0 : array<vec2<u32>, i32(256)>;

var<workgroup> shares_0 : array<vec4<f32>, i32(256)>;

fn share_0( b_0 : u32,  count_0 : f32,  under_0 : f32,  total_0 : f32) -> vec2<f32>
{
    var _S5 : f32 = max(min(under_0 + count_0, total_0 * 0.98000001907348633f) - max(under_0, total_0 * 0.64999997615814209f), 0.0f);
    return vec2<f32>((-24.0f + (f32(b_0) + 0.5f) * 0.3333333432674408f) * _S5, _S5);
}

@compute
@workgroup_size(16, 16, 1)
fn main(@builtin(local_invocation_index) index_0 : u32, @builtin(local_invocation_id) local_0 : vec3<u32>)
{
    var gx_0 : u32;
    var _S6 : bool;
    var b_1 : u32 = index_0;
    loop
    {
        if((b_1 < u32(144)))
        {
        }
        else
        {
            break;
        }
        atomicStore(&(photopic_0[b_1]), u32(0));
        atomicStore(&(scotopic_0[b_1]), u32(0));
        b_1 = b_1 + u32(256);
    }
    var _S7 : bool = index_0 == u32(0);
    if(_S7)
    {
        peak_0 = vec2<f32>(-24.0f);
    }
    workgroupBarrier();
    var gy_0 : u32 = local_0.y;
    loop
    {
        if((gy_0 < u32(64)))
        {
        }
        else
        {
            break;
        }
        gx_0 = local_0.x;
        loop
        {
            if((gx_0 < u32(64)))
            {
            }
            else
            {
                break;
            }
            var unit_0 : vec2<f32> = (vec2<f32>(f32(gx_0), f32(gy_0)) + vec2<f32>(0.5f)) / vec2<f32>(64.0f);
            var at_0 : vec3<i32> = vec3<i32>(vec2<i32>(vec2<u32>(min(u32(unit_0.x * f32(params_0.width_0)), params_0.width_0 - u32(1)), min(u32(unit_0.y * f32(params_0.height_0)), params_0.height_0 - u32(1)))), i32(0));
            var color_0 : vec4<f32> = (textureLoad((image_0), ((at_0)).xy, ((at_0)).z));
            var layers_2 : Layers_0 = layersAt_0(at_0);
            var _S8 : vec3<f32> = vec3<f32>(0.0f);
            var _S9 : f32 = color_0.w;
            var opaque_0 : vec3<f32> = max(color_0.xyz, _S8) * vec3<f32>(min(_S9, 1.0f));
            if((_S9 > 0.0f))
            {
                _S6 = ((layers_2.through_0) > 0.0f);
            }
            else
            {
                _S6 = false;
            }
            var _S10 : bool;
            if(_S6)
            {
                _S10 = true;
            }
            else
            {
                _S10 = (any((((layers_2.light_0) > _S8))));
            }
            if(_S10)
            {
                var light_1 : vec3<f32> = (layers_2.light_0 + opaque_0 * vec3<f32>(layers_2.through_0)) / vec3<f32>(params_0.exposure_0);
                var y_0 : f32 = dot(light_1, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f));
                var _S11 : f32 = max(y_0 * (1.3300000429153442f * (1.0f + (y_0 + dot(light_1, vec3<f32>(0.019300000742077827f, 0.11919999867677689f, 0.9505000114440918f))) / max(dot(light_1, vec3<f32>(0.4124000072479248f, 0.35760000348091125f, 0.18050000071525574f)), 9.999999960041972e-13f)) - 1.6799999475479126f), 0.0f);
                var d_0 : vec2<f32> = unit_0 * vec2<f32>(2.0f) - vec2<f32>(1.0f);
                var weight_0 : u32 = u32(1) + u32(3.0f * exp(- dot(d_0, d_0) / 0.24499998986721039f) + 0.5f);
                var _S12 : u32 = atomicAdd(&(photopic_0[binOf_0(y_0)]), weight_0);
                var _S13 : u32 = atomicAdd(&(scotopic_0[binOf_0(_S11)]), weight_0);
            }
            gx_0 = gx_0 + u32(16);
        }
        gy_0 = gy_0 + u32(16);
    }
    workgroupBarrier();
    var _S14 : bool = (index_0 < u32(144));
    var counts_0 : vec2<u32>;
    if(_S14)
    {
        var _S15 : u32 = atomicLoad(&(photopic_0[index_0]));
        var _S16 : u32 = atomicLoad(&(scotopic_0[index_0]));
        counts_0 = vec2<u32>(_S15, _S16);
    }
    else
    {
        counts_0 = vec2<u32>(u32(0));
    }
    below_0[index_0] = counts_0;
    workgroupBarrier();
    gx_0 = u32(1);
    loop
    {
        if((gx_0 < u32(256)))
        {
        }
        else
        {
            break;
        }
        var add_0 : vec2<u32>;
        if((index_0 >= gx_0))
        {
            add_0 = below_0[index_0 - gx_0];
        }
        else
        {
            add_0 = vec2<u32>(u32(0));
        }
        workgroupBarrier();
        below_0[index_0] = below_0[index_0] + add_0;
        workgroupBarrier();
        gx_0 = gx_0 * u32(2);
    }
    var _S17 : vec2<f32> = vec2<f32>(below_0[u32(255)]);
    var _S18 : vec2<f32> = vec2<f32>(below_0[index_0] - counts_0);
    if(_S14)
    {
        var center_0 : f32 = -24.0f + (f32(index_0) + 0.5f) * 0.3333333432674408f;
        var rank_0 : vec2<f32> = _S17 * vec2<f32>(0.98000001907348633f);
        var _S19 : f32 = _S18.x;
        var _S20 : f32 = rank_0.x;
        if((_S19 <= _S20))
        {
            _S6 = (_S20 < (_S19 + f32(counts_0.x)));
        }
        else
        {
            _S6 = false;
        }
        if(_S6)
        {
            peak_0[i32(0)] = center_0;
        }
        var _S21 : f32 = _S18.y;
        var _S22 : f32 = rank_0.y;
        if((_S21 <= _S22))
        {
            _S6 = (_S22 < (_S21 + f32(counts_0.y)));
        }
        else
        {
            _S6 = false;
        }
        if(_S6)
        {
            peak_0[i32(1)] = center_0;
        }
    }
    var _S23 : vec4<f32>;
    if(_S14)
    {
        _S23 = vec4<f32>(share_0(index_0, f32(counts_0.x), _S18.x, _S17.x), share_0(index_0, f32(counts_0.y), _S18.y, _S17.y));
    }
    else
    {
        _S23 = vec4<f32>(0.0f);
    }
    shares_0[index_0] = _S23;
    workgroupBarrier();
    var stride_0 : u32 = u32(128);
    loop
    {
        if((stride_0 > u32(0)))
        {
        }
        else
        {
            break;
        }
        if((index_0 < stride_0))
        {
            shares_0[index_0] = shares_0[index_0] + shares_0[index_0 + stride_0];
        }
        workgroupBarrier();
        stride_0 = stride_0 / u32(2);
    }
    if(_S7)
    {
        var _S24 : f32 = shares_0[i32(0)].y;
        var _S25 : f32 = shares_0[i32(0)].w;
        var floorSums_0 : vec2<f32> = (peak_0 - vec2<f32>(4.0f)) * vec2<f32>(_S24, _S25);
        result_0[i32(0)] = vec4<f32>(max(shares_0[i32(0)].x, floorSums_0.x), _S24, max(shares_0[i32(0)].z, floorSums_0.y), _S25);
    }
    return;
}

