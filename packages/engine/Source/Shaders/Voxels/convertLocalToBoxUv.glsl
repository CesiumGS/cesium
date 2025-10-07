uniform vec3 u_boxLocalToShapeUvScale;
uniform vec3 u_boxLocalToShapeUvTranslate;

uniform ivec4 u_cameraTileCoordinates;
uniform vec3 u_cameraTileUv;
uniform mat3 u_boxEcToXyz;

mat3 convertLocalToShapeSpaceDerivative(in vec3 positionLocal) {
    // For BOX, local space = shape space, so the Jacobian is the identity matrix.
    return mat3(1.0);
}

vec3 scaleShapeUvToShapeSpace(in vec3 shapeUv) {
    return shapeUv / u_boxLocalToShapeUvScale;
}

vec3 convertEcToDeltaTile(in vec3 positionEC) {
    vec3 dPosition = u_boxEcToXyz * positionEC;
    return u_boxLocalToShapeUvScale * dPosition * float(1 << u_cameraTileCoordinates.w);
}

TileAndUvCoordinate getTileAndUvCoordinate(in vec3 positionEC) {
    vec3 deltaTileCoordinate = convertEcToDeltaTile(positionEC);
    vec3 tileUvSum = u_cameraTileUv + deltaTileCoordinate;
    ivec3 tileCoordinate = u_cameraTileCoordinates.xyz + ivec3(floor(tileUvSum));
    tileCoordinate = min(max(ivec3(0), tileCoordinate), ivec3((1 << u_cameraTileCoordinates.w) - 1));
    ivec3 tileCoordinateChange = tileCoordinate - u_cameraTileCoordinates.xyz;
    vec3 tileUv = clamp(tileUvSum - vec3(tileCoordinateChange), 0.0, 1.0);
    return TileAndUvCoordinate(ivec4(tileCoordinate, u_cameraTileCoordinates.w), tileUv);
}
