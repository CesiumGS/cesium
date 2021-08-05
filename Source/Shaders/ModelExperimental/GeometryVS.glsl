void processPoints()
{
    gl_PointSize = 4.0;
}

vec3 processGeometry(vec3 position) 
{  
    position = a_position;
    v_positionEC = (czm_modelView * vec4(position, 1.0)).xyz;

    #ifdef HAS_NORMALS
    v_normal = czm_normal * a_normal;
    #endif

    #ifdef HAS_TANGENTS
    v_tangent.xyz = czm_normal * a_tangent.xyz;
    v_tangent.w = a_tangent.w;
    #endif

    #ifdef HAS_TEXCOORD_0
    v_texCoord_0 = a_texCoord_0;
    #endif

    #ifdef HAS_TEXCOORD_1
    v_texCoord_1 = a_texCoord_1;
    #endif

    #ifdef HAS_VERTEX_COLORS
    v_color = a_color;
    #endif

    return position;
}