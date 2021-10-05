void modelColorStage(inout vec3 diffuse, inout float alpha)
{
    diffuse = mix(diffuse, model_color.rgb, model_colorBlend);
    float highlight = ceil(model_colorBlend);
    diffuse *= mix(model_color.rgb, vec3(1.0), highlight);
    alpha *= model_color.a;
}
