precision highp float;

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
    
    #ifdef HAS_CUSTOM_VERTEX_SHADER
    customShaderStage(attributes);
    #endif

    // Update the position for this instance in place
    #ifdef HAS_INSTANCING
    
        #ifdef USE_LEGACY_INSTANCING
        legacyInstancingStage();
        #else
        instancingStage(attributes.positionMC);
        #endif

        #ifdef USE_PICKING
        v_pickColor = a_pickColor;
        #endif
        
    #endif

    // Compute the final position in each coordinate system needed.
    // This also sets gl_Position.
    geometryStage(attributes);    

    #ifdef PRIMITIVE_TYPE_POINTS
    pointStage();
    #endif
}
