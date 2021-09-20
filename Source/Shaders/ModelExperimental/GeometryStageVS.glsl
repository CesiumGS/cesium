void processPoints()
{
    gl_PointSize = 4.0;
}

void geometryStage(inout ProcessedAttributes attributes) 
{
    // Compute positions in different coordinate systems
    vec3 positionMC = attributes.positionMC;
    v_positionMC = positionMC;
    v_positionEC = (czm_modelView * vec4(positionMC, 1.0)).xyz;
    gl_Position = czm_modelViewProjection * vec4(positionMC, 1.0);

    // Sometimes the fragment shader needs this (e.g. custom shaders)
    #ifdef COMPUTE_POSITION_WC
    // Note that this is a 32-bit position which may result in jitter on small
    // scales.
    v_positionWC = (czm_model * vec4(positionMC, 1.0)).xyz;
    #endif

    #ifdef HAS_NORMALS
    v_normalEC = czm_normal * attributes.normalMC;
    #endif

    #ifdef HAS_TANGENTS
    v_tangentEC = normalize(czm_normal * attributes.tangentMC);    
    #endif

    #ifdef HAS_BITANGENTS
    v_bitangentEC = normalize(czm_normal * attributes.bitangentMC);
    #endif

    // All other varyings need to be dynamically generated in
    // GeometryPipelineStage
    setDynamicVaryings(attributes);
}
