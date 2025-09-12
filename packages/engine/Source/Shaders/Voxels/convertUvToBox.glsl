uniform mat3 u_transformDirectionViewToTile;

uniform vec3 u_boxUvToShapeUvScale;
uniform vec3 u_boxUvToShapeUvTranslate;

uniform ivec4 u_cameraTileCoordinates;
uniform vec3 u_cameraTileUv;
uniform vec3 u_cameraPositionUv;
uniform mat3 u_transformDirectionViewToLocal;

PointJacobianT convertUvToShapeSpaceDerivative(in vec3 positionUv) {
    // For BOX, UV space = shape space, so we can use positionUv as-is,
    // and the Jacobian is the identity matrix, except that a step of 1
    // only spans half the shape space [-1, 1], so the identity is scaled.
    return PointJacobianT(positionUv, mat3(0.5));
}

vec3 convertShapeToShapeUvSpace(in vec3 positionShape) {
    return positionShape * u_boxUvToShapeUvScale + u_boxUvToShapeUvTranslate;
}

PointJacobianT convertUvToShapeUvSpaceDerivative(in vec3 positionUv) {
    PointJacobianT pointJacobian = convertUvToShapeSpaceDerivative(positionUv);
    pointJacobian.point = convertShapeToShapeUvSpace(pointJacobian.point);
    return pointJacobian;
}

vec3 scaleShapeUvToShapeSpace(in vec3 shapeUv) {
    return shapeUv / u_boxUvToShapeUvScale;
}

vec3 convertECtoDeltaTile(in vec3 positionEC) {
    return u_boxUvToShapeUvScale * (u_transformDirectionViewToTile * positionEC);
}

TileAndUvCoordinate getTileAndUvCoordinate(in vec3 positionEC) {
    vec3 deltaTileCoordinate = convertECtoDeltaTile(positionEC);
    vec3 tileUvSum = u_cameraTileUv + deltaTileCoordinate;
    ivec3 tileCoordinate = u_cameraTileCoordinates.xyz + ivec3(floor(tileUvSum));
    tileCoordinate = min(max(ivec3(0), tileCoordinate), ivec3((1 << u_cameraTileCoordinates.w) - 1));
    ivec3 tileCoordinateChange = tileCoordinate - u_cameraTileCoordinates.xyz;
    vec3 tileUv = clamp(tileUvSum - vec3(tileCoordinateChange), 0.0, 1.0);
    return TileAndUvCoordinate(ivec4(tileCoordinate, u_cameraTileCoordinates.w), tileUv);
}