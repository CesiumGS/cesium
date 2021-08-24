#if defined(HAS_NORMALS) && !defined(HAS_TANGENTS) && !defined(LIGHTING_UNLIT)
    #ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
    #endif
#endif

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

    material = materialStage(material);
    material = lightingStage(material);

    vec4 color = handleAlpha(material.diffuse, material.alpha);
    gl_FragColor = color;
}