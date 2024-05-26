#if defined(LIGHTING_PBR) && defined(HAS_NORMALS)
vec3 computePbrLighting(in czm_modelMaterial material, in vec3 position)
{
    #ifdef USE_CUSTOM_LIGHT_COLOR
        vec3 lightColorHdr = model_lightColorHdr;
    #else
        vec3 lightColorHdr = czm_lightColorHdr;
    #endif

    vec3 viewDirection = -normalize(position);
    vec3 normal = material.normalEC;
    vec3 lightDirection = normalize(czm_lightDirectionEC);

    vec3 directLighting = czm_pbrLighting(viewDirection, normal, lightDirection, material);
    vec3 color = lightColorHdr * directLighting;

    #if defined(DIFFUSE_IBL) || defined(SPECULAR_IBL)
        // Environment maps were provided, use them for IBL
        color += textureIBL(viewDirection, normal, lightDirection, material);
    #elif defined(USE_IBL_LIGHTING)
        // Use procedural IBL if there are no environment maps
        vec3 imageBasedLighting = proceduralIBL(position, normal, lightDirection, material);
        float maximumComponent = czm_maximumComponent(lightColorHdr);
        vec3 clampedLightColor = lightColorHdr / max(maximumComponent, 1.0);
        color += clampedLightColor * imageBasedLighting;
    #endif

    color *= material.occlusion;
    color += material.emissive;

    return color;
}
#endif

/**
 * Compute the material color under the current lighting conditions.
 * All other material properties are passed through so further stages
 * have access to them.
 *
 * @param {czm_modelMaterial} material The material properties from {@MaterialStageFS}
 * @param {ProcessedAttributes} attributes
 */
void lightingStage(inout czm_modelMaterial material, ProcessedAttributes attributes)
{
    #ifdef LIGHTING_PBR
        #ifdef HAS_NORMALS
            vec3 color = computePbrLighting(material, attributes.positionEC);
        #else
            vec3 color = material.diffuse * material.occlusion + material.emissive;
        #endif
        // In HDR mode, the frame buffer is in linear color space. The
        // post-processing stages (see PostProcessStageCollection) will handle
        // tonemapping. However, if HDR is not enabled, we must tonemap else large
        // values may be clamped to 1.0
        #ifndef HDR
            color = czm_acesTonemapping(color);
        #endif
    #else // unlit
        vec3 color = material.diffuse;
    #endif

    #ifdef HAS_POINT_CLOUD_COLOR_STYLE
        // The colors resulting from point cloud styles are adjusted differently.
        color = czm_gammaCorrect(color);
    #elif !defined(HDR)
        // If HDR is not enabled, the frame buffer stores sRGB colors rather than
        // linear colors so the linear value must be converted.
        color = czm_linearToSrgb(color);
    #endif

    material.diffuse = color;
}
