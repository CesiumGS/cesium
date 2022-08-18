/* Ellipsoid defines:
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED
#define ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO
#define ELLIPSOID_HAS_RENDER_BOUNDS_HEIGHT_RANGE_EQUAL_ZERO
#define ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN
#define ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_RANGE_EQUAL_ZERO
#define ELLIPSOID_IS_SPHERE
*/

uniform vec3 u_ellipsoidRadiiUv; // [0,1]
#if !defined(ELLIPSOID_IS_SPHERE)
    uniform vec3 u_ellipsoidInverseRadiiSquaredUv;
#endif
#if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY) || defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED)
    uniform vec3 u_ellipsoidShapeUvLongitudeMinMaxMid;
#endif
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)
    uniform vec2 u_ellipsoidUvToShapeUvLongitude; // x = scale, y = offset
#endif
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
    uniform vec2 u_ellipsoidUvToShapeUvLatitude; // x = scale, y = offset
#endif
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN) && !defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_RANGE_EQUAL_ZERO)
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

vec3 convertUvToShapeUvSpace(in vec3 positionUv) {
    // Compute position and normal.
    // Convert positionUv [0,1] to local space [-1,+1] to "normalized" cartesian space [-a,+a] where a = (radii + height) / (max(radii) + height).
    // A point on the largest ellipsoid axis would be [-1,+1] and everything else would be smaller.
    vec3 positionLocal = positionUv * 2.0 - 1.0;
    #if defined(ELLIPSOID_IS_SPHERE)
        vec3 posEllipsoid = positionLocal * u_ellipsoidRadiiUv.x;
        vec3 normal = normalize(posEllipsoid);
    #else
        vec3 posEllipsoid = positionLocal * u_ellipsoidRadiiUv;
        vec3 normal = normalize(posEllipsoid * u_ellipsoidInverseRadiiSquaredUv); // geodetic surface normal
    #endif
    
    // Compute longitude
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO)
        float longitude = 1.0;
    #else
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
    #endif

    // Compute latitude
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO)
        float latitude = 1.0;
    #else
        float latitude = (asin(normal.z) + czm_piOverTwo) / czm_pi;
        #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)
            latitude = latitude * u_ellipsoidUvToShapeUvLatitude.x + u_ellipsoidUvToShapeUvLatitude.y;
        #endif
    #endif

    // Compute height
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_RANGE_EQUAL_ZERO) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_HEIGHT_RANGE_EQUAL_ZERO)
        // TODO: This breaks down when minBounds == maxBounds. To fix it, this
        // function would have to know if ray is intersecting the front or back of the shape
        // and set the shape space position to 1 (front) or 0 (back) accordingly.
        float height = 1.0;
    #else
        #if defined(ELLIPSOID_IS_SPHERE)
            #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN)
                float height = (length(posEllipsoid) - u_ellipseInnerRadiiUv.x) * u_ellipsoidInverseHeightDifferenceUv;
            #else
                float height = length(posEllipsoid);
            #endif
        #else
            #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN)
                // Convert the 3D position to a 2D position relative to the ellipse (radii.x, radii.z) (assuming radii.x == radii.y which is true for WGS84).
                // This is an optimization so that math can be done with ellipses instead of ellipsoids.
                vec2 posEllipse = vec2(length(posEllipsoid.xy), posEllipsoid.z);
                float height = ellipseDistanceIterative(posEllipse, u_ellipseInnerRadiiUv) * u_ellipsoidInverseHeightDifferenceUv;
            #else
                // TODO: this is probably not correct
                float height = length(posEllipsoid);
            #endif
        #endif
    #endif

    return vec3(longitude, latitude, height);
}

// export { convertUvToShapeUvSpace };
