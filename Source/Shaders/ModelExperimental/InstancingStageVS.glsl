void instancingStage(inout vec3 positionMC) 
{
    mat4 instancingTransform = getInstancingTransform();

    positionMC = (instancingTransform * vec4(positionMC, 1.0)).xyz;
}
