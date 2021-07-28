void processPoints() {
  gl_PointSize = 4.0;
}

// TODO: declare varyings with the shader builder

vec3 processGeometry(vec3 position) {
  
  position = a_position;

  #ifdef HAS_NORMALS
    v_normal = a_normal;
  #endif

  /*

  #ifdef HAS_NORMALS
  // TODO: Check where these matrices come from
  v_positionEC = (u_modelViewMatrix * vec4(position, 1.0)).xyz;

  // TODO: There's also some skinning code here
  v_normal = u_normalMatrix * a_normal;
  #endif

  // TODO: Clean this up -----------------------------------------
  #ifdef HAS_TANGENTS
  v_tangent.xyz = u_normalMatrix * weightedTangent.xyz;
  v_tangent.w = weightedTangent.w;
  #endif

  #ifdef HAS_TEXURE_COORDINATES
  v_texCoord_0 = a_texcoord_0;

    // TODO: Can't we just loop over tex coords?
    #ifdef HAS_TEXCOORD1
    v_texCoord_1 = a_texcoord_1;
    #endif
  #endif

  #ifdef HAS_VERTEX_COLORS
  v_vertexColor = a_vertexColor;
  #endif
  // ----------------------------------------------------------

  // TODO: what does u_modelViewMatrix mean vs czm_modelViewMatrix?
  */

  return position;
}