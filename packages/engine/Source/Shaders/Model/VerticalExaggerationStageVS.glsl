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
  vec3 vertexNormal = normalize(centerToVertex);

  // Estimate the (sine of the) angle between the camera direction and the vertex normal
  float verticalDistance = dot(vertexPositionEC, czm_eyeEllipsoidNormalEC);
  float horizontalDistance = length(vertexPositionEC - verticalDistance * czm_eyeEllipsoidNormalEC);
  float sinTheta = horizontalDistance / (eyeToCenter + verticalDistance);
  bool isSmallAngle = clamp(sinTheta, 0.0, 0.05) == sinTheta;

  // Approximate the change in height above the ellipsoid, from camera to vertex position.
  float exactVersine = 1.0 - dot(czm_eyeEllipsoidNormalEC, vertexNormal);
  float smallAngleVersine = 0.5 * sinTheta * sinTheta;
  float versine = isSmallAngle ? smallAngleVersine : exactVersine;
  float dHeight = dot(vertexPositionEC, vertexNormal) - eyeToCenter * versine;
  float vertexHeight = czm_eyeHeight + dHeight;

  // Transform the approximate vertex normal to model coordinates.
  vec3 vertexNormalMC = (czm_inverseModelView * vec4(vertexNormal, 0.0)).xyz;
  vertexNormalMC = normalize(vertexNormalMC);

  // Compute the exaggeration and apply it along the approximate vertex normal.
  float stretch = u_verticalExaggerationAndRelativeHeight.x;
  float shift = u_verticalExaggerationAndRelativeHeight.y;
  float exaggeration = (vertexHeight - shift) * (stretch - 1.0);
  attributes.positionMC += exaggeration * vertexNormalMC;
}
