void RuntimeModelInstancingStage(
    inout ProcessedAttributes attributes,
    out mat4 instanceModelView,
    out mat3 instanceModelViewInverseTranspose)
{
    vec3 positionMC = attributes.positionMC;

    mat4 instancingTransform = getInstancingTransform();
 
    mat4 instanceModel = instancingTransform * u_instance_nodeTransform;
    vec4 relativePositionMC = instanceModel * vec4(positionMC, 1.0);

    vec4 translateRelativeToEye = czm_translateRelativeToEye(a_instancingPositionHigh, a_instancingPositionLow);
    attributes.positionMC = (relativePositionMC + translateRelativeToEye).xyz;

    instanceModelView = czm_modelViewRelativeToEye;
    // TODO: Normals
    //instanceModelViewInverseTranspose = mat3(u_instance_modifiedModelView * instanceModel);
}
