
float czm_private_shadowVisibility(float visibility, float nDotL, float normalShadingSmooth) {
#ifdef USE_NORMAL_SHADING
#ifdef USE_NORMAL_SHADING_SMOOTH
    float strength = clamp(nDotL / normalShadingSmooth, 0.0, 1.0);
#else
    float strength = step(0.0, nDotL);
#endif
    visibility *= strength;
#endif

    visibility = max(visibility, 0.3);
    return visibility;
}

#ifdef USE_CUBE_MAP_SHADOW
float czm_shadowVisibility(samplerCube shadowMap, czm_shadowParameters shadowParameters)
{
    float depthBias = shadowParameters.depthBias;
    float shadowDistance = shadowParameters.distance;
    float depth = shadowParameters.depth;
    float nDotL = shadowParameters.nDotL;
    float normalShadingSmooth = shadowParameters.normalShadingSmooth;
    vec3 uvw = shadowParameters.texCoords;

    depth -= depthBias;
    float visibility = czm_shadowDepthCompare(shadowMap, uvw, depth, shadowDistance);
    return czm_private_shadowVisibility(visibility, nDotL, normalShadingSmooth);
}
#else
float czm_shadowVisibility(sampler2D shadowMap, czm_shadowParameters shadowParameters)
{
    float depthBias = shadowParameters.depthBias;
    float shadowDistance = shadowParameters.distance;
    float depth = shadowParameters.depth;
    float nDotL = shadowParameters.nDotL;
    float normalShadingSmooth = shadowParameters.normalShadingSmooth;
    vec2 uv = shadowParameters.texCoords;

    depth -= depthBias;
#ifdef USE_SOFT_SHADOWS
    vec2 texelStepSize = shadowParameters.texelStepSize;
    float radius = 1.0;
    float dx0 = -texelStepSize.x * radius;
    float dy0 = -texelStepSize.y * radius;
    float dx1 = texelStepSize.x * radius;
    float dy1 = texelStepSize.y * radius;
    float visibility = (
        czm_shadowDepthCompare(shadowMap, uv, depth, shadowDistance) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy0), depth, shadowDistance) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy0), depth, shadowDistance) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy0), depth, shadowDistance) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, 0.0), depth, shadowDistance) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, 0.0), depth, shadowDistance) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy1), depth, shadowDistance) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy1), depth, shadowDistance) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy1), depth, shadowDistance)
    ) * (1.0 / 9.0);
#else
    float visibility = czm_shadowDepthCompare(shadowMap, uv, depth, shadowDistance);
#endif

    return czm_private_shadowVisibility(visibility, nDotL, normalShadingSmooth);
}
#endif
