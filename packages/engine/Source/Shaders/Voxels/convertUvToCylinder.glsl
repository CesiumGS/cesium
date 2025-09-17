uniform vec2 u_cylinderUvToShapeUvRadius; // x = scale, y = offset
uniform vec2 u_cylinderUvToShapeUvHeight; // x = scale, y = offset
uniform vec2 u_cylinderUvToShapeUvAngle; // x = scale, y = offset
uniform float u_cylinderShapeUvAngleRangeOrigin;
uniform mat3 u_cylinderEcToRadialTangentUp;
uniform ivec4 u_cameraTileCoordinates;
uniform vec3 u_cameraTileUv;
uniform vec3 u_cameraPositionUv;
uniform mat3 u_transformDirectionViewToLocal;

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

    // TODO: 2.0 factor to restore old behavior.
    float height = positionShape.z * u_cylinderUvToShapeUvHeight.x * 2.0 + u_cylinderUvToShapeUvHeight.y;

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
    // TODO: 2.0 factor to restore old behavior
    float height = shapeUv.z / u_cylinderUvToShapeUvHeight.x / 2.0;

    return vec3(radius, angle, height);
}

/**
 * Computes the change in polar coordinates given a change in position.
 * TODO: optimize--currently 4 trig calls!
 */
vec2 computePolarChange(in vec2 dPosition, in float cameraRadialDistance) {
    float dAngle = atan(dPosition.y, cameraRadialDistance + dPosition.x);
    vec2 outputRadialAxis = vec2(cos(dAngle), sin(dAngle));
    float sinHalfAngle = sin(dAngle / 2.0);
    float versine = 2.0 * sinHalfAngle * sinHalfAngle;
    float dRadial = dot(dPosition, outputRadialAxis) - cameraRadialDistance * versine;
    return vec2(dRadial, dAngle);
}

vec3 convertECtoDeltaTile(in vec3 positionEC) {
    // 1. Rotate to radial, tangent, and up coordinates
    vec3 rtu = u_cylinderEcToRadialTangentUp * positionEC;
    // 2. Compute change in angular and radial coordinates. TODO: compute u_cameraShapePosition on CPU? Or get it from u_cameraTileCoordinates & u_cameraTileUv
    //vec2 dPolar = computePolarChange(rtu.xy, u_cameraShapePosition.x);
    float cameraRadialDistance = length(u_cameraPositionUv.xy) * 2.0;
    vec2 dPolar = computePolarChange(rtu.xy, cameraRadialDistance);
    // 3. Convert to tileset coordinates in [0, 1]
    float dx = u_cylinderUvToShapeUvRadius.x * dPolar.x;
    float dy = u_cylinderUvToShapeUvAngle.x * dPolar.y / czm_twoPi;
    // TODO: are we missing a factor of 2 somewhere? cylinderUvToShapeUvHeight is 2.0 / heightRange
    float dz = u_cylinderUvToShapeUvHeight.x * rtu.z;
    // 4. Convert to tile coordinate changes
    return vec3(dx, dy, dz) * float(1 << u_cameraTileCoordinates.w);
}

TileAndUvCoordinate getTileAndUvCoordinate(in vec3 positionEC) {
    vec3 deltaTileCoordinate = convertECtoDeltaTile(positionEC);
    vec3 tileUvSum = u_cameraTileUv + deltaTileCoordinate;
    ivec3 tileCoordinate = u_cameraTileCoordinates.xyz + ivec3(floor(tileUvSum));
    int maxTileCoordinate = (1 << u_cameraTileCoordinates.w) - 1;
    tileCoordinate.x = min(max(0, tileCoordinate.x), maxTileCoordinate);
    tileCoordinate.z = min(max(0, tileCoordinate.z), maxTileCoordinate);
    // TODO: wrapping issues! tileCoordinateChange.y could be maxTileCoordinate - 1
    // Computing this before wrapping tileCoordinate.y is a messy hack
    ivec3 tileCoordinateChange = tileCoordinate - u_cameraTileCoordinates.xyz;
    // TODO: Don't wrap if shape has a gap in angle
    if (tileCoordinate.y < 0) {
        tileCoordinate.y += (maxTileCoordinate + 1);
    } else if (tileCoordinate.y > maxTileCoordinate) {
        tileCoordinate.y -= (maxTileCoordinate + 1);
    }
    vec3 tileUv = tileUvSum - vec3(tileCoordinateChange);
    tileUv.x = clamp(tileUv.x, 0.0, 1.0);
    // TODO: Don't wrap if shape has a gap in angle
    tileUv.y = (u_cameraTileCoordinates.w == 0) ? fract(tileUv.y) : clamp(tileUv.y, 0.0, 1.0);
    tileUv.z = clamp(tileUv.z, 0.0, 1.0);
    //tileUv.x = 2.0 * length((u_transformPositionViewToUv * vec4(positionEC, 1.0)).xy) * u_cylinderUvToShapeUvRadius.x;
    return TileAndUvCoordinate(ivec4(tileCoordinate, u_cameraTileCoordinates.w), tileUv);
}