/* Ellipsoid defines (set in Scene/VoxelEllipsoidShape.js)
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE
#define ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT
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
#if !defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT)
    uniform float u_ellipsoidInverseHeightDifferenceUv;
    uniform vec2 u_ellipseInnerRadiiUv; // [0,1]
#endif

// robust iterative solution without trig functions
// https://github.com/0xfaded/ellipse_demo/issues/1
// https://stackoverflow.com/questions/22959698/distance-from-given-point-to-given-ellipse
// Pro: Good when radii.x ~= radii.y
// Con: Breaks at pos.x ~= 0.0, especially inside the ellipse
// Con: Inaccurate with exterior points and thin ellipses
float ellipseDistanceIterative (vec2 pos, vec2 radii) {
    vec2 p = abs(pos);
    vec2 invRadii = 1.0 / radii;
    vec2 a = vec2(1.0, -1.0) * (radii.x * radii.x - radii.y * radii.y) * invRadii;
    vec2 t = vec2(0.70710678118); // sqrt(2) / 2
    vec2 v = radii * t;

    const int iterations = 3;
    for (int i = 0; i < iterations; ++i) {
        vec2 e = a * pow(t, vec2(3.0));
        vec2 q = normalize(p - e) * length(v - e);
        t = normalize((q + e) * invRadii);
        v = radii * t;
    }
    return length(v * sign(pos) - pos) * sign(p.y - v.y);
}

/**
 * Not valid for ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT
 */
vec3 convertUvToShapeSpace(in vec3 positionUv) {
    // Compute position and normal.
    // Convert positionUv [0,1] to local space [-1,+1] to "normalized" cartesian space [-a,+a] where a = (radii + height) / (max(radii) + height).
    // A point on the largest ellipsoid axis would be [-1,+1] and everything else would be smaller.
    vec3 positionLocal = positionUv * 2.0 - 1.0;
    vec3 posEllipsoid = positionLocal * u_ellipsoidRadiiUv;
    vec3 normal = normalize(posEllipsoid * u_ellipsoidInverseRadiiSquaredUv); // geodetic surface normal

    float longitude = atan(normal.y, normal.x);

    float latitude = asin(normal.z);

    // Convert the 3D position to a 2D position relative to the ellipse (radii.x, radii.z) 
    // Assuming radii.x == radii.y which is true for WGS84.
    // This is an optimization so that math can be done with ellipses instead of ellipsoids.
    vec2 posEllipse = vec2(length(posEllipsoid.xy), posEllipsoid.z);
    float height = ellipseDistanceIterative(posEllipse, u_ellipseInnerRadiiUv);

    return vec3(longitude, latitude, height);
}

/**
 * Not valid for ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT
 */
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
    float height = positionShape.z * u_ellipsoidInverseHeightDifferenceUv;

    return vec3(longitude, latitude, height);
}

/**
 * Composition of convertUvToShapeSpace and convertShapeToShapeUvSpace
 */
vec3 convertUvToShapeUvSpace(in vec3 positionUv) {
    // Compute position and normal.
    // Convert positionUv [0,1] to local space [-1,+1] to "normalized" cartesian space [-a,+a] where a = (radii + height) / (max(radii) + height).
    // A point on the largest ellipsoid axis would be [-1,+1] and everything else would be smaller.
    vec3 positionLocal = positionUv * 2.0 - 1.0;
    vec3 posEllipsoid = positionLocal * u_ellipsoidRadiiUv;
    vec3 normal = normalize(posEllipsoid * u_ellipsoidInverseRadiiSquaredUv); // geodetic surface normal

    // Compute longitude, shifted and scaled to the range [0, 1]
    float longitude = (atan(normal.y, normal.x) + czm_pi) / czm_twoPi;

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

    // Compute latitude, shifted and scaled to the range [0, 1]
    float latitude = (asin(normal.z) + czm_piOverTwo) / czm_pi;
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
        latitude = latitude * u_ellipsoidUvToShapeUvLatitude.x + u_ellipsoidUvToShapeUvLatitude.y;
    #endif

    // Compute height
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT)
        // TODO: This breaks down when minBounds == maxBounds. To fix it, this
        // function would have to know if ray is intersecting the front or back of the shape
        // and set the shape space position to 1 (front) or 0 (back) accordingly.
        float height = 1.0;
    #else
        // Convert the 3D position to a 2D position relative to the ellipse (radii.x, radii.z) (assuming radii.x == radii.y which is true for WGS84).
        // This is an optimization so that math can be done with ellipses instead of ellipsoids.
        vec2 posEllipse = vec2(length(posEllipsoid.xy), posEllipsoid.z);
        float height = ellipseDistanceIterative(posEllipse, u_ellipseInnerRadiiUv) * u_ellipsoidInverseHeightDifferenceUv;
    #endif

    return vec3(longitude, latitude, height);
}

vec3 convertShapeUvToShapeSpace(in vec3 shapeUv) {
    float longitude = shapeUv.x;
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)
        longitude = (longitude - u_ellipsoidUvToShapeUvLongitude.y) / u_ellipsoidUvToShapeUvLongitude.x;
    #endif
    // Correct the angle when max < min. TODO: confirm this
    // Technically this should compare against min longitude - but it has precision problems so compare against the middle of empty space.
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED)
        longitude -= float(longitude >= u_ellipsoidShapeUvLongitudeMinMaxMid.z);
    #endif
    // Convert from [0, 1] to radians [-pi, pi]
    longitude = longitude * czm_twoPi - czm_pi;

    float latitude = shapeUv.y;
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
        latitude = (latitude - u_ellipsoidUvToShapeUvLatitude.y) / u_ellipsoidUvToShapeUvLatitude.x;
    #endif
    // Convert from [0, 1] to radians [-pi/2, pi/2]
    latitude = latitude * czm_pi - czm_piOverTwo;

    float height = shapeUv.z;
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT)
        height = 0.0;
    #else
        height = (height - 1.0) / u_ellipsoidInverseHeightDifferenceUv;
    #endif

    return vec3(longitude, latitude, height);
}

VoxelCell convertShapeUvToShapeSpace(in VoxelCell voxel) {
    vec3 p = voxel.p;
    vec3 dP = voxel.dP;

    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)
        p.x = (p.x - u_ellipsoidUvToShapeUvLongitude.y) / u_ellipsoidUvToShapeUvLongitude.x;
        dP.x = dP.x / u_ellipsoidUvToShapeUvLongitude.x;
    #endif
    // Correct the angle when max < min. TODO: confirm this
    // Technically this should compare against min longitude - but it has precision problems so compare against the middle of empty space.
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED)
        p.x -= float(p.x >= u_ellipsoidShapeUvLongitudeMinMaxMid.z);
    #endif
    // Convert from [0, 1] to radians [-pi, pi]
    p.x = p.x * czm_twoPi - czm_pi;
    dP.x = dP.x * czm_twoPi;

    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
        p.y = (p.y - u_ellipsoidUvToShapeUvLatitude.y) / u_ellipsoidUvToShapeUvLatitude.x;
        dP.y = dP.y / u_ellipsoidUvToShapeUvLatitude.x;
    #endif
    // Convert from [0, 1] to radians [-pi/2, pi/2]
    p.y = p.y * czm_pi - czm_piOverTwo;
    dP.y = dP.y * czm_pi;

    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT)
        p.z = 0.0;
    #else
        p.z = (p.z - 1.0) / u_ellipsoidInverseHeightDifferenceUv;
        dP.z = dP.z / u_ellipsoidInverseHeightDifferenceUv;
    #endif

    return VoxelCell(p, dP);
}
