//This file is automatically rebuilt by the Cesium build process.
export default "void legacyInstancingStage(\n\
    inout ProcessedAttributes attributes,\n\
    out mat4 instanceModelView,\n\
    out mat3 instanceModelViewInverseTranspose)\n\
{\n\
    vec3 positionMC = attributes.positionMC;\n\
\n\
    mat4 instancingTransform = getInstancingTransform();\n\
 \n\
    mat4 instanceModel = instancingTransform * u_instance_nodeTransform;\n\
    instanceModelView = u_instance_modifiedModelView;\n\
    instanceModelViewInverseTranspose = mat3(u_instance_modifiedModelView * instanceModel);\n\
\n\
    attributes.positionMC = (instanceModel * vec4(positionMC, 1.0)).xyz;\n\
    \n\
    #ifdef USE_2D_INSTANCING\n\
    mat4 instancingTransform2D = getInstancingTransform2D();\n\
    attributes.position2D = (instancingTransform2D * vec4(positionMC, 1.0)).xyz;\n\
    #endif\n\
}\n\
";
