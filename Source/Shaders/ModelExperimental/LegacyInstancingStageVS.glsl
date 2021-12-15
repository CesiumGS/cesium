void legacyInstancingStage(inout vec3 positionMC, out mat4 instanceModelView, out mat3 instanceModelViewInverseTranspose)
{
    mat4 instancingTransform = getInstancingTransform();

    mat4 instanceModel = instancingTransform * u_instance_nodeTransform;
    instanceModelView = czm_modelView * instanceModel;
    instanceModelViewInverseTranspose = mat3(instanceModelView);

    positionMC = (instanceModel * vec4(positionMC, 1.0)).xyz;
}
