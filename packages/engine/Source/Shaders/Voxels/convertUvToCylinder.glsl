uniform vec2 u_cylinderUvToShapeUvRadius; // x = scale, y = offset
uniform vec2 u_cylinderUvToShapeUvHeight; // x = scale, y = offset
uniform vec2 u_cylinderUvToShapeUvAngle; // x = scale, y = offset
uniform float u_cylinderShapeUvAngleRangeOrigin;

PointJacobianT convertUvToShapeSpaceDerivative(in vec3 positionUv) {
    // Convert from Cartesian UV space [0, 1] to Cartesian local space [-1, 1]
    vec3 position = positionUv * 2.0 - 1.0;

    float radius = length(position.xy); // [0, 1]
    vec3 radial = normalize(vec3(position.xy, 0.0));

    // Shape space height is defined within [0, 1]
    float height = positionUv.z; // [0, 1]
    vec3 z = vec3(0.0, 0.0, 1.0);

    float angle = atan(position.y, position.x);
    vec3 east = normalize(vec3(-position.y, position.x, 0.0));

    vec3 point = vec3(radius, angle, height);
    mat3 jacobianT = mat3(radial, east / length(position.xy), z);
    return PointJacobianT(point, jacobianT);
}

vec3 convertShapeToShapeUvSpace(in vec3 positionShape) {
    float radius = positionShape.x * u_cylinderUvToShapeUvRadius.x + u_cylinderUvToShapeUvRadius.y;

    float rawAngle = (positionShape.y + czm_pi) / czm_twoPi;
    float angle = fract(rawAngle - u_cylinderShapeUvAngleRangeOrigin);
    angle = angle * u_cylinderUvToShapeUvAngle.x + u_cylinderUvToShapeUvAngle.y;

    float height = positionShape.z * u_cylinderUvToShapeUvHeight.x + u_cylinderUvToShapeUvHeight.y;

    return vec3(radius, angle, height);
}

PointJacobianT convertUvToShapeUvSpaceDerivative(in vec3 positionUv) {
    PointJacobianT pointJacobian = convertUvToShapeSpaceDerivative(positionUv);
    pointJacobian.point = convertShapeToShapeUvSpace(pointJacobian.point);
    return pointJacobian;
}

vec3 scaleShapeUvToShapeSpace(in vec3 shapeUv) {
    float radius = shapeUv.x / u_cylinderUvToShapeUvRadius.x;
    float angle = shapeUv.y * czm_twoPi / u_cylinderUvToShapeUvAngle.x;
    float height = shapeUv.z / u_cylinderUvToShapeUvHeight.x;

    return vec3(radius, angle, height);
}

vec3 convertECtoDeltaTile(in vec3 positionEC) {
    // TODO
    return positionEC;
}