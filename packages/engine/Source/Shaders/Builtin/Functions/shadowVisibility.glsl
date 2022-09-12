
float czm_private_shadowVisibility(float visibility, float nDotL, float normalShadingSmooth, float darkness)
{
#ifdef USE_NORMAL_SHADING
#ifdef USE_NORMAL_SHADING_SMOOTH
    float strength = clamp(nDotL / normalShadingSmooth, 0.0, 1.0);
#else
    float strength = step(0.0, nDotL);
#endif
    visibility *= strength;
#endif

    visibility = max(visibility, darkness);
    return visibility;
}

#ifdef USE_CUBE_MAP_SHADOW
float czm_shadowVisibility(samplerCube shadowMap, czm_shadowParameters shadowParameters)
{
    float depthBias = shadowParameters.depthBias;
    float depth = shadowParameters.depth;
    float nDotL = shadowParameters.nDotL;
    float normalShadingSmooth = shadowParameters.normalShadingSmooth;
    float darkness = shadowParameters.darkness;
    vec3 uvw = shadowParameters.texCoords;

    depth -= depthBias;
    float visibility = czm_shadowDepthCompare(shadowMap, uvw, depth);
    return czm_private_shadowVisibility(visibility, nDotL, normalShadingSmooth, darkness);
}
#else
float czm_shadowVisibility(sampler2D shadowMap, czm_shadowParameters shadowParameters)
{
    float depthBias = shadowParameters.depthBias;
    float depth = shadowParameters.depth;
    float nDotL = shadowParameters.nDotL;
    float normalShadingSmooth = shadowParameters.normalShadingSmooth;
    float darkness = shadowParameters.darkness;
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
        czm_shadowDepthCompare(shadowMap, uv, depth) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy0), depth) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy0), depth) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy0), depth) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, 0.0), depth) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, 0.0), depth) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy1), depth) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy1), depth) +
        czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy1), depth)
    ) * (1.0 / 9.0);
#else
    float visibility = czm_shadowDepthCompare(shadowMap, uv, depth);
#endif

    return czm_private_shadowVisibility(visibility, nDotL, normalShadingSmooth, darkness);
}
#endif
