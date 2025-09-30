uniform vec2 u_cylinderLocalToShapeUvRadius; // x = scale, y = offset
uniform vec2 u_cylinderLocalToShapeUvHeight; // x = scale, y = offset
uniform vec2 u_cylinderLocalToShapeUvAngle; // x = scale, y = offset
uniform float u_cylinderShapeUvAngleRangeOrigin;
uniform mat3 u_cylinderEcToRadialTangentUp;
uniform ivec4 u_cameraTileCoordinates;
uniform vec3 u_cameraTileUv;
uniform vec3 u_cameraShapePosition; // (radial distance, angle, height) of camera in shape space
uniform mat3 u_transformDirectionViewToLocal;

PointJacobianT convertLocalToShapeSpaceDerivative(in vec3 position) {
    float radius = length(position.xy); // [0, 1]
    vec3 radial = normalize(vec3(position.xy, 0.0));

    // Shape space height is defined within [0, 1]
    float height = position.z; // [0, 1]
    vec3 z = vec3(0.0, 0.0, 1.0);

    float angle = atan(position.y, position.x);
    vec3 east = normalize(vec3(-position.y, position.x, 0.0));

    vec3 point = vec3(radius, angle, height);
    mat3 jacobianT = mat3(radial, east / length(position.xy), z);
    return PointJacobianT(point, jacobianT);
}

vec3 convertShapeToShapeUvSpace(in vec3 positionShape) {
    float radius = positionShape.x * u_cylinderLocalToShapeUvRadius.x + u_cylinderLocalToShapeUvRadius.y;

    float rawAngle = (positionShape.y + czm_pi) / czm_twoPi;
    float angle = fract(rawAngle - u_cylinderShapeUvAngleRangeOrigin);
    angle = angle * u_cylinderLocalToShapeUvAngle.x + u_cylinderLocalToShapeUvAngle.y;

    float height = positionShape.z * u_cylinderLocalToShapeUvHeight.x + u_cylinderLocalToShapeUvHeight.y;

    return vec3(radius, angle, height);
}

PointJacobianT convertLocalToShapeUvSpaceDerivative(in vec3 positionLocal) {
    PointJacobianT pointJacobian = convertLocalToShapeSpaceDerivative(positionLocal);
    pointJacobian.point = convertShapeToShapeUvSpace(pointJacobian.point);
    return pointJacobian;
}

vec3 scaleShapeUvToShapeSpace(in vec3 shapeUv) {
    float radius = shapeUv.x / u_cylinderLocalToShapeUvRadius.x;
    float angle = shapeUv.y * czm_twoPi / u_cylinderLocalToShapeUvAngle.x;
    float height = shapeUv.z / u_cylinderLocalToShapeUvHeight.x;

    return vec3(radius, angle, height);
}

/**
 * Computes the change in polar coordinates given a change in position.
 * @param dPosition The change in position in Cartesian coordinates.
 * @param cameraRadialDistance The radial distance of the camera from the origin.
 * @return The change in polar coordinates (radial distance, angle).
 * TODO: optimize--currently 4 trig calls!
 */
vec2 computePolarChange(in vec2 dPosition, in float cameraRadialDistance) {
    float dAngle = atan(dPosition.y, cameraRadialDistance + dPosition.x);
    // Find the direction of the radial axis at the output angle, in Cartesian coordinates
    vec2 outputRadialAxis = vec2(cos(dAngle), sin(dAngle));
    float sinHalfAngle = sin(dAngle / 2.0);
    float versine = 2.0 * sinHalfAngle * sinHalfAngle;
    float dRadial = dot(dPosition, outputRadialAxis) - cameraRadialDistance * versine;
    return vec2(dRadial, dAngle);
}

vec3 convertEcToDeltaShape(in vec3 positionEC) {
    // 1. Rotate to radial, tangent, and up coordinates
    vec3 rtu = u_cylinderEcToRadialTangentUp * positionEC;
    // 2. Compute change in angular and radial coordinates. TODO: compute u_cameraShapePosition on CPU? Or get it from u_cameraTileCoordinates & u_cameraTileUv
    vec2 dPolar = computePolarChange(rtu.xy, u_cameraShapePosition.x);
    return vec3(dPolar.x, dPolar.y, rtu.z);
}

vec3 convertECtoDeltaTile(in vec3 positionEC) {
    vec3 deltaShape = convertEcToDeltaShape(positionEC);
    // Convert to tileset coordinates in [0, 1]
    float dx = u_cylinderLocalToShapeUvRadius.x * deltaShape.x;
    float dy = deltaShape.y / czm_twoPi;
    int maxTileCoordinate = (1 << u_cameraTileCoordinates.w) - 1;
    if (u_cameraTileCoordinates.y < 0 && dy < 0.0) {
        dy += 1.0;
    } else if (u_cameraTileCoordinates.y > maxTileCoordinate && dy > 0.0) {
        dy -= 1.0;
    }
    dy *= u_cylinderLocalToShapeUvAngle.x;
    float dz = u_cylinderLocalToShapeUvHeight.x * deltaShape.z;
    // Convert to tile coordinate changes
    return vec3(dx, dy, dz) * float(1 << u_cameraTileCoordinates.w);
}

TileAndUvCoordinate getTileAndUvCoordinate(in vec3 positionEC) {
    vec3 deltaTileCoordinate = convertECtoDeltaTile(positionEC);
    vec3 tileUvSum = u_cameraTileUv + deltaTileCoordinate;
    ivec3 tileCoordinate = u_cameraTileCoordinates.xyz + ivec3(floor(tileUvSum));
    int maxTileCoordinate = (1 << u_cameraTileCoordinates.w) - 1;
    tileCoordinate.x = min(max(0, tileCoordinate.x), maxTileCoordinate);
    tileCoordinate.z = min(max(0, tileCoordinate.z), maxTileCoordinate);
#if (!defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE))
    ivec3 tileCoordinateChange = tileCoordinate - u_cameraTileCoordinates.xyz;
    if (tileCoordinate.y < 0) {
        tileCoordinate.y += (maxTileCoordinate + 1);
    } else if (tileCoordinate.y > maxTileCoordinate) {
        tileCoordinate.y -= (maxTileCoordinate + 1);
    }
#else
    tileCoordinate.y = min(max(0, tileCoordinate.y), maxTileCoordinate);
    ivec3 tileCoordinateChange = tileCoordinate - u_cameraTileCoordinates.xyz;
#endif
    vec3 tileUv = tileUvSum - vec3(tileCoordinateChange);
    tileUv.x = clamp(tileUv.x, 0.0, 1.0);
#if (!defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE))
    // If there is only one tile spanning 2*PI angle, the coordinate wraps around
    tileUv.y = (u_cameraTileCoordinates.w == 0) ? fract(tileUv.y) : clamp(tileUv.y, 0.0, 1.0);
#else
    tileUv.y = clamp(tileUv.y, 0.0, 1.0);
#endif
    tileUv.z = clamp(tileUv.z, 0.0, 1.0);
    return TileAndUvCoordinate(ivec4(tileCoordinate, u_cameraTileCoordinates.w), tileUv);
    //return TileAndUvCoordinate(ivec4(tileCoordinate, u_cameraTileCoordinates.w), deltaTileCoordinate);
}