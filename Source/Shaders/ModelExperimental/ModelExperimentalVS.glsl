precision highp float;

void main() 
{
    // Initialize the attributes struct with all
    // attributes except quantized ones.
    Attributes attributes;
    initializeAttributes(attributes);

    // Dequantize the quantized ones and add them to the
    // attributes struct.
    #ifdef USE_QUANTIZATION
    dequantizeAttributes(attributes);
    #endif

    // Update the position for this instance in place
    #ifdef HAS_INSTANCING
    instancingStage(attributes.positionMC);
        #ifdef USE_PICKING
        v_pickColor = a_pickColor;
        #endif
    #endif

    // Let the user decide what to do
    #ifdef USE_CUSTOM_SHADER
    customShaderStage(position, attributes);
    #endif

    // Compute the final position in each coordinate system needed
    geometryStage(attributes);

    gl_Position = czm_modelViewProjection * vec4(attributes.positionMC, 1.0);

    #ifdef PRIMITIVE_TYPE_POINTS
    processPoints();
    #endif
}
