vec4 handleAlpha(vec3 color, float alpha)
{
    #if defined(ALPHA_MODE_MASK)
    if (alpha < u_alphaCutoff) {
        discard;
    }
    return vec4(color, 1.0);
    #elif defined(ALPHA_MODE_BLEND)
    return vec4(color, alpha);
    #else // OPAQUE
    return vec4(color, 1.0);
    #endif
}

void main() 
{
    czm_modelMaterial material = defaultModelMaterial();
    #if defined(CUSTOM_SHADER_REPLACE_MATERIAL)
    material = customShaderStage(material);
    #elif defined(CUSTOM_SHADER_BEFORE_MATERIAL)
    material = customShaderStage(material);
    material = materialStage(material);
    #elif defined(CUSTOM_SHADER_MODIFY_MATERIAL)
    material = materialStage(material);
    material = customShaderStage(material);
    #else
    material = materialStage(material);
    #endif

    material = lightingStage(material);

    #if defined(CUSTOM_SHADER_AFTER_LIGHTING)
    material = customShaderStage(material);
    #endif


    gl_FragColor = handleAlpha(material.diffuse, material.alpha);
}