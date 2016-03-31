
mat4 czm_cascadeMatrix(vec4 weights)
{
    return czm_shadowMapCascadeMatrices[0] * weights.x +
           czm_shadowMapCascadeMatrices[1] * weights.y +
           czm_shadowMapCascadeMatrices[2] * weights.z +
           czm_shadowMapCascadeMatrices[3] * weights.w;
}