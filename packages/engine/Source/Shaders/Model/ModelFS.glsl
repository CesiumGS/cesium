
precision highp float;


in float depth;
in vec3 con;
in vec2 xy;
in vec2 pixf;
in vec4 v_position;
in vec3 v_cov2d;

in vec2 v_eigen1;
in vec2 v_eigen2;
in float v_lambda1;
in float v_lambda2;

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

    // Resample using conic matrix (cf. "Surface
    // Splatting" by Zwicker et al., 2001)
    vec2 d = xy - pixf;
    float power = -0.5 * (con.x * d.x * d.x + con.z * d.y * d.y) - con.y * d.x * d.y;

    if (power > 0.) {
        discard;
    }

    // (Custom) As the covariance matrix is calculated in a one-time operation on CPU in this implementation,
    // we need to apply the scale modifier differently to still allow for real-time scaling of the splats.
    //power *= scale_modif;

    // Eq. (2) from 3D Gaussian splatting paper.
    float alpha = min(.99f, material.alpha * exp(power));

    // (Custom) Colorize with depth value instead of color (z-buffer visualization)
    vec3 clr = material.diffuse;

    if (alpha < 1./255.) {
        discard;
    }

    // Eq. (3) from 3D Gaussian splatting paper.
    out_FragColor = vec4(clr * alpha, alpha);

//     // Rescale gl_PointCoord from [0,1] to [-1,1]
//     vec2 p = gl_PointCoord * 2.0 - 1.0;


//     // Transform the fragment coordinates by the eigenvectors
//     vec2 pTransformed = vec2(dot(p, v_eigen1), dot(p, v_eigen2));

//     // Compute the Mahalanobis distance in the transformed space
//     float m = (pTransformed.x * pTransformed.x) / max(v_lambda1, 1e-5) +
//             (pTransformed.y * pTransformed.y) / max(v_lambda2, 1e-5);

//     // Discard fragments outside the ellipse
//    if (m > 9.0) {  // Discard fragments outside 3 standard deviations
//        discard;
//    }

//     // Gaussian function
//     float gaussian = exp(-5.0 * m);

//     // Discard fragments far from center
//    if (gaussian < 0.001) {
//        discard;
//    }

//     // Output color (you may want to make this an attribute or uniform)
//     out_FragColor = vec4(material.diffuse * gaussian, gaussian);
    #endif
}

