mat4 instanceModel;
mat4 instanceModelView;
mat3 instanceModelViewInverseTranspose;

void legacyInstancingStage()
{
    mat4 instancingTransform = getInstancingTransform();

    instanceModel = instancingTransform * u_instance_nodeTransform;
    instanceModelView = u_instance_modifiedModelView * instanceModel;
    instanceModelViewInverseTranspose = mat3(instanceModelView);
}
