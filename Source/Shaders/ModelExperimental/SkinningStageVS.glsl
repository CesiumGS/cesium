void skinningStage(inout ProcessedAttributes attributes) 
{
    mat4 skinningMatrix = getSkinningMatrix();
    mat3 skinningMatrixMat3 = mat3(skinningMatrix);

    vec3 positionMC = attributes.positionMC;
    attributes.positionMC = skinningMatrix * positionMC;

    #ifdef HAS_NORMALS
    vec3 normalMC = attributes.normalMC;
    attributes.normalMC = skinningMatrixMat3 * normalMC;
    #endif

    #ifdef HAS_TANGENTS
    vec3 tangentMC = attributes.tangentMC;
    attributes.tangentMC = skinningMatrixMat3 * tangentMC;
    #endif
}