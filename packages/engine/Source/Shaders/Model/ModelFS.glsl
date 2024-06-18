
precision highp float;

in vec4 v_position;
in float v_anisotropy;
in vec2 vEigenVector1;
in vec2 vEigenVector2;
in float vEigenValue1;
in float vEigenValue2;
in mat2 vCovarianceMatrix;

in vec2 v_cov2d;

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

    #ifdef HAS_POINT_CLOUD_SPLAT
    // vec2 pos = gl_PointCoord * 2.0 - 1.0;

    //  // Calculate the Mahalanobis distance using the covariance matrix
    // float mahalanobisDistance = dot(pos, vCovarianceMatrix * pos);

    // // Discard fragments outside the ellipse
    // if (mahalanobisDistance > 1.0) {
    //     discard;
    // }

    // // Calculate the Gaussian falloff based on the Mahalanobis distance
    // float gaussianFalloff = exp(-0.5 * mahalanobisDistance);


    vec2 coord = gl_PointCoord;

    // Calculate the inverse of the covariance matrix
    float det = v_cov2d.x * v_cov2d.y;
    float invDet = 1.0 / det;
    mat2 invCov = mat2(
        v_cov2d.y * invDet, 0.0,
        0.0, v_cov2d.x * invDet
    );

    // Transform the coordinates using the inverse covariance matrix
    vec2 transformedCoord = invCov * (coord - 0.5);

    // Calculate the Mahalanobis distance
    float mahalanobisDist = dot(transformedCoord, transformedCoord);

    // Perform Gaussian falloff
    float gaussian = exp(-0.5 * mahalanobisDist);

    // Discard fragments outside the splat radius
    if (mahalanobisDist > 1.0) {
        discard;
    }
    // Apply the Gaussian falloff and alpha to the color
    out_FragColor = vec4(material.diffuse * gaussian, material.alpha * gaussian);
    #endif
}

