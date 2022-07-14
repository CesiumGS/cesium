float getPointSizeFromAttenuation(vec3 positionEC) {
  // Variables are packed into a single vector to minimize gl.uniformXXX() calls
  float pointSize = model_pointCloudAttenuation.x;
  float geometricError = model_pointCloudAttenuation.z;
  float depthMultiplier = model_pointCloudAttenuation.w;

  float depth = -positionEC.z;
  return min((geometricError / depth) * depthMultiplier, pointSize);
}


#ifdef HAS_POINT_CLOUD_SHOW_STYLE
float pointCloudShowStylingStage(in ProcessedAttributes attributes) {
  // This variable may be used by the styling functions.
  //float u_time = model_pointCloudAttenuation.y;
  return float(getShowFromStyle(attributes));
}
#endif

#if defined(HAS_POINT_CLOUD_POINT_SIZE_STYLE) || defined(HAS_POINT_CLOUD_ATTENUATION)
float pointCloudPointSizeStylingStage(in ProcessedAttributes attributes) {
  #ifdef HAS_POINT_CLOUD_POINT_SIZE_STYLE
  return float(getPointSizeFromStyle(attributes));
  #elif HAS_POINT_CLOUD_ATTENUATION
  return getPointSizeFromAttenuation(v_positionEC);
  #endif
}
#endif

