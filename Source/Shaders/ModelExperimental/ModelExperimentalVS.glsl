precision highp float;

void main() 
{
    vec3 position = vec3(0.0);  

    position = processGeometry(position);

    #ifdef HAS_INSTANCING
    position = instancingStage(position);
        #ifdef USE_PICKING
        v_pickColor = a_pickColor;
        #endif
    #endif

    #ifdef USE_FEATURE_PICKING
    position = featurePickingStage(position);
    #endif
    
    #ifdef USE_CUSTOM_SHADER
    position = customShaderStage(position);
    #endif

    gl_Position = czm_modelViewProjection * vec4(position, 1.0);

    #ifdef PRIMITIVE_TYPE_POINTS
    processPoints();
    #endif
}
