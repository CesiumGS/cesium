#if defined(HAS_NORMALS) && !defined(HAS_TANGENTS) && !defined(LIGHTING_UNLIT)
    #ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
    #endif
#endif

czm_modelMaterial defaultModelMaterial()
{
    czm_modelMaterial material;
    material.diffuse = vec3(1.0);
    material.specular = vec3(0.04); // dielectric (non-metal)
    material.roughness = 0.0;
    material.occlusion = 1.0;
    material.normal = vec3(0.0, 0.0, 1.0);
    material.emissive = vec3(0.0);
    material.alpha = 1.0;
    return material;
}

vec4 handleAlpha(vec3 color, float alpha)
{
    #ifdef ALPHA_MODE_MASK
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

    #ifndef CUSTOM_SHADER_REPLACE_MATERIAL
    material = materialStage(material);
    #endif

    #if defined(CUSTOM_SHADER_MODIFY_MATERIAL) || defined(CUSTOM_SHADER_REPLACE_MATERIAL) 
    material = customShaderStage(material);
    #endif

    material = lightingStage(material);

    vec4 color = handleAlpha(material.diffuse, material.alpha);

    #ifdef HAS_FEATURES
    featureStage();
    #endif

    gl_FragColor = color;
}
