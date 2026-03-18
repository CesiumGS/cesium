
precision highp float;

// ──────────────────────────────────────────────────────────────────────
// BENTLEY_materials_planar_fill constants
// ──────────────────────────────────────────────────────────────────────
// Depth pull factor (0.05% toward camera) for all planar fills.
// Matches edge visibility's depth comparison tolerance.
const float PLANAR_DEPTH_PULL = 0.9995;
// Depth push factor (0.02% away) for behind fills to sit behind siblings.
const float BEHIND_DEPTH_PUSH = 1.0002;
// Tolerance for comparing feature IDs stored as floats (integer equality).
const float FEATURE_ID_TOLERANCE = 0.5;
// Offset added to feature IDs so 0 means "no planar fill" in the texture.
const float FEATURE_ID_OFFSET = 1.0;

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
    #if defined(PRIMITIVE_TYPE_POINTS) && defined(HAS_POINT_DIAMETER)
    // Render points as circles
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    if (distanceToCenter > 0.5) {
        discard;
    }
    #endif

    #ifdef HAS_POINT_CLOUD_SHOW_STYLE
        if (v_pointCloudShow == 0.0)
        {
            discard;
        }
    #endif

    #ifdef HAS_MODEL_SPLITTER
    modelSplitterStage();
    #endif

    czm_modelMaterial material = defaultModelMaterial();

    ProcessedAttributes attributes;
    geometryStage(attributes);

    FeatureIds featureIds;
    featureIdStage(featureIds, attributes);

    // ──────────────────────────────────────────────────────────────────────
    // BENTLEY_materials_planar_fill: Feature-ID pre-pass output.
    //
    // When HAS_PLANAR_FILL_ID_PASS is defined this command is being rendered
    // into the planar fill ID framebuffer.  Non-behind planar geometry writes
    // its feature ID + 1 into the R channel (0 = no feature) and returns.
    // No material / lighting / post-process stages are needed.
    // ──────────────────────────────────────────────────────────────────────
    #ifdef HAS_PLANAR_FILL_ID_PASS
    if (u_isPlanarFillIdPass) {
        float fid = float(featureIds.PLANAR_FILL_FEATURE_ID) + FEATURE_ID_OFFSET;
        out_FragColor = vec4(fid, 0.0, 0.0, 1.0);
        // Still need to write log depth so the depth buffer is correct.
        #ifdef LOG_DEPTH
        czm_writeLogDepth();
        #endif
        return;
    }
    #endif

    Metadata metadata;
    MetadataClass metadataClass;
    MetadataStatistics metadataStatistics;
    metadataStage(featureIds, metadata, metadataClass, metadataStatistics, attributes);

    //========================================================================
    // When not picking metadata START
    #ifndef METADATA_PICKING_ENABLED

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

    // When not picking metadata END
    //========================================================================
    #else
    //========================================================================
    // When picking metadata START

    vec4 metadataValues = vec4(0.0, 0.0, 0.0, 0.0);
    metadataPickingStage(metadata, metadataClass, metadataValues);
    vec4 color = metadataValues;

    #endif
    // When picking metadata END
    //========================================================================

    #ifdef HAS_CLIPPING_PLANES
    modelClippingPlanesStage(color);
    #endif

    #ifdef ENABLE_CLIPPING_POLYGONS
    modelClippingPolygonsStage();
    #endif

    //========================================================================
    // When not picking metadata START
    #ifndef METADATA_PICKING_ENABLED

    #if defined(HAS_SILHOUETTE) && defined(HAS_NORMALS)
    silhouetteStage(color);
    #endif

    #ifdef HAS_ATMOSPHERE
    atmosphereStage(color, attributes);
    #endif

    #ifdef HAS_EDGE_VISIBILITY
    edgeVisibilityStage(color, featureIds);
    edgeDetectionStage(color, featureIds);
    #endif

    #endif
    // When not picking metadata END
    //========================================================================

    out_FragColor = color;

    // ──────────────────────────────────────────────────────────────────────
    // Explicit log-depth write.
    //
    // DerivedCommand.getLogDepthShaderProgram auto-wraps only when the raw
    // source does NOT already mention czm_writeLogDepth.  We mention it
    // above in the HAS_PLANAR_FILL_ID_PASS block, so we must also handle
    // the normal code path ourselves.  The LOG_DEPTH define is injected by
    // that same auto-wrapper, so this block is active exactly when needed.
    // ──────────────────────────────────────────────────────────────────────
    #ifdef LOG_DEPTH
    czm_writeLogDepth();
    #endif

    // ──────────────────────────────────────────────────────────────────────
    // BENTLEY_materials_planar_fill: Proportional depth adjustment.
    //
    // Per the spec, planar primitives must render in front of non-planar
    // geometry. We use proportional depth scaling (similar to edge visibility)
    // which scales naturally with logarithmic depth at all viewing distances.
    //
    // ──────────────────────────────────────────────────────────────────────
    #ifdef HAS_PLANAR_FILL_DEPTH
    gl_FragDepth *= PLANAR_DEPTH_PULL;
    #endif

    // ──────────────────────────────────────────────────────────────────────
    // BENTLEY_materials_planar_fill: Behind fill depth adjustment.
    //
    // After the proportional depth pull has been applied, sample the planar
    // fill ID texture. If the pixel already belongs to the same feature,
    // apply a small proportional push so this "behind" fill sits behind its
    // non-behind sibling. If the pixel has no stored feature, the base pull
    // still keeps us in front of non-planar geometry.
    //
    // ──────────────────────────────────────────────────────────────────────
    #ifdef HAS_PLANAR_FILL_BEHIND
    {
        vec2 screenCoord = gl_FragCoord.xy / czm_viewport.zw;
        float storedEncoded = texture(czm_planarFillIdTexture, screenCoord).r;
        float storedFeatureId = storedEncoded - FEATURE_ID_OFFSET;
        float myFeatureId = float(featureIds.PLANAR_FILL_FEATURE_ID);

        // storedFeatureId < 0 means "no planar fill at this pixel".
        if (storedFeatureId >= 0.0 && abs(storedFeatureId - myFeatureId) < FEATURE_ID_TOLERANCE) {
            // Proportional push: multiply by >1 to move away from camera.
            // Net effect: PLANAR_DEPTH_PULL * BEHIND_DEPTH_PUSH ≈ 0.9997,
            // still in front of non-planar but behind same-feature non-behind fills.
            gl_FragDepth *= BEHIND_DEPTH_PUSH;
        }
    }
    #endif
}

