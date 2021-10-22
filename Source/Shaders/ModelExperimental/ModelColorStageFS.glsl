void modelColorStage(inout czm_modelMaterial material)
{
    float highlight = ceil(model_colorBlend);
    material.diffuse *= mix(model_color.rgb, vec3(1.0), highlight);
    material.alpha *= model_color.a;
}