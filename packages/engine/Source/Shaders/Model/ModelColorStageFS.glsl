void modelColorStage(inout czm_modelMaterial material)
{
    material.diffuse = mix(material.diffuse, model_color.rgb, model_colorBlend);
    float highlight = ceil(model_colorBlend);
    material.diffuse *= mix(model_color.rgb, vec3(1.0), highlight);
    material.alpha *= model_color.a;
}
