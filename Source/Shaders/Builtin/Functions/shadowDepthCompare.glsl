
float czm_sampleShadowMap(samplerCube shadowMap, vec3 d)
{
    return czm_unpackDepth(textureCube(shadowMap, d));
}

float czm_sampleShadowMap(sampler2D shadowMap, vec2 uv)
{
#ifdef USE_SHADOW_DEPTH_TEXTURE
    return texture2D(shadowMap, uv).r;
#else
    return czm_unpackDepth(texture2D(shadowMap, uv));
#endif
}

float czm_shadowDepthCompare(samplerCube shadowMap, vec3 uv, float depth, float shadowDistance)
{
#ifdef USE_EXPONENTIAL_SHADOW_MAPS
    float shadowDepth = czm_sampleShadowMap(shadowMap, uv);
    float darknessFactor = 10.0 * shadowDistance;
    return clamp(exp(darknessFactor * (shadowDepth - depth)), 0.0, 1.1);
#else
    return step(depth, czm_sampleShadowMap(shadowMap, uv));
#endif
}

float czm_shadowDepthCompare(sampler2D shadowMap, vec2 uv, float depth, float shadowDistance)
{
#ifdef USE_EXPONENTIAL_SHADOW_MAPS
    float shadowDepth = czm_sampleShadowMap(shadowMap, uv);
    float darknessFactor = 10.0 * shadowDistance;
    return clamp(exp(darknessFactor * (shadowDepth - depth)), 0.0, 1.1);
#else
    return step(depth, czm_sampleShadowMap(shadowMap, uv));
#endif
}