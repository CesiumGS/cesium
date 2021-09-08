void processPoints()
{
    gl_PointSize = 4.0;
}

void geometryStage(inout Attributes attributes) 
{
    // Compute positions in different positions
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
    v_normal = czm_normal * attributes.normal;
    #endif

    #ifdef HAS_TANGENTS
    v_tangent = attributes.tangent;
        #ifdef HAS_NORMALS
        v_bitangent = attributes.bitangent;
        #endif
    #endif

    // All other varyings need to be dynamically generated in
    // GeometryPipelineStage
    setDynamicVaryings(attributes);
}
