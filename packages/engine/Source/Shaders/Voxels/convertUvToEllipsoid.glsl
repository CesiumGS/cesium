/* Ellipsoid defines (set in Scene/VoxelEllipsoidShape.js)
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE
*/

uniform vec3 u_ellipsoidRadiiUv; // [0,1]
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
vec2 nearestPointOnEllipse(vec2 pos, vec2 radii) {
    vec2 p = abs(pos);
    vec2 inverseRadii = 1.0 / radii;
    vec2 evoluteScale = (radii.x * radii.x - radii.y * radii.y) * vec2(1.0, -1.0) * inverseRadii;

    // We describe the ellipse parametrically: v = radii * vec2(cos(t), sin(t))
    // but store the cos and sin of t in a vec2 for efficiency.
    // Initial guess: t = pi/4
    vec2 tTrigs = vec2(0.70710678118);
    vec2 v = radii * tTrigs;

    const int iterations = 3;
    for (int i = 0; i < iterations; ++i) {
        // Find the evolute of the ellipse (center of curvature) at v.
        vec2 evolute = evoluteScale * tTrigs * tTrigs * tTrigs;
        // Find the (approximate) intersection of p - evolute with the ellipsoid.
        vec2 q = normalize(p - evolute) * length(v - evolute);
        // Update the estimate of t.
        tTrigs = (q + evolute) * inverseRadii;
        tTrigs = normalize(clamp(tTrigs, 0.0, 1.0));
        v = radii * tTrigs;
    }

    return v * sign(pos);
}

// TODO: rewrite as PointGradient3 ellipsoidNormalGradient(vec3 posEllipsoid),
// where the return is the height vector (length = height) and the gradient
vec3 nearestPointAndRadiusOnEllipse(vec2 pos, vec2 radii) {
    vec2 p = abs(pos);
    vec2 inverseRadii = 1.0 / radii;
    vec2 evoluteScale = (radii.x * radii.x - radii.y * radii.y) * vec2(1.0, -1.0) * inverseRadii;

    // We describe the ellipse parametrically: v = radii * vec2(cos(t), sin(t))
    // but store the cos and sin of t in a vec2 for efficiency.
    // Initial guess: t = pi/4
    vec2 tTrigs = vec2(0.70710678118);
    // Initial guess of point on ellipsoid
    vec2 v = radii * tTrigs;
    // Center of curvature of the ellipse at v
    vec2 evolute = evoluteScale * tTrigs * tTrigs * tTrigs;

    const int iterations = 3;
    for (int i = 0; i < iterations; ++i) {
        // Find the (approximate) intersection of p - evolute with the ellipsoid.
        vec2 q = normalize(p - evolute) * length(v - evolute);
        // Update the estimate of t.
        tTrigs = (q + evolute) * inverseRadii;
        tTrigs = normalize(clamp(tTrigs, 0.0, 1.0));
        v = radii * tTrigs;
        evolute = evoluteScale * tTrigs * tTrigs * tTrigs;
    }

    return vec3(v * sign(pos), length(v - evolute));
}

vec3 convertUvToShapeSpace(in vec3 positionUv) {
    // Convert positionUv [0,1] to local space [-1,+1]
    vec3 positionLocal = positionUv * 2.0 - 1.0;

    float longitude = atan(positionLocal.y, positionLocal.x);

    // Convert position to "normalized" cartesian space [-a,+a] where a = (radii + height) / (max(radii) + height).
    // A point on the largest ellipsoid axis would be [-1,+1] and everything else would be smaller.
    vec3 posEllipsoid = positionLocal * u_ellipsoidRadiiUv;

    // Convert the 3D position to a 2D position relative to the ellipse (radii.x, radii.z)
    // (assume radii.y == radii.x) and find the nearest point on the ellipse.
    vec2 posEllipse = vec2(length(posEllipsoid.xy), posEllipsoid.z);
    vec2 surfacePoint = nearestPointOnEllipse(posEllipse, u_ellipsoidRadiiUv.xz);

    vec2 normal = normalize(surfacePoint * u_ellipsoidInverseRadiiSquaredUv.xz);
    float latitude = atan(normal.y, normal.x);

    float heightSign = length(posEllipse) < length(surfacePoint) ? -1.0 : 1.0;
    float height = heightSign * length(posEllipse - surfacePoint);

    return vec3(longitude, latitude, height);
}

PointGradient3 convertUvToShapeSpaceDerivative(in vec3 positionUv, in vec3 direction) {
    // Convert from UV space [0, 1] to local space [-1, 1]
    vec3 position = positionUv * 2.0 - 1.0;
    direction *= 2.0;
    // Undo the scaling from ellipsoid to sphere
    position = position * u_ellipsoidRadiiUv;
    direction = direction * u_ellipsoidRadiiUv;

    float longitude = atan(position.y, position.x);
    vec3 east = vec3(-position.y, position.x, 0.0) / dot(position.xy, position.xy);

    // Convert the 3D position to a 2D position relative to the ellipse (radii.x, radii.z)
    // (assume radii.y == radii.x) and find the nearest point on the ellipse and its normal
    vec2 posEllipse = vec2(length(position.xy), position.z);
    vec3 surfacePointAndRadius = nearestPointAndRadiusOnEllipse(posEllipse, u_ellipsoidRadiiUv.xz);
    vec2 surfacePoint = surfacePointAndRadius.xy;
    
    vec2 normal2d = normalize(surfacePoint * u_ellipsoidInverseRadiiSquaredUv.xz);
    float latitude = atan(normal2d.y, normal2d.x);
    vec2 cosSinLongitude = normalize(position.xy);
    vec3 north = vec3(-normal2d.y * cosSinLongitude, normal2d.x);
 
    float heightSign = length(posEllipse) < length(surfacePoint) ? -1.0 : 1.0;
    float height = heightSign * length(posEllipse - surfacePoint);
    vec3 up = normalize(cross(east, north));
    north = north / (surfacePointAndRadius.z + height);

    vec3 point = vec3(longitude, latitude, height);
    mat3 jacobian = transpose(mat3(east, north, up));
    vec3 gradient = jacobian * direction;
    return PointGradient3(point, gradient);
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

vec3 convertUvToShapeUvSpace(in vec3 positionUv) {
    vec3 positionShape = convertUvToShapeSpace(positionUv);
    return convertShapeToShapeUvSpace(positionShape);
}

vec3 scaleShapeUvToShapeSpace(in vec3 shapeUv) {
    float longitude = shapeUv.x;
    #if defined (ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)
        longitude /= u_ellipsoidUvToShapeUvLongitude.x;
    #endif
    // Convert from [0, 1] to radians [-pi, pi]
    longitude *= czm_twoPi;

    float latitude = shapeUv.y;
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
        latitude /= u_ellipsoidUvToShapeUvLatitude.x;
    #endif
    // Convert from [0, 1] to radians [-pi/2, pi/2]
    latitude *= czm_pi;
    
    float height = shapeUv.z / u_ellipsoidInverseHeightDifferenceUv;

    return vec3(longitude, latitude, height);
}
