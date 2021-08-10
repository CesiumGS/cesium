vec3 instancingStage(vec3 position) {
  
    mat4 instancingTransform;

    #ifdef HAS_INSTANCE_MATRICES

    instancingTransform = mat4(
        a_instancingTransformRow0.x, a_instancingTransformRow1.x, a_instancingTransformRow2.x, 0.0, // Column 1
        a_instancingTransformRow0.y, a_instancingTransformRow1.y, a_instancingTransformRow2.y, 0.0, // Column 2
        a_instancingTransformRow0.z, a_instancingTransformRow1.z, a_instancingTransformRow2.z, 0.0, // Column 3
        a_instancingTransformRow0.w, a_instancingTransformRow1.w, a_instancingTransformRow2.w, 1.0  // Column 4
    );

    #else
    
    vec3 translation = vec3(0.0, 0.0, 0.0);
    vec3 scale = vec3(1.0, 1.0, 1.0);

        #ifdef HAS_INSTANCE_TRANSLATION
        translation = a_instanceTranslation;
        #endif

        #ifdef HAS_INSTANCE_SCALE
        scale = a_instanceScale;
        #endif

    instancingTransform = mat4(
        scale.x, 0.0, 0.0, 0.0,
        0.0, scale.y, 0.0, 0.0,
        0.0, 0.0, scale.z, 0.0,
        translation.x, translation.y, translation.z, 1.0
    ); 
    
    #endif

    return (instancingTransform * vec4(position, 1.0)).xyz;

}