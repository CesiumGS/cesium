precision highp float;

czm_modelVertexOutput defaultVertexOutput(vec3 positionMC) {
    czm_modelVertexOutput vsOutput;
    vsOutput.positionMC = positionMC;
    vsOutput.pointSize = 1.0;
    return vsOutput;
}

void main() 
{
    // Initialize the attributes struct with all
    // attributes except quantized ones.
    ProcessedAttributes attributes;
    initializeAttributes(attributes);

    // Dequantize the quantized ones and add them to the
    // attributes struct.
    #ifdef USE_DEQUANTIZATION
    dequantizationStage(attributes);
    #endif

    #ifdef HAS_MORPH_TARGETS
    morphTargetsStage(attributes);
    #endif

    #ifdef HAS_SKINNING
    skinningStage(attributes);
    #endif

    #ifdef HAS_PRIMITIVE_OUTLINE
    primitiveOutlineStage();
    #endif

    // Compute the bitangent according to the formula in the glTF spec.
    // Normal and tangents can be affected by morphing and skinning, so
    // the bitangent should not be computed until their values are finalized.
    #ifdef HAS_BITANGENTS
    attributes.bitangentMC = normalize(cross(attributes.normalMC, attributes.tangentMC) * attributes.tangentSignMC);
    #endif

    FeatureIds featureIds;
    featureIdStage(featureIds, attributes);

    #ifdef HAS_SELECTED_FEATURE_ID
    SelectedFeature feature;
    selectedFeatureIdStage(feature, featureIds);
    cpuStylingStage(attributes.positionMC, feature);
    #endif

    #if defined(USE_2D_POSITIONS) || defined(USE_2D_INSTANCING)
    // The scene mode 2D pipeline stage and instancing stage add a different
    // model view matrix to accurately project the model to 2D. However, the
    // output positions and normals should be transformed by the 3D matrices
    // to keep the data the same for the fragment shader.
    mat4 modelView = czm_modelView3D;
    mat3 normal = czm_normal3D;
    #else
    // These are used for individual model projection because they will
    // automatically change based on the scene mode.
    mat4 modelView = czm_modelView;
    mat3 normal = czm_normal;
    #endif

    // Update the position for this instance in place
    #ifdef HAS_INSTANCING

        // The legacy instance stage is used when rendering i3dm models that 
        // encode instances transforms in world space, as opposed to glTF models
        // that use EXT_mesh_gpu_instancing, where instance transforms are encoded
        // in object space.
        #ifdef USE_LEGACY_INSTANCING
        mat4 instanceModelView;
        mat3 instanceModelViewInverseTranspose;
        
        legacyInstancingStage(attributes, instanceModelView, instanceModelViewInverseTranspose);

        modelView = instanceModelView;
        normal = instanceModelViewInverseTranspose;
        #else
        instancingStage(attributes);
        #endif

        #ifdef USE_PICKING
        v_pickColor = a_pickColor;
        #endif

    #endif

    Metadata metadata;
    metadataStage(metadata, attributes);

    #ifdef HAS_CUSTOM_VERTEX_SHADER
    czm_modelVertexOutput vsOutput = defaultVertexOutput(attributes.positionMC);
    customShaderStage(vsOutput, attributes, featureIds, metadata);
    #endif

    // Compute the final position in each coordinate system needed.
    // This also sets gl_Position.
    geometryStage(attributes, modelView, normal);    

    #ifdef HAS_SILHOUETTE
    silhouetteStage(attributes);
    #endif

    #ifdef PRIMITIVE_TYPE_POINTS
        #ifdef HAS_CUSTOM_VERTEX_SHADER
        gl_PointSize = vsOutput.pointSize;
        #elif defined(USE_POINT_CLOUD_ATTENUATION)
        gl_PointSize = pointCloudAttenuationStage(v_positionEC);
        #else
        gl_PointSize = 1.0;
        #endif
    #endif
}
