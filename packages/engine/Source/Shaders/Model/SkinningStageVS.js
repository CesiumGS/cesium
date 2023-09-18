//This file is automatically rebuilt by the Cesium build process.
export default "void skinningStage(inout ProcessedAttributes attributes) \n\
{\n\
    mat4 skinningMatrix = getSkinningMatrix();\n\
    mat3 skinningMatrixMat3 = mat3(skinningMatrix);\n\
\n\
    vec4 positionMC = vec4(attributes.positionMC, 1.0);\n\
    attributes.positionMC = vec3(skinningMatrix * positionMC);\n\
\n\
    #ifdef HAS_NORMALS\n\
    vec3 normalMC = attributes.normalMC;\n\
    attributes.normalMC = skinningMatrixMat3 * normalMC;\n\
    #endif\n\
\n\
    #ifdef HAS_TANGENTS\n\
    vec3 tangentMC = attributes.tangentMC;\n\
    attributes.tangentMC = skinningMatrixMat3 * tangentMC;\n\
    #endif\n\
}";
