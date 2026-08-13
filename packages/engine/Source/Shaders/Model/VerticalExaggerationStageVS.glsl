void verticalExaggerationStage(
  inout ProcessedAttributes attributes
) {
  // Compute the distance from the camera to the local center of curvature.
  vec4 vertexPositionENU = czm_modelToEnu * vec4(attributes.positionMC, 1.0);
  vec2 vertexAzimuth = normalize(vertexPositionENU.xy);
  // Curvature = 1 / radius of curvature.
  float azimuthalCurvature = dot(vertexAzimuth * vertexAzimuth, czm_eyeEllipsoidCurvature);
  float eyeToCenter = 1.0 / azimuthalCurvature + czm_eyeHeight;

  // Compute the approximate ellipsoid normal at the vertex position.
  // Uses a circular approximation for the Earth curvature along the geodesic.
  vec3 vertexPositionEC = (czm_modelView * vec4(attributes.positionMC, 1.0)).xyz;
  vec3 centerToVertex = eyeToCenter * czm_eyeEllipsoidNormalEC + vertexPositionEC;
  vec3 vertexEllipsoidNormalEC = normalize(centerToVertex);

  // Estimate the (sine of the) angle between the camera direction and the ellipsoid normal.
  float verticalDistance = dot(vertexPositionEC, czm_eyeEllipsoidNormalEC);
  float horizontalDistance = length(vertexPositionEC - verticalDistance * czm_eyeEllipsoidNormalEC);
  float sinTheta = horizontalDistance / (eyeToCenter + verticalDistance);
  bool isSmallAngle = clamp(sinTheta, 0.0, 0.05) == sinTheta;

  // Approximate the change in height above the ellipsoid, from camera to vertex position.
  float exactVersine = 1.0 - dot(czm_eyeEllipsoidNormalEC, vertexEllipsoidNormalEC);
  float smallAngleVersine = 0.5 * sinTheta * sinTheta;
  float versine = isSmallAngle ? smallAngleVersine : exactVersine;
  float dHeight = dot(vertexPositionEC, vertexEllipsoidNormalEC) - eyeToCenter * versine;
  float vertexHeight = czm_eyeHeight + dHeight;

  // Transform the approximate ellipsoid normal to model coordinates.
  vec3 exaggerationDirectionScaledMC = (czm_inverseModelView * vec4(vertexEllipsoidNormalEC, 0.0)).xyz;

  // Compute the exaggeration and apply it along the exaggeration direction in model coordinates.
  float stretch = u_verticalExaggerationAndRelativeHeight.x;
  float shift = u_verticalExaggerationAndRelativeHeight.y;
  float exaggeration = (vertexHeight - shift) * (stretch - 1.0);
  attributes.positionMC += exaggeration * exaggerationDirectionScaledMC;
}