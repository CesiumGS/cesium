float pointCloudAttenuationStage(vec3 positionEC) {
  // Variables are packed into a single vector to minimize gl.uniformXXX() calls
  float pointSize = model_pointCloudAttenuation.x;
  float geometricError = model_pointCloudAttenuation.y;
  float depthMultiplier = model_pointCloudAttenuation.z;
  float depth = -positionEC.z;
  return min((geometricError / depth) * depthMultiplier, pointSize);
}
