// Generated from examples/night-sky/sprites.slang by slangc 2026.22
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct GlareSource_std430_0
{
    @align(16) pixel_0 : vec2<f32>,
    @align(8) radius_0 : f32,
    @align(4) visibility_0 : f32,
    @align(16) light_0 : vec3<f32>,
    @align(4) kind_0 : f32,
};

@binding(1) @group(0) var<storage, read> spriteSources_0 : array<GlareSource_std430_0>;

struct SpriteFrame_std140_0
{
    @align(16) size_0 : vec2<f32>,
    @align(8) exposure_0 : f32,
    @align(4) brightness_0 : f32,
    @align(16) kernelScale_0 : f32,
    @align(4) uvPerPixel_0 : f32,
    @align(8) kernelLevel_0 : f32,
    @align(4) unused_0 : f32,
};

@binding(0) @group(0) var<uniform> frame_0 : SpriteFrame_std140_0;
@binding(2) @group(0) var glareKernel_0 : texture_2d<f32>;

@binding(3) @group(0) var kernelSampler_0 : sampler;

struct SpriteVarying_0
{
    @builtin(position) position_0 : vec4<f32>,
    @location(0) corner_0 : vec2<f32>,
    @interpolate(flat) @location(1) light_1 : vec3<f32>,
    @interpolate(flat) @location(2) reach_0 : f32,
};

@vertex
fn spriteVertex(@builtin(vertex_index) corner_1 : u32, @builtin(instance_index) slot_0 : u32) -> SpriteVarying_0
{
    var out_0 : SpriteVarying_0;
    out_0.position_0 = vec4<f32>(2.0f, 2.0f, 0.0f, 1.0f);
    out_0.corner_0 = vec2<f32>(0.0f);
    out_0.light_1 = vec3<f32>(0.0f);
    out_0.reach_0 = 0.0f;
    if((f32(slot_0) >= (spriteSources_0[i32(0)].pixel_0.x)))
    {
        return out_0;
    }
    var source_0 : GlareSource_std430_0 = spriteSources_0[slot_0 + u32(1)];
    var _S1 : bool;
    if(((source_0.radius_0) <= 0.0f))
    {
        _S1 = true;
    }
    else
    {
        _S1 = ((source_0.visibility_0) <= 0.0f);
    }
    if(_S1)
    {
        return out_0;
    }
    var c_0 : vec2<f32> = vec2<f32>(f32((corner_1 & (u32(1)))), f32((corner_1 >> (u32(1))))) * vec2<f32>(2.0f) - vec2<f32>(1.0f);
    var pixel_1 : vec2<f32> = source_0.pixel_0 + c_0 * vec2<f32>(source_0.radius_0);
    out_0.position_0 = vec4<f32>(pixel_1.x / frame_0.size_0.x * 2.0f - 1.0f, 1.0f - pixel_1.y / frame_0.size_0.y * 2.0f, 0.0f, 1.0f);
    out_0.corner_0 = c_0;
    out_0.light_1 = source_0.light_0 * vec3<f32>(source_0.visibility_0) * vec3<f32>(frame_0.exposure_0) * vec3<f32>(frame_0.brightness_0) * vec3<f32>(frame_0.kernelScale_0);
    out_0.reach_0 = source_0.radius_0 * frame_0.uvPerPixel_0;
    return out_0;
}

struct pixelOutput_0
{
    @location(0) output_0 : vec4<f32>,
};

struct pixelInput_0
{
    @location(0) corner_2 : vec2<f32>,
    @interpolate(flat) @location(1) light_2 : vec3<f32>,
    @interpolate(flat) @location(2) reach_1 : f32,
};

@fragment
fn spriteFragment( _S2 : pixelInput_0, @builtin(position) position_1 : vec4<f32>) -> pixelOutput_0
{
    var _S3 : pixelOutput_0 = pixelOutput_0( vec4<f32>(min(_S2.light_2 * (textureSampleLevel((glareKernel_0), (kernelSampler_0), (vec2<f32>(0.5f) + _S2.corner_2 * vec2<f32>(_S2.reach_1)), (frame_0.kernelLevel_0))).xyz * vec3<f32>(saturate((1.0f - length(_S2.corner_2)) * 10.0f)), vec3<f32>(200.0f)), 0.0f) );
    return _S3;
}

