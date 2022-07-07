void geometryStage(inout ProcessedAttributes attributes, mat4 modelView, mat3 normal) 
{
    // Compute positions in different coordinate systems
    vec3 positionMC = attributes.positionMC;
    v_positionMC = positionMC;
    v_positionEC = (modelView * vec4(positionMC, 1.0)).xyz;

    #if defined(USE_2D_POSITIONS) || defined(USE_2D_INSTANCING)
    vec3 position2D = attributes.position2D;
    vec3 positionEC = (u_modelView2D * vec4(position2D, 1.0)).xyz;
    gl_Position = czm_projection * vec4(positionEC, 1.0);
    #else
    gl_Position = czm_projection * vec4(v_positionEC, 1.0);
    #endif

    // Sometimes the fragment shader needs this (e.g. custom shaders)
    #ifdef COMPUTE_POSITION_WC
    // Note that this is a 32-bit position which may result in jitter on small
    // scales.
    v_positionWC = (czm_model * vec4(positionMC, 1.0)).xyz;
    #endif

    #ifdef HAS_NORMALS
    v_normalEC = normal * attributes.normalMC;
    #endif

    #ifdef HAS_TANGENTS
    v_tangentEC = normalize(normal * attributes.tangentMC);    
    #endif

    #ifdef HAS_BITANGENTS
    v_bitangentEC = normalize(normal * attributes.bitangentMC);
    #endif

    // All other varyings need to be dynamically generated in
    // GeometryPipelineStage
    setDynamicVaryings(attributes);
}
