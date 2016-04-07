
uniform vec4 u_shadowMapCascadeDistances;

float czm_cascadeDistance(vec4 weights)
{
    return dot(u_shadowMapCascadeDistances, weights);
}