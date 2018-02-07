
vec2 czm_readDepth(sampler2D depthTexture, vec2 textureCoordinates) {
#ifdef USE_PACKED_DEPTH
    vec4 depthFrustum = texture2D(depthTexture, textureCoordinates);
    return vec2(czm_unpackDepth(vec4(depthFrustum.xyz, 0.0)), depthFrustum.w);
#else
    return vec2(texture2D(depthTexture, textureCoordinates).r, 0.0);
#endif
}
