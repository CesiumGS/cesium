
uniform vec4 u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth;

float czm_private_shadowVisibility(float visibility, float nDotL) {
#ifdef USE_NORMAL_SHADING
#ifdef USE_NORMAL_SHADING_SMOOTH
    float normalShadingSmooth = u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth.w;
    float strength = clamp(nDotL / normalShadingSmooth, 0.0, 1.0);
#else
    float strength = step(0.0, nDotL);
#endif
    visibility *= strength;
#endif

    visibility = max(visibility, 0.3);
    return visibility;
}

float czm_shadowVisibility(vec3 uv, float depth, float nDotL, float shadowDistance)
{
    float depthBias = u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth.z;
    depth -= depthBias;
    float visibility = czm_shadowDepthCompare(uv, depth, shadowDistance);
    return czm_private_shadowVisibility(visibility, nDotL);
}

float czm_shadowVisibility(vec2 uv, float depth, float nDotL, float shadowDistance)
{
#ifdef USE_SOFT_SHADOWS
    vec2 texelStepSize = u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth.xy;
    float radius = 1.0;
    float dx0 = -texelStepSize.x * radius;
    float dy0 = -texelStepSize.y * radius;
    float dx1 = texelStepSize.x * radius;
    float dy1 = texelStepSize.y * radius;
    float visibility = (
        czm_shadowDepthCompare(uv, depth, shadowDistance) +
        czm_shadowDepthCompare(uv + vec2(dx0, dy0), depth, shadowDistance) +
        czm_shadowDepthCompare(uv + vec2(0.0, dy0), depth, shadowDistance) +
        czm_shadowDepthCompare(uv + vec2(dx1, dy0), depth, shadowDistance) +
        czm_shadowDepthCompare(uv + vec2(dx0, 0.0), depth, shadowDistance) +
        czm_shadowDepthCompare(uv + vec2(dx1, 0.0), depth, shadowDistance) +
        czm_shadowDepthCompare(uv + vec2(dx0, dy1), depth, shadowDistance) +
        czm_shadowDepthCompare(uv + vec2(0.0, dy1), depth, shadowDistance) +
        czm_shadowDepthCompare(uv + vec2(dx1, dy1), depth, shadowDistance)
    ) * (1.0 / 9.0);
#else
    float depthBias = u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth.z;
    depth -= depthBias;
    float visibility = czm_shadowDepthCompare(uv, depth, shadowDistance);
#endif

    return czm_private_shadowVisibility(visibility, nDotL);
}