void verticalExaggerationStage(
  inout ProcessedAttributes attributes
) {
  float eyeCenterDistance = length(czm_view[3]);
  vec3 cameraGeoCentric = eyeCenterDistance * czm_eyeEllipsoidNormalEC;
  vec3 vertexPositionEC = (czm_modelView * vec4(attributes.positionMC, 1.0)).xyz;
  vec3 vertexGeoCentric = cameraGeoCentric + vertexPositionEC;
  vec3 vertexNormal = normalize(vertexGeoCentric);

  // Compute the change in height above the ellipsoid, from camera to vertex position
  float versine = 1.0 - dot(czm_eyeEllipsoidNormalEC, vertexNormal);
  float dHeight = dot(vertexPositionEC, vertexNormal) - eyeCenterDistance * versine;
  float vertexHeight = czm_eyeHeight + dHeight;

  vec3 vertexNormalMC = (czm_inverseModelView * vec4(vertexNormal, 0.0)).xyz;
  vertexNormalMC = normalize(vertexNormalMC);

  float stretch = u_verticalExaggerationAndRelativeHeight.x;
  float shift = u_verticalExaggerationAndRelativeHeight.y;
  float exaggeration = (vertexHeight - shift) * (stretch - 1.0);
  attributes.positionMC += exaggeration * vertexNormalMC;
}
