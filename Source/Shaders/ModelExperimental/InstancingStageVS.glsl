vec3 instancingStage(vec3 position) {
  
  mat4 instancingTransform;

  #ifdef HAS_INSTANCE_MATRICES

  instancingTransform = mat4(
    instancingTransformRow0.x, instancingTransformRow1.x, instancingTransformRow2.x, 0.0, // Column 1
    instancingTransformRow0.y, instancingTransformRow1.y, instancingTransformRow2.y, 0.0, // Column 2
    instancingTransformRow0.z, instancingTransformRow1.z, instancingTransformRow2.z, 0.0, // Column 3
    0.0, 0.0, 0.0, 1.0                                                                    // Column 4
  );

  #else
  vec3 translation = vec3(0.0, 0.0, 0.0);
  vec3 scale = vec3(1.0, 1.0, 1.0);

    #ifdef HAS_INSTANCE_TRANSLATION
      translation = instanceTranslation;
    #endif

    #ifdef HAS_INSTANCE_SCALE
      scale = instanceScale;
    #endif

  instancingTransform = mat4(
    scale.x, 0.0, 0.0, 0.0,
    0.0, scale.y, 0.0, 0.0,
    0.0, 0.0, scale.z, 0.0,
    translation.x, translation.y, translation.z, 1.0
  ); 
  
  #endif

  return (instancingTransform * vec4(position, 1.0)).xyz;
};