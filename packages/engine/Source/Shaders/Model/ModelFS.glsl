
precision highp float;

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
    #ifdef PRIMITIVE_TYPE_POINTS
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
        float fid = float(featureIds.PLANAR_FILL_FEATURE_ID) + 1.0;
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
    metadataStage(metadata, metadataClass, metadataStatistics, attributes);

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
    // BENTLEY_materials_planar_fill: Behind fill depth adjustment.
    //
    // After the log depth (and polygon offset) have been written to
    // gl_FragDepth, sample the planar fill ID texture.  If the pixel
    // already belongs to the same feature, nudge gl_FragDepth toward the
    // far plane so this "behind" fill sits behind its non-behind sibling.
    // If the pixel has no stored feature, do nothing extra — the base
    // polygon offset already pushes us in front of non-planar geometry.
    // ──────────────────────────────────────────────────────────────────────
    #ifdef HAS_PLANAR_FILL_BEHIND
    {
        vec2 screenCoord = gl_FragCoord.xy / czm_viewport.zw;
        float storedEncoded = texture(czm_planarFillIdTexture, screenCoord).r;
        float storedFeatureId = storedEncoded - 1.0;
        float myFeatureId = float(featureIds.PLANAR_FILL_FEATURE_ID);

        // storedFeatureId < 0 means "no planar fill at this pixel".
        if (storedFeatureId >= 0.0 && abs(storedFeatureId - myFeatureId) < 0.5) {
            // Both behind and non-behind fills share the same base polygon
            // offset (-1000 units toward camera).  Nudge gl_FragDepth by a
            // positive amount so this behind fill sits just behind the
            // non-behind fill of the same feature.
            gl_FragDepth += czm_epsilon7 * 600.0;
        }
    }
    #endif
}

