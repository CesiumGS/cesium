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


    #if defined(HAS_FEATURES) && defined(FEATURE_ID_ATTRIBUTE)
    Feature feature;
    featureStage(feature);
    cpuStylingStage(attributes.positionMC, feature);
    updateFeatureStruct(feature);
    #endif

    mat4 modelView = czm_modelView;
    mat3 normal = czm_normal;

    // Update the position for this instance in place
    #ifdef HAS_INSTANCING

        // The legacy instance stage  is used when rendering I3DM models that 
        // encode instances transforms in world space, as opposed to glTF models
        // that use EXT_mesh_gpu_instancing, where instance transforms are encoded
        // in object space.
        #ifdef USE_LEGACY_INSTANCING
        mat4 instanceModelView;
        mat3 instanceModelViewInverseTranspose;
        
        legacyInstancingStage(attributes.positionMC, instanceModelView, instanceModelViewInverseTranspose);

        modelView = instanceModelView;
        normal = instanceModelViewInverseTranspose;
        #else
        instancingStage(attributes.positionMC);
        #endif

        #ifdef USE_PICKING
        v_pickColor = a_pickColor;
        #endif

    #endif

    #ifdef HAS_CUSTOM_VERTEX_SHADER
    czm_modelVertexOutput vsOutput = defaultVertexOutput(attributes.positionMC);
    customShaderStage(vsOutput, attributes);
    #endif

    // Compute the final position in each coordinate system needed.
    // This also sets gl_Position.
    geometryStage(attributes, modelView, normal);    

    #ifdef PRIMITIVE_TYPE_POINTS
        #ifdef HAS_CUSTOM_VERTEX_SHADER
        gl_PointSize = vsOutput.pointSize;
        #else
        gl_PointSize = 1.0;
        #endif
    #endif
}
