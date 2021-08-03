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

  material = materialStage(material);
  material = lightingStage(material);

  gl_FragColor = handleAlpha(material.diffuse, material.alpha);
}