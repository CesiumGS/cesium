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
    material.normalEC = vec3(0.0, 0.0, 1.0);
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

/*
vec2 computePropertySt(float featureId, float propertyOffset, float textureSize) {
    // TODO: Handle multiline features.
    // TODO: Also feature offset.
    float x = (propertyOffset + featureId + 0.5) / textureSize;
    float y = 0.5;
    return vec2(x, y);
}
*/

void main() 
{
    czm_modelMaterial material = defaultModelMaterial();

    ProcessedAttributes attributes;
    geometryStage(attributes);

    #ifndef CUSTOM_SHADER_REPLACE_MATERIAL
    materialStage(material, attributes);
    #endif

    Metadata metadata;

    //float x = (propertyOffset + featureId + 0.5) / textureSize;
    //float y = 0.5;

/*
    metadata.windVelocity = texture2D(
      u_featureTable_0_float,
      vec2((attributes.featureId_0 + 2000.0 + 0.5) / 3000.0, 0.5)
      computePropertySt(
        attributes.featureId_0,
        2000.0,
        3.0 * 1000.0
      )
    ).rgb; */
    metadataStage(attributes, metadata);
    //gl_FragColor = vec4(metadata.windVelocity, 1.0);
    

    #ifdef HAS_CUSTOM_FRAGMENT_SHADER
        //ifdef HAS_METADATA
        customShaderStage(material, attributes, metadata);
        //#else
        //customShaderStage(material, attributes);
        //endif
    #endif

    lightingStage(material);

    vec4 color = handleAlpha(material.diffuse, material.alpha);

    #ifdef HAS_FEATURES
    featureStage();
    #endif

    gl_FragColor = color;
}
