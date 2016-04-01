
uniform mat4 u_shadowMapCascadeMatrices[4];

mat4 czm_cascadeMatrix(vec4 weights)
{
    return u_shadowMapCascadeMatrices[0] * weights.x +
           u_shadowMapCascadeMatrices[1] * weights.y +
           u_shadowMapCascadeMatrices[2] * weights.z +
           u_shadowMapCascadeMatrices[3] * weights.w;
}