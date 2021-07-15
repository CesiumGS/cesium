#ifdef LIGHTING_PBR
vec4 lighting(vec4 color) {
  return color;
}
#else // unlit
vec4 lighting(vec4 color) {
  return color;
}
#endif