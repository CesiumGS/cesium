float czm_readDepth(sampler2D depthTexture, vec2 texCoords)
{
    return czm_reverseLogDepth(texture(depthTexture, texCoords).r);
}
