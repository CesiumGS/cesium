void processPoints()
{
    gl_PointSize = 4.0;
}

vec3 processGeometry(vec3 position) 
{  
    position = a_position;
    v_position = position;
    v_positionEC = (czm_modelView * vec4(position, 1.0)).xyz;

    #ifdef HAS_NORMALS
    v_normal = czm_normal * a_normal;
    #endif

    #ifdef HAS_TANGENTS
    v_tangent.xyz = czm_normal * a_tangent.xyz;
    v_tangent.w = a_tangent.w;
    #endif

    // This function is defined in GeometryPipelineStage
    #ifdef HAS_SET_INDEXED_ATTRIBUTES
    initializeSetIndexedAttributes();
    #endif

    // This function is defined in GeometryPipelineStage
    #ifdef HAS_CUSTOM_ATTRIBUTES
    initializeCustomAttributes();
    #endif

    return position;
}
