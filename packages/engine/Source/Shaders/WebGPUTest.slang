[shader("fragment")]
float4 main(
    [[vk::location(0)]] float2 uv : TEXCOORD0
) : SV_Target
{
    return float4(1.0, 0.0, 0.0, 0.5);
}
