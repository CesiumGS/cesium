float getPointSizeFromAttenuation(vec3 positionEC) {
  // Variables are packed into a single vector to minimize gl.uniformXXX() calls
  float pointSize = model_pointCloudParameters.x;
  float geometricError = model_pointCloudParameters.y;
  float depthMultiplier = model_pointCloudParameters.z;

  float depth = -positionEC.z;
  return min((geometricError / depth) * depthMultiplier, pointSize);
}

#ifdef HAS_POINT_CLOUD_SHOW_STYLE
float pointCloudShowStylingStage(in ProcessedAttributes attributes) {
  return float(getShowFromStyle(attributes));
}
#endif

#ifdef HAS_POINT_CLOUD_COLOR_STYLE
vec4 pointCloudColorStylingStage(in ProcessedAttributes attributes) {
  return getColorFromStyle(attributes);
}
#endif

#ifdef HAS_POINT_CLOUD_POINT_SIZE_STYLE
float pointCloudPointSizeStylingStage(in ProcessedAttributes attributes) {
  return float(getPointSizeFromStyle(attributes));
}
#elif defined(HAS_POINT_CLOUD_ATTENUATION)
float pointCloudPointSizeStylingStage(in ProcessedAttributes attributes) {
  return getPointSizeFromAttenuation(v_positionEC);
}
#endif