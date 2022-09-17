void instancingStage(inout ProcessedAttributes attributes) 
{
    vec3 positionMC = attributes.positionMC;
    
    mat4 instancingTransform = getInstancingTransform();
    
    attributes.positionMC = (instancingTransform * vec4(positionMC, 1.0)).xyz;

    #ifdef HAS_NORMALS
    vec3 normalMC = attributes.normalMC;
    attributes.normalMC = (instancingTransform * vec4(normalMC, 0.0)).xyz;
    #endif

    #ifdef USE_2D_INSTANCING
    mat4 instancingTransform2D = getInstancingTransform2D();
    attributes.position2D = (instancingTransform2D * vec4(positionMC, 1.0)).xyz;
    #endif
}
