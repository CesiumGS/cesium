mat4 instanceModel;
mat4 instanceModelView;
mat3 instanceModelViewInverseTranspose;

void legacyInstancingStage(inout vec3 positionMC)
{
    mat4 instancingTransform = getInstancingTransform();

    instanceModel = instancingTransform * u_instance_nodeTransform;
    instanceModelView = u_instance_modifiedModelView * instanceModel;
    instanceModelViewInverseTranspose = mat3(instanceModelView);

    positionMC = (instanceModel * vec4(positionMC, 1.0)).xyz;
}
