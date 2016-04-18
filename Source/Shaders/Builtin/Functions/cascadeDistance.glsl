
uniform vec4 shadowMap_cascadeDistances;

float czm_cascadeDistance(vec4 weights)
{
    return dot(shadowMap_cascadeDistances, weights);
}