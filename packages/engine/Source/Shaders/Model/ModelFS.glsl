
precision highp float;


in float depth;
in vec3 con;
in vec2 xy;
in vec2 pixf;
in vec4 vPosition;


czm_modelMaterial defaultModelMaterial()
{
    czm_modelMaterial material;
    material.diffuse = vec3(0.0);
    material.specular = vec3(1.0);
    material.roughness = 1.0;
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
    #endif

    return vec4(color, alpha);
}

SelectedFeature selectedFeature;

void main()
{
    #ifdef HAS_MODEL_SPLITTER
    modelSplitterStage();
    #endif

    czm_modelMaterial material = defaultModelMaterial();

    ProcessedAttributes attributes;
    geometryStage(attributes);

    FeatureIds featureIds;
    featureIdStage(featureIds, attributes);

    Metadata metadata;
    MetadataClass metadataClass;
    MetadataStatistics metadataStatistics;
    metadataStage(metadata, metadataClass, metadataStatistics, attributes);

    #ifdef HAS_SELECTED_FEATURE_ID
    selectedFeatureIdStage(selectedFeature, featureIds);
    #endif

    #ifndef CUSTOM_SHADER_REPLACE_MATERIAL
    materialStage(material, attributes, selectedFeature);
    #endif

    #ifdef HAS_CUSTOM_FRAGMENT_SHADER
    customShaderStage(material, attributes, featureIds, metadata, metadataClass, metadataStatistics);
    #endif

    lightingStage(material, attributes);

    #ifdef HAS_SELECTED_FEATURE_ID
    cpuStylingStage(material, selectedFeature);
    #endif

    #ifdef HAS_MODEL_COLOR
    modelColorStage(material);
    #endif

    #ifdef HAS_PRIMITIVE_OUTLINE
    primitiveOutlineStage(material);
    #endif

    vec4 color = handleAlpha(material.diffuse, material.alpha);

    #ifdef HAS_CLIPPING_PLANES
    modelClippingPlanesStage(color);
    #endif

    #ifdef ENABLE_CLIPPING_POLYGONS
    modelClippingPolygonsStage();
    #endif

    #if defined(HAS_SILHOUETTE) && defined(HAS_NORMALS)
    silhouetteStage(color);
    #endif

    #ifdef HAS_ATMOSPHERE
    atmosphereStage(color, attributes);
    #endif

   // #ifdef HAS_POINT_CLOUD_SPLAT
        // float A = -dot(xy, xy);
        // float B = exp(A) * material.alpha;
        // // if (B < 1./255.) {
        // // discard;
        // // }
        // out_FragColor = vec4(material.diffuse * B, B);
    // Resample using conic matrix (cf. "Surface
    // Splatting" by Zwicker et al., 2001)
    vec2 d = xy - pixf;
    float power = -0.5 * (con.x * d.x * d.x + con.z * d.y * d.y) - con.y * d.x * d.y;

    // if (power > 0.) {
    //     discard;
    // }

    // (Custom) As the covariance matrix is calculated in a one-time operation on CPU in this implementation,
    // we need to apply the scale modifier differently to still allow for real-time scaling of the splats.
   // power *= 2.;

    // Eq. (2) from 3D Gaussian splatting paper.
    float alpha = min(.99f, material.alpha * exp(power));
    // if (alpha < 1./255.) {
    //     discard;
    // }

    out_FragColor = vec4(material.diffuse * alpha, alpha);
   // #endif
}
