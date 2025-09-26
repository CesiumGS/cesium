/* Ellipsoid defines (set in Scene/VoxelEllipsoidShape.js)
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE
*/

uniform vec3 u_cameraPositionCartographic; // (longitude, latitude, height) in radians and meters
uniform vec2 u_ellipsoidCurvatureAtLatitude;
uniform mat3 u_ellipsoidEcToEastNorthUp;
uniform vec3 u_ellipsoidRadii;
uniform vec2 u_evoluteScale; // (radii.x ^ 2 - radii.z ^ 2) * vec2(1.0, -1.0) / radii;
uniform vec3 u_ellipsoidInverseRadiiSquared;
#if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY) || defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED)
    uniform vec3 u_ellipsoidShapeUvLongitudeMinMaxMid;
#endif
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)
    uniform vec2 u_ellipsoidLocalToShapeUvLongitude; // x = scale, y = offset
#endif
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
    uniform vec2 u_ellipsoidLocalToShapeUvLatitude; // x = scale, y = offset
#endif
uniform float u_ellipsoidInverseHeightDifference;

uniform ivec4 u_cameraTileCoordinates;
uniform vec3 u_cameraTileUv;
uniform vec3 u_cameraPositionLocal; // TODO: remove - unused
uniform mat3 u_transformDirectionViewToLocal; // TODO: move to VoxelFS where it's used (is it?)

// robust iterative solution without trig functions
// https://github.com/0xfaded/ellipse_demo/issues/1
// https://stackoverflow.com/questions/22959698/distance-from-given-point-to-given-ellipse
// Extended to return radius of curvature along with the point
vec3 nearestPointAndRadiusOnEllipse(vec2 pos, vec2 radii) {
    vec2 p = abs(pos);
    vec2 inverseRadii = 1.0 / radii;

    // We describe the ellipse parametrically: v = radii * vec2(cos(t), sin(t))
    // but store the cos and sin of t in a vec2 for efficiency.
    // Initial guess: t = pi/4
    vec2 tTrigs = vec2(0.7071067811865476);
    // Initial guess of point on ellipsoid
    vec2 v = radii * tTrigs;
    // Center of curvature of the ellipse at v
    vec2 evolute = u_evoluteScale * tTrigs * tTrigs * tTrigs;

    const int iterations = 3;
    for (int i = 0; i < iterations; ++i) {
        // Find the (approximate) intersection of p - evolute with the ellipsoid.
        vec2 q = normalize(p - evolute) * length(v - evolute);
        // Update the estimate of t.
        tTrigs = (q + evolute) * inverseRadii;
        tTrigs = normalize(clamp(tTrigs, 0.0, 1.0));
        v = radii * tTrigs;
        evolute = u_evoluteScale * tTrigs * tTrigs * tTrigs;
    }

    return vec3(v * sign(pos), length(v - evolute));
}

PointJacobianT convertLocalToShapeSpaceDerivative(in vec3 position) {
    float longitude = atan(position.y, position.x);
    vec3 east = normalize(vec3(-position.y, position.x, 0.0));

    // Convert the 3D position to a 2D position relative to the ellipse (radii.x, radii.z)
    // (assume radii.y == radii.x) and find the nearest point on the ellipse and its normal
    float distanceFromZAxis = length(position.xy);
    vec2 posEllipse = vec2(distanceFromZAxis, position.z);
    vec3 surfacePointAndRadius = nearestPointAndRadiusOnEllipse(posEllipse, u_ellipsoidRadii.xz);
    vec2 surfacePoint = surfacePointAndRadius.xy;

    vec2 normal2d = normalize(surfacePoint * u_ellipsoidInverseRadiiSquared.xz);
    float latitude = atan(normal2d.y, normal2d.x);
    vec3 north = vec3(-normal2d.y * normalize(position.xy), abs(normal2d.x));

    float heightSign = length(posEllipse) < length(surfacePoint) ? -1.0 : 1.0;
    float height = heightSign * length(posEllipse - surfacePoint);
    vec3 up = normalize(cross(east, north));

    vec3 point = vec3(longitude, latitude, height);
    mat3 jacobianT = mat3(east / distanceFromZAxis, north / (surfacePointAndRadius.z + height), up);
    return PointJacobianT(point, jacobianT);
}

vec3 convertShapeToShapeUvSpace(in vec3 positionShape) {
    // Longitude: shift & scale to [0, 1]
    float longitude = (positionShape.x + czm_pi) / czm_twoPi;

    // Correct the angle when max < min
    // Technically this should compare against min longitude - but it has precision problems so compare against the middle of empty space.
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED)
        longitude += float(longitude < u_ellipsoidShapeUvLongitudeMinMaxMid.z);
    #endif

    // Avoid flickering from reading voxels from both sides of the -pi/+pi discontinuity.
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY)
        longitude = longitude > u_ellipsoidShapeUvLongitudeMinMaxMid.z ? u_ellipsoidShapeUvLongitudeMinMaxMid.x : longitude;
    #endif
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY)
        longitude = longitude < u_ellipsoidShapeUvLongitudeMinMaxMid.z ? u_ellipsoidShapeUvLongitudeMinMaxMid.y : longitude;
    #endif

    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)
        longitude = longitude * u_ellipsoidLocalToShapeUvLongitude.x + u_ellipsoidLocalToShapeUvLongitude.y;
    #endif

    // Latitude: shift and scale to [0, 1]
    float latitude = (positionShape.y + czm_piOverTwo) / czm_pi;
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
        latitude = latitude * u_ellipsoidLocalToShapeUvLatitude.x + u_ellipsoidLocalToShapeUvLatitude.y;
    #endif

    // Height: scale to the range [0, 1]
    float height = 1.0 + positionShape.z * u_ellipsoidInverseHeightDifference;

    return vec3(longitude, latitude, height);
}

PointJacobianT convertLocalToShapeUvSpaceDerivative(in vec3 positionLocal) {
    PointJacobianT pointJacobian = convertLocalToShapeSpaceDerivative(positionLocal);
    pointJacobian.point = convertShapeToShapeUvSpace(pointJacobian.point);
    return pointJacobian;
}

vec3 scaleShapeUvToShapeSpace(in vec3 shapeUv) {
    // Convert from [0, 1] to radians [-pi, pi]
    float longitude = shapeUv.x * czm_twoPi;
    #if defined (ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)
        longitude /= u_ellipsoidLocalToShapeUvLongitude.x;
    #endif

    // Convert from [0, 1] to radians [-pi/2, pi/2]
    float latitude = shapeUv.y * czm_pi;
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
        latitude /= u_ellipsoidLocalToShapeUvLatitude.x;
    #endif

    float height = shapeUv.z / u_ellipsoidInverseHeightDifference;

    return vec3(longitude, latitude, height);
}

vec3 convertECtoDeltaTile(in vec3 positionEC) {
    vec3 enu = u_ellipsoidEcToEastNorthUp * positionEC;

    // 1. Compute the change in longitude from the camera to the ENU point
    // First project the camera and ENU positions to the equatorial XY plane,
    // positioning the camera on the +x axis, so that enu.x projects along the +y axis
    float cosLatitude = cos(u_cameraPositionCartographic.y);
    float sinLatitude = sin(u_cameraPositionCartographic.y);
    float primeVerticalRadius = 1.0 / u_ellipsoidCurvatureAtLatitude.x;
    vec2 cameraXY = vec2((primeVerticalRadius + u_cameraPositionCartographic.z) * cosLatitude, 0.0);
    // Note precision loss in positionXY.x if length(enu) << length(cameraXY)
    vec2 positionXY = cameraXY + vec2(-enu.y * sinLatitude + enu.z * cosLatitude, enu.x);
    // TODO: is atan stable for y << x?
    float dLongitude = atan(positionXY.y, positionXY.x);

    // 2. Find the longitude component of positionXY, by rotating about Z until the y component is zero.
    // We need to find the effect of the rotation, (dx, dy) where dy = -positionXY.y.
    /* float dxExact = length(positionXY) - positionXY.x;
    // For small dLongitude, we can use the Taylor expansion of sqrt(1 + x) = 1 + x/2 - x^2/8 + ...
    float tanLongitude = positionXY.y / positionXY.x;
    float halfTanLongitude2 = tanLongitude * tanLongitude / 2.0;
    float dxApprox = distanceFromZAxis * halfTanLongitude2 * (1.0 - 0.5 * halfTanLongitude2);
    float dx = (abs(tanLongitude) < 0.15) ? dxApprox : dxExact;*/
    // Use the versine  to compute the change in x directly from the change in angle:
    //   versine(angle) = 2 * sin^2(angle/2)
    float sinHalfLongitude = sin(dLongitude / 2.0);
    float dx = length(positionXY) * 2.0 * sinHalfLongitude * sinHalfLongitude;

    // 3. Rotate longitude component back to ENU North and Up, and remove from enu
    enu += vec3(-enu.x, -dx * sinLatitude, dx * cosLatitude);

    // 4. Compute the change in latitude from the camera to the ENU point.
    // First project the camera and ENU positions to the meridional ZX plane,
    // positioning the camera on the +Z axis, so that enu.y maps to the +X axis.
    float meridionalRadius = 1.0 / u_ellipsoidCurvatureAtLatitude.y;
    vec2 cameraZX = vec2(meridionalRadius + u_cameraPositionCartographic.z, 0.0);
    vec2 positionZX = cameraZX + vec2(enu.z, enu.y);
    float dLatitude = atan(positionZX.y, positionZX.x);

    // 5. Compute the change in height above the ellipsoid
    // Find the change in enu.z associated with rotating the point to the latitude of the camera
    float sinHalfLatitude = sin(dLatitude / 2.0);
    float dz = length(positionZX) * 2.0 * sinHalfLatitude * sinHalfLatitude;
    // The remaining change in enu.z is the change in height above the ellipsoid
    float dHeight = enu.z + dz;

    // 4. Convert to tileset coordinates in [0, 1]
    // TODO: incorporate wrapping, and scaling/clamping for bounded longitude
    float dTilesetX = dLongitude / czm_twoPi;
    // TODO: incorporate clamping, and scaling for bounded latitude
    float dTilesetY = dLatitude / czm_pi;
    // TODO: clamp to height bounds
    float dTilesetZ = dHeight * u_ellipsoidInverseHeightDifference;

    // 5. Convert to tile coordinate changes
    return vec3(dTilesetX, dTilesetY, dTilesetZ) * float(1 << u_cameraTileCoordinates.w);
}

TileAndUvCoordinate getTileAndUvCoordinate(in vec3 positionEC) {
    vec3 deltaTileCoordinate = convertECtoDeltaTile(positionEC);
    vec3 tileUvSum = u_cameraTileUv + deltaTileCoordinate;
    ivec3 tileCoordinate = u_cameraTileCoordinates.xyz + ivec3(floor(tileUvSum));
    int maxTileCoordinate = (1 << u_cameraTileCoordinates.w) - 1;
    tileCoordinate.y = min(max(0, tileCoordinate.y), maxTileCoordinate);
    tileCoordinate.z = min(max(0, tileCoordinate.z), maxTileCoordinate);
    // TODO: wrapping issues! tileCoordinateChange.x could be maxTileCoordinate - 1
    // Computing this before wrapping tileCoordinate.x is a messy hack
    ivec3 tileCoordinateChange = tileCoordinate - u_cameraTileCoordinates.xyz;
    // TODO: Don't wrap if shape has a gap in longitude
    if (tileCoordinate.x < 0) {
        tileCoordinate.x += (maxTileCoordinate + 1);
    } else if (tileCoordinate.x > maxTileCoordinate) {
        tileCoordinate.x -= (maxTileCoordinate + 1);
    }
    vec3 tileUv = tileUvSum - vec3(tileCoordinateChange);
    // TODO: Don't wrap if shape has a gap in longitude
    tileUv.x = (u_cameraTileCoordinates.w == 0) ? fract(tileUv.x) : clamp(tileUv.x, 0.0, 1.0);
    tileUv.y = clamp(tileUv.y, 0.0, 1.0);
    tileUv.z = clamp(tileUv.z, 0.0, 1.0);
    return TileAndUvCoordinate(ivec4(tileCoordinate, u_cameraTileCoordinates.w), tileUv);
}