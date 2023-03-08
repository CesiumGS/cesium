//This file is automatically rebuilt by the Cesium build process.
export default "void morphTargetsStage(inout ProcessedAttributes attributes) \n\
{\n\
    vec3 positionMC = attributes.positionMC;\n\
    attributes.positionMC = getMorphedPosition(positionMC);\n\
\n\
    #ifdef HAS_NORMALS\n\
    vec3 normalMC = attributes.normalMC;\n\
    attributes.normalMC = getMorphedNormal(normalMC);\n\
    #endif\n\
\n\
    #ifdef HAS_TANGENTS\n\
    vec3 tangentMC = attributes.tangentMC;\n\
    attributes.tangentMC = getMorphedTangent(tangentMC);\n\
    #endif\n\
}";
