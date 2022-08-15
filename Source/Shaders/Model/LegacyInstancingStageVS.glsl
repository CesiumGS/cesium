void legacyInstancingStage(
    inout ProcessedAttributes attributes,
    out mat4 instanceModelView,
    out mat3 instanceModelViewInverseTranspose)
{
    vec3 positionMC = attributes.positionMC;
    vec3 normalMC = attributes.normalMC;

    mat4 instancingTransform = getInstancingTransform();
 
    mat4 instanceModel = instancingTransform * u_instance_nodeTransform;
    instanceModelView = u_instance_modifiedModelView;
    instanceModelViewInverseTranspose = mat3(u_instance_modifiedModelView * instanceModel);

    attributes.positionMC = (instanceModel * vec4(positionMC, 1.0)).xyz;
    attributes.normalMC = (instanceModel * vec4(normalMC, 0.0)).xyz;
    
    #ifdef USE_2D_INSTANCING
    mat4 instancingTransform2D = getInstancingTransform2D();
    attributes.position2D = (instancingTransform2D * vec4(positionMC, 1.0)).xyz;
    #endif
}
