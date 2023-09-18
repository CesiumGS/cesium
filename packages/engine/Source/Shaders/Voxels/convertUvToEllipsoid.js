//This file is automatically rebuilt by the Cesium build process.
export default "/* Ellipsoid defines (set in Scene/VoxelEllipsoidShape.js)\n\
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY\n\
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY\n\
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE\n\
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO\n\
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED\n\
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE\n\
#define ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO\n\
#define ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN\n\
#define ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT\n\
#define ELLIPSOID_IS_SPHERE\n\
*/\n\
\n\
uniform vec3 u_ellipsoidRadiiUv; // [0,1]\n\
#if !defined(ELLIPSOID_IS_SPHERE)\n\
    uniform vec3 u_ellipsoidInverseRadiiSquaredUv;\n\
#endif\n\
#if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY) || defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED)\n\
    uniform vec3 u_ellipsoidShapeUvLongitudeMinMaxMid;\n\
#endif\n\
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)\n\
    uniform vec2 u_ellipsoidUvToShapeUvLongitude; // x = scale, y = offset\n\
#endif\n\
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)\n\
    uniform vec2 u_ellipsoidUvToShapeUvLatitude; // x = scale, y = offset\n\
#endif\n\
#if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN) && !defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT)\n\
    uniform float u_ellipsoidInverseHeightDifferenceUv;\n\
    uniform vec2 u_ellipseInnerRadiiUv; // [0,1]\n\
#endif\n\
\n\
// robust iterative solution without trig functions\n\
// https://github.com/0xfaded/ellipse_demo/issues/1\n\
// https://stackoverflow.com/questions/22959698/distance-from-given-point-to-given-ellipse\n\
// Pro: Good when radii.x ~= radii.y\n\
// Con: Breaks at pos.x ~= 0.0, especially inside the ellipse\n\
// Con: Inaccurate with exterior points and thin ellipses\n\
float ellipseDistanceIterative (vec2 pos, vec2 radii) {\n\
    vec2 p = abs(pos);\n\
    vec2 invRadii = 1.0 / radii;\n\
    vec2 a = vec2(1.0, -1.0) * (radii.x * radii.x - radii.y * radii.y) * invRadii;\n\
    vec2 t = vec2(0.70710678118); // sqrt(2) / 2\n\
    vec2 v = radii * t;\n\
\n\
    const int iterations = 3;\n\
    for (int i = 0; i < iterations; ++i) {\n\
        vec2 e = a * pow(t, vec2(3.0));\n\
        vec2 q = normalize(p - e) * length(v - e);\n\
        t = normalize((q + e) * invRadii);\n\
        v = radii * t;\n\
    }\n\
    return length(v * sign(pos) - pos) * sign(p.y - v.y);\n\
}\n\
\n\
vec3 convertUvToShapeUvSpace(in vec3 positionUv) {\n\
    // Compute position and normal.\n\
    // Convert positionUv [0,1] to local space [-1,+1] to \"normalized\" cartesian space [-a,+a] where a = (radii + height) / (max(radii) + height).\n\
    // A point on the largest ellipsoid axis would be [-1,+1] and everything else would be smaller.\n\
    vec3 positionLocal = positionUv * 2.0 - 1.0;\n\
    #if defined(ELLIPSOID_IS_SPHERE)\n\
        vec3 posEllipsoid = positionLocal * u_ellipsoidRadiiUv.x;\n\
        vec3 normal = normalize(posEllipsoid);\n\
    #else\n\
        vec3 posEllipsoid = positionLocal * u_ellipsoidRadiiUv;\n\
        vec3 normal = normalize(posEllipsoid * u_ellipsoidInverseRadiiSquaredUv); // geodetic surface normal\n\
    #endif\n\
\n\
    // Compute longitude\n\
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO)\n\
        float longitude = 1.0;\n\
    #else\n\
        float longitude = (atan(normal.y, normal.x) + czm_pi) / czm_twoPi;\n\
\n\
        // Correct the angle when max < min\n\
        // Technically this should compare against min longitude - but it has precision problems so compare against the middle of empty space.\n\
        #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED)\n\
            longitude += float(longitude < u_ellipsoidShapeUvLongitudeMinMaxMid.z);\n\
        #endif\n\
\n\
        // Avoid flickering from reading voxels from both sides of the -pi/+pi discontinuity.\n\
        #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY)\n\
            longitude = longitude > u_ellipsoidShapeUvLongitudeMinMaxMid.z ? u_ellipsoidShapeUvLongitudeMinMaxMid.x : longitude;\n\
        #endif\n\
        #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY)\n\
            longitude = longitude < u_ellipsoidShapeUvLongitudeMinMaxMid.z ? u_ellipsoidShapeUvLongitudeMinMaxMid.y : longitude;\n\
        #endif\n\
\n\
        #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)\n\
            longitude = longitude * u_ellipsoidUvToShapeUvLongitude.x + u_ellipsoidUvToShapeUvLongitude.y;\n\
        #endif\n\
    #endif\n\
\n\
    // Compute latitude\n\
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO)\n\
        float latitude = 1.0;\n\
    #else\n\
        float latitude = (asin(normal.z) + czm_piOverTwo) / czm_pi;\n\
        #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)\n\
            latitude = latitude * u_ellipsoidUvToShapeUvLatitude.x + u_ellipsoidUvToShapeUvLatitude.y;\n\
        #endif\n\
    #endif\n\
\n\
    // Compute height\n\
    #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT)\n\
        // TODO: This breaks down when minBounds == maxBounds. To fix it, this\n\
        // function would have to know if ray is intersecting the front or back of the shape\n\
        // and set the shape space position to 1 (front) or 0 (back) accordingly.\n\
        float height = 1.0;\n\
    #else\n\
        #if defined(ELLIPSOID_IS_SPHERE)\n\
            #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN)\n\
                float height = (length(posEllipsoid) - u_ellipseInnerRadiiUv.x) * u_ellipsoidInverseHeightDifferenceUv;\n\
            #else\n\
                float height = length(posEllipsoid);\n\
            #endif\n\
        #else\n\
            #if defined(ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN)\n\
                // Convert the 3D position to a 2D position relative to the ellipse (radii.x, radii.z) (assuming radii.x == radii.y which is true for WGS84).\n\
                // This is an optimization so that math can be done with ellipses instead of ellipsoids.\n\
                vec2 posEllipse = vec2(length(posEllipsoid.xy), posEllipsoid.z);\n\
                float height = ellipseDistanceIterative(posEllipse, u_ellipseInnerRadiiUv) * u_ellipsoidInverseHeightDifferenceUv;\n\
            #else\n\
                // TODO: this is probably not correct\n\
                float height = length(posEllipsoid);\n\
            #endif\n\
        #endif\n\
    #endif\n\
\n\
    return vec3(longitude, latitude, height);\n\
}\n\
";
