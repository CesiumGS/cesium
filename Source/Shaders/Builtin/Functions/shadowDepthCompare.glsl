
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

float czm_shadowDepthCompare(vec3 uv, float depth)
{
    return step(depth, czm_sampleShadowMap(uv));
}

float czm_shadowDepthCompare(vec2 uv, float depth)
{
    return step(depth, czm_sampleShadowMap(uv));
}