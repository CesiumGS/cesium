precision highp float;

void main() 
{
    // Initialize the attributes struct with all
    // attributes except quantized ones.
    Attributes attributes;
    initializeAttributes(attributes);

    // Dequantize the quantized ones and add them to the
    // attributes struct.
    #ifdef USE_DEQUANTIZATION
    dequantizationStage(attributes);
    #endif

    // Update the position for this instance in place
    #ifdef HAS_INSTANCING
    instancingStage(attributes.positionMC);
        #ifdef USE_PICKING
        v_pickColor = a_pickColor;
        #endif
    #endif

    #ifdef USE_CUSTOM_SHADER
    customShaderStage(attributes);
    #endif

    // Compute the final position in each coordinate system needed.
    // This also sets gl_Position.
    geometryStage(attributes);    

    #ifdef PRIMITIVE_TYPE_POINTS
    processPoints();
    #endif
}
