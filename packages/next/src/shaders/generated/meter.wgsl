// Generated from src/shaders/meter.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct MeterParams_std140_0
{
    @align(16) exposure_0 : f32,
    @align(4) width_0 : u32,
    @align(8) height_0 : u32,
    @align(4) pad_0 : u32,
};

@binding(1) @group(0) var<uniform> params_0 : MeterParams_std140_0;
@binding(0) @group(0) var image_0 : texture_2d<f32>;

@binding(2) @group(0) var<storage, read_write> result_0 : array<vec4<f32>>;

var<workgroup> photopic_0 : array<atomic<u32>, i32(144)>;

var<workgroup> scotopic_0 : array<atomic<u32>, i32(144)>;

var<workgroup> peak_0 : vec2<f32>;

fn binOf_0( luminance_0 : f32) -> u32
{
    return u32(clamp((log2(max(luminance_0, 1.00000001168609742e-07f)) - -24.0f) / 0.3333333432674408f, 0.0f, 143.0f));
}

var<workgroup> below_0 : array<vec2<u32>, i32(256)>;

var<workgroup> shares_0 : array<vec4<f32>, i32(256)>;

fn share_0( b_0 : u32,  count_0 : f32,  under_0 : f32,  total_0 : f32) -> vec2<f32>
{
    var _S1 : f32 = max(min(under_0 + count_0, total_0 * 0.98000001907348633f) - max(under_0, total_0 * 0.64999997615814209f), 0.0f);
    return vec2<f32>((-24.0f + (f32(b_0) + 0.5f) * 0.3333333432674408f) * _S1, _S1);
}

@compute
@workgroup_size(16, 16, 1)
fn main(@builtin(local_invocation_index) index_0 : u32, @builtin(local_invocation_id) local_0 : vec3<u32>)
{
    var gx_0 : u32;
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
    var _S2 : bool = index_0 == u32(0);
    if(_S2)
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
            var _S3 : vec3<i32> = vec3<i32>(vec2<i32>(vec2<u32>(min(u32(unit_0.x * f32(params_0.width_0)), params_0.width_0 - u32(1)), min(u32(unit_0.y * f32(params_0.height_0)), params_0.height_0 - u32(1)))), i32(0));
            var color_0 : vec4<f32> = (textureLoad((image_0), ((_S3)).xy, ((_S3)).z));
            var _S4 : f32 = color_0.w;
            if((_S4 > 0.0f))
            {
                var light_0 : vec3<f32> = max(color_0.xyz, vec3<f32>(0.0f)) * vec3<f32>(min(_S4, 1.0f)) / vec3<f32>(params_0.exposure_0);
                var y_0 : f32 = dot(light_0, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f));
                var _S5 : f32 = max(y_0 * (1.3300000429153442f * (1.0f + (y_0 + dot(light_0, vec3<f32>(0.019300000742077827f, 0.11919999867677689f, 0.9505000114440918f))) / max(dot(light_0, vec3<f32>(0.4124000072479248f, 0.35760000348091125f, 0.18050000071525574f)), 9.999999960041972e-13f)) - 1.6799999475479126f), 0.0f);
                var d_0 : vec2<f32> = unit_0 * vec2<f32>(2.0f) - vec2<f32>(1.0f);
                var weight_0 : u32 = u32(1) + u32(3.0f * exp(- dot(d_0, d_0) / 0.24499998986721039f) + 0.5f);
                var _S6 : u32 = atomicAdd(&(photopic_0[binOf_0(y_0)]), weight_0);
                var _S7 : u32 = atomicAdd(&(scotopic_0[binOf_0(_S5)]), weight_0);
            }
            gx_0 = gx_0 + u32(16);
        }
        gy_0 = gy_0 + u32(16);
    }
    workgroupBarrier();
    var _S8 : bool = (index_0 < u32(144));
    var counts_0 : vec2<u32>;
    if(_S8)
    {
        var _S9 : u32 = atomicLoad(&(photopic_0[index_0]));
        var _S10 : u32 = atomicLoad(&(scotopic_0[index_0]));
        counts_0 = vec2<u32>(_S9, _S10);
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
    var _S11 : vec2<f32> = vec2<f32>(below_0[u32(255)]);
    var _S12 : vec2<f32> = vec2<f32>(below_0[index_0] - counts_0);
    if(_S8)
    {
        var center_0 : f32 = -24.0f + (f32(index_0) + 0.5f) * 0.3333333432674408f;
        var rank_0 : vec2<f32> = _S11 * vec2<f32>(0.98000001907348633f);
        var _S13 : f32 = _S12.x;
        var _S14 : f32 = rank_0.x;
        var _S15 : bool;
        if((_S13 <= _S14))
        {
            _S15 = (_S14 < (_S13 + f32(counts_0.x)));
        }
        else
        {
            _S15 = false;
        }
        if(_S15)
        {
            peak_0[i32(0)] = center_0;
        }
        var _S16 : f32 = _S12.y;
        var _S17 : f32 = rank_0.y;
        if((_S16 <= _S17))
        {
            _S15 = (_S17 < (_S16 + f32(counts_0.y)));
        }
        else
        {
            _S15 = false;
        }
        if(_S15)
        {
            peak_0[i32(1)] = center_0;
        }
    }
    var _S18 : vec4<f32>;
    if(_S8)
    {
        _S18 = vec4<f32>(share_0(index_0, f32(counts_0.x), _S12.x, _S11.x), share_0(index_0, f32(counts_0.y), _S12.y, _S11.y));
    }
    else
    {
        _S18 = vec4<f32>(0.0f);
    }
    shares_0[index_0] = _S18;
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
    if(_S2)
    {
        var _S19 : f32 = shares_0[i32(0)].y;
        var _S20 : f32 = shares_0[i32(0)].w;
        var floorSums_0 : vec2<f32> = (peak_0 - vec2<f32>(4.0f)) * vec2<f32>(_S19, _S20);
        result_0[i32(0)] = vec4<f32>(max(shares_0[i32(0)].x, floorSums_0.x), _S19, max(shares_0[i32(0)].z, floorSums_0.y), _S20);
    }
    return;
}

