
float czm_cascadeScale(vec4 weights)
{
    return dot(czm_shadowMapCascadeScales, weights);
}