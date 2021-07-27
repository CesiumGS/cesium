void processPoints() {
  gl_PointSize = 4.0;
}

void main() {
  vec3 position = a_position;

  #ifdef PRIMITIVE_TYPE_POINTS
  processPoints();
  #endif

  gl_Position = czm_modelViewProjection * vec4(position, 1.0);
}