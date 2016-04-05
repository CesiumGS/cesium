float czm_cascadeDistance(vec4 weights)
{
    return dot(czm_shadowMapCascadeDistances, weights);
}