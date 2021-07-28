precision highp float;

void main() {
  vec3 position = vec3(0.0);  
  position = processGeometry(position);

  // TODO: skinning stage
  // TODO: morph targets stage

  gl_Position = czm_modelViewProjection * vec4(position, 1.0);


  // handle gl_PointSize
  #ifdef PRIMITIVE_TYPE_POINTS
  processPoints();
  #endif
}