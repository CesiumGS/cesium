void morphTargetsStage(inout ProcessedAttributes attributes) 
{
    vec3 positionMC = attributes.positionMC;
    attributes.positionMC = getMorphedPosition(positionMC);

    #ifdef HAS_NORMALS
    vec3 normalMC = attributes.normalMC;
    attributes.normalMC = getMorphedNormal(normalMC);
    #endif

    #ifdef HAS_TANGENTS
    vec3 tangentMC = attributes.tangentMC;
    attributes.tangentMC = getMorphedTangent(tangentMC);
    #endif
}