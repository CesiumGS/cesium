
float czm_sampleShadowMap(vec3 d)
{
    return czm_unpackDepth(textureCube(czm_shadowMapTextureCube, d));
}

float czm_sampleShadowMap(vec2 uv)
{
#ifdef USE_SHADOW_DEPTH_TEXTURE
    return texture2D(czm_shadowMapTexture, uv).r;
#else
    return czm_unpackDepth(texture2D(czm_shadowMapTexture, uv));
#endif
}

float czm_shadowDepthCompare(vec3 uv, float depth, float shadowDistance)
{
#ifdef USE_EXPONENTIAL_SHADOW_MAPS
    float shadowDepth = czm_sampleShadowMap(uv);
    float darknessFactor = 10.0 * shadowDistance;
    return clamp(exp(darknessFactor * (shadowDepth - depth)), 0.0, 1.1);
#else
    return step(depth, czm_sampleShadowMap(uv));
#endif
}

float czm_shadowDepthCompare(vec2 uv, float depth, float shadowDistance)
{
#ifdef USE_EXPONENTIAL_SHADOW_MAPS
    float shadowDepth = czm_sampleShadowMap(uv);
    float darknessFactor = 10.0 * shadowDistance;
    return clamp(exp(darknessFactor * (shadowDepth - depth)), 0.0, 1.1);
#else
    return step(depth, czm_sampleShadowMap(uv));
#endif
}