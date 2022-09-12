
uniform mat4 shadowMap_cascadeMatrices[4];

mat4 czm_cascadeMatrix(vec4 weights)
{
    return shadowMap_cascadeMatrices[0] * weights.x +
           shadowMap_cascadeMatrices[1] * weights.y +
           shadowMap_cascadeMatrices[2] * weights.z +
           shadowMap_cascadeMatrices[3] * weights.w;
}
