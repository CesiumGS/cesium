//This file is automatically rebuilt by the Cesium build process.
export default "void modelColorStage(inout czm_modelMaterial material)\n\
{\n\
    material.diffuse = mix(material.diffuse, model_color.rgb, model_colorBlend);\n\
    float highlight = ceil(model_colorBlend);\n\
    material.diffuse *= mix(model_color.rgb, vec3(1.0), highlight);\n\
    material.alpha *= model_color.a;\n\
}";
