/* Ellipsoid defines (set in Scene/VoxelEllipsoidShape.js)
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE
*/

uniform vec3 u_ellipsoidRadiiUv; // [0,1]
uniform vec2 u_evoluteScale; // (radiiUv.x ^ 2 - radiiUv.z ^ 2) * vec2(1.0, -1.0) / radiiUv;
uniform vec3 u_ellipsoidInverseRadiiSquaredUv;
#if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY) || defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED)
    uniform vec3 u_ellipsoidShapeUvLongitudeMinMaxMid;
#endif
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)
    uniform vec2 u_ellipsoidUvToShapeUvLongitude; // x = scale, y = offset
#endif
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
    uniform vec2 u_ellipsoidUvToShapeUvLatitude; // x = scale, y = offset
#endif
uniform float u_ellipsoidInverseHeightDifferenceUv;

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

PointJacobianT convertUvToShapeSpaceDerivative(in vec3 positionUv) {
    // Convert from UV space [0, 1] to local space [-1, 1]
    vec3 position = positionUv * 2.0 - 1.0;
    // Undo the scaling from ellipsoid to sphere
    position = position * u_ellipsoidRadiiUv;

    float longitude = atan(position.y, position.x);
    vec3 east = normalize(vec3(-position.y, position.x, 0.0));

    // Convert the 3D position to a 2D position relative to the ellipse (radii.x, radii.z)
    // (assume radii.y == radii.x) and find the nearest point on the ellipse and its normal
    float distanceFromZAxis = length(position.xy);
    vec2 posEllipse = vec2(distanceFromZAxis, position.z);
    vec3 surfacePointAndRadius = nearestPointAndRadiusOnEllipse(posEllipse, u_ellipsoidRadiiUv.xz);
    vec2 surfacePoint = surfacePointAndRadius.xy;

    vec2 normal2d = normalize(surfacePoint * u_ellipsoidInverseRadiiSquaredUv.xz);
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
        longitude = longitude * u_ellipsoidUvToShapeUvLongitude.x + u_ellipsoidUvToShapeUvLongitude.y;
    #endif

    // Latitude: shift and scale to [0, 1]
    float latitude = (positionShape.y + czm_piOverTwo) / czm_pi;
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
        latitude = latitude * u_ellipsoidUvToShapeUvLatitude.x + u_ellipsoidUvToShapeUvLatitude.y;
    #endif

    // Height: scale to the range [0, 1]
    float height = 1.0 + positionShape.z * u_ellipsoidInverseHeightDifferenceUv;

    return vec3(longitude, latitude, height);
}

PointJacobianT convertUvToShapeUvSpaceDerivative(in vec3 positionUv) {
    PointJacobianT pointJacobian = convertUvToShapeSpaceDerivative(positionUv);
    pointJacobian.point = convertShapeToShapeUvSpace(pointJacobian.point);
    return pointJacobian;
}

vec3 scaleShapeUvToShapeSpace(in vec3 shapeUv) {
    // Convert from [0, 1] to radians [-pi, pi]
    float longitude = shapeUv.x * czm_twoPi;
    #if defined (ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)
        longitude /= u_ellipsoidUvToShapeUvLongitude.x;
    #endif

    // Convert from [0, 1] to radians [-pi/2, pi/2]
    float latitude = shapeUv.y * czm_pi;
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
        latitude /= u_ellipsoidUvToShapeUvLatitude.x;
    #endif
    
    float height = shapeUv.z / u_ellipsoidInverseHeightDifferenceUv;

    return vec3(longitude, latitude, height);
}
