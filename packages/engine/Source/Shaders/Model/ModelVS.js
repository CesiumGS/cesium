//This file is automatically rebuilt by the Cesium build process.
export default "precision highp float;\n\
\n\
czm_modelVertexOutput defaultVertexOutput(vec3 positionMC) {\n\
    czm_modelVertexOutput vsOutput;\n\
    vsOutput.positionMC = positionMC;\n\
    vsOutput.pointSize = 1.0;\n\
    return vsOutput;\n\
}\n\
\n\
void main() \n\
{\n\
    // Initialize the attributes struct with all\n\
    // attributes except quantized ones.\n\
    ProcessedAttributes attributes;\n\
    initializeAttributes(attributes);\n\
\n\
    // Dequantize the quantized ones and add them to the\n\
    // attributes struct.\n\
    #ifdef USE_DEQUANTIZATION\n\
    dequantizationStage(attributes);\n\
    #endif\n\
\n\
    #ifdef HAS_MORPH_TARGETS\n\
    morphTargetsStage(attributes);\n\
    #endif\n\
\n\
    #ifdef HAS_SKINNING\n\
    skinningStage(attributes);\n\
    #endif\n\
\n\
    #ifdef HAS_PRIMITIVE_OUTLINE\n\
    primitiveOutlineStage();\n\
    #endif\n\
\n\
    // Compute the bitangent according to the formula in the glTF spec.\n\
    // Normal and tangents can be affected by morphing and skinning, so\n\
    // the bitangent should not be computed until their values are finalized.\n\
    #ifdef HAS_BITANGENTS\n\
    attributes.bitangentMC = normalize(cross(attributes.normalMC, attributes.tangentMC) * attributes.tangentSignMC);\n\
    #endif\n\
\n\
    FeatureIds featureIds;\n\
    featureIdStage(featureIds, attributes);\n\
\n\
    #ifdef HAS_SELECTED_FEATURE_ID\n\
    SelectedFeature feature;\n\
    selectedFeatureIdStage(feature, featureIds);\n\
    // Handle any show properties that come from the style.\n\
    cpuStylingStage(attributes.positionMC, feature);\n\
    #endif\n\
\n\
    #if defined(USE_2D_POSITIONS) || defined(USE_2D_INSTANCING)\n\
    // The scene mode 2D pipeline stage and instancing stage add a different\n\
    // model view matrix to accurately project the model to 2D. However, the\n\
    // output positions and normals should be transformed by the 3D matrices\n\
    // to keep the data the same for the fragment shader.\n\
    mat4 modelView = czm_modelView3D;\n\
    mat3 normal = czm_normal3D;\n\
    #else\n\
    // These are used for individual model projection because they will\n\
    // automatically change based on the scene mode.\n\
    mat4 modelView = czm_modelView;\n\
    mat3 normal = czm_normal;\n\
    #endif\n\
\n\
    // Update the position for this instance in place\n\
    #ifdef HAS_INSTANCING\n\
\n\
        // The legacy instance stage is used when rendering i3dm models that \n\
        // encode instances transforms in world space, as opposed to glTF models\n\
        // that use EXT_mesh_gpu_instancing, where instance transforms are encoded\n\
        // in object space.\n\
        #ifdef USE_LEGACY_INSTANCING\n\
        mat4 instanceModelView;\n\
        mat3 instanceModelViewInverseTranspose;\n\
        \n\
        legacyInstancingStage(attributes, instanceModelView, instanceModelViewInverseTranspose);\n\
\n\
        modelView = instanceModelView;\n\
        normal = instanceModelViewInverseTranspose;\n\
        #else\n\
        instancingStage(attributes);\n\
        #endif\n\
\n\
        #ifdef USE_PICKING\n\
        v_pickColor = a_pickColor;\n\
        #endif\n\
\n\
    #endif\n\
\n\
    Metadata metadata;\n\
    MetadataClass metadataClass;\n\
    MetadataStatistics metadataStatistics;\n\
    metadataStage(metadata, metadataClass, metadataStatistics, attributes);\n\
\n\
    #ifdef HAS_CUSTOM_VERTEX_SHADER\n\
    czm_modelVertexOutput vsOutput = defaultVertexOutput(attributes.positionMC);\n\
    customShaderStage(vsOutput, attributes, featureIds, metadata, metadataClass, metadataStatistics);\n\
    #endif\n\
\n\
    // Compute the final position in each coordinate system needed.\n\
    // This returns the value that will be assigned to gl_Position.\n\
    vec4 positionClip = geometryStage(attributes, modelView, normal);    \n\
\n\
    #ifdef HAS_SILHOUETTE\n\
    silhouetteStage(attributes, positionClip);\n\
    #endif\n\
\n\
    #ifdef HAS_POINT_CLOUD_SHOW_STYLE\n\
    float show = pointCloudShowStylingStage(attributes, metadata);\n\
    #else\n\
    float show = 1.0;\n\
    #endif\n\
\n\
    #ifdef HAS_POINT_CLOUD_BACK_FACE_CULLING\n\
    show *= pointCloudBackFaceCullingStage();\n\
    #endif\n\
\n\
    #ifdef HAS_POINT_CLOUD_COLOR_STYLE\n\
    v_pointCloudColor = pointCloudColorStylingStage(attributes, metadata);\n\
    #endif\n\
\n\
    #ifdef PRIMITIVE_TYPE_POINTS\n\
        #ifdef HAS_CUSTOM_VERTEX_SHADER\n\
        gl_PointSize = vsOutput.pointSize;\n\
        #elif defined(HAS_POINT_CLOUD_POINT_SIZE_STYLE) || defined(HAS_POINT_CLOUD_ATTENUATION)\n\
        gl_PointSize = pointCloudPointSizeStylingStage(attributes, metadata);\n\
        #else\n\
        gl_PointSize = 1.0;\n\
        #endif\n\
\n\
        gl_PointSize *= show;\n\
    #endif\n\
\n\
    gl_Position = show * positionClip;\n\
}\n\
";
