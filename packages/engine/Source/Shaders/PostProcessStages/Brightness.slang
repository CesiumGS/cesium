[[vk::binding(0, 0)]]
Texture2D colorTexture;

[[vk::binding(1, 0)]]
SamplerState colorTextureSampler;

uniform float brightness;

[shader("fragment")]
float4 main(
    [[vk::location(0)]] float2 v_textureCoordinates : TEXCOORD0
) : SV_Target
{
    float3 rgb = colorTexture.Sample(colorTextureSampler, v_textureCoordinates).rgb;
    float3 target = float3(0.0, 0.0, 0.0);
    return float4(lerp(target, rgb, brightness), 1.0);
}
