/* Cylinder defines (set in Scene/VoxelCylinderShape.js)
#define CYLINDER_HAS_SHAPE_BOUNDS_RADIUS
#define CYLINDER_HAS_SHAPE_BOUNDS_RADIUS_FLAT
#define CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT
#define CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT_FLAT
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_RANGE_EQUAL_ZERO
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_DISCONTINUITY
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MAX_DISCONTINUITY
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_MAX_REVERSED
*/

#if defined(CYLINDER_HAS_SHAPE_BOUNDS_RADIUS)
    uniform vec2 u_cylinderUvToShapeUvRadius; // x = scale, y = offset
#endif
#if defined(CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT)
    uniform vec2 u_cylinderUvToShapeUvHeight; // x = scale, y = offset
#endif
#if defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE)
    uniform vec2 u_cylinderUvToShapeUvAngle; // x = scale, y = offset
#endif
#if defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_DISCONTINUITY) || defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MAX_DISCONTINUITY)
    uniform vec2 u_cylinderShapeUvAngleMinMax;
#endif
#if defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_DISCONTINUITY) || defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MAX_DISCONTINUITY) || defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_MAX_REVERSED)
    uniform float u_cylinderShapeUvAngleRangeZeroMid;
#endif

vec3 convertUvToShapeUvSpace(in vec3 positionUv) {
    vec3 positionLocal = positionUv * 2.0 - 1.0; // [-1,+1]

    // Compute radius
    #if defined(CYLINDER_HAS_SHAPE_BOUNDS_RADIUS_FLAT)
        float radius = 1.0;
    #else
        float radius = length(positionLocal.xy); // [0,1]
        #if defined(CYLINDER_HAS_SHAPE_BOUNDS_RADIUS)
            radius = radius * u_cylinderUvToShapeUvRadius.x + u_cylinderUvToShapeUvRadius.y; // x = scale, y = offset
        #endif
    #endif

    // Compute height
    #if defined(CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT_FLAT)
        float height = 1.0;
    #else
        float height = positionUv.z; // [0,1]
        #if defined(CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT)
            height = height * u_cylinderUvToShapeUvHeight.x + u_cylinderUvToShapeUvHeight.y; // x = scale, y = offset
        #endif
    #endif

    // Compute angle
    #if defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_RANGE_EQUAL_ZERO)
        float angle = 1.0;
    #else
        float angle = (atan(positionLocal.y, positionLocal.x) + czm_pi) / czm_twoPi; // [0,1]
        #if defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE)
            #if defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_MAX_REVERSED)
                // Comparing against u_cylinderShapeUvAngleMinMax has precision problems. u_cylinderShapeUvAngleRangeZeroMid is more conservative.
                angle += float(angle < u_cylinderShapeUvAngleRangeZeroMid);
            #endif

            // Avoid flickering from reading voxels from both sides of the -pi/+pi discontinuity.
            #if defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_DISCONTINUITY)
                angle = angle > u_cylinderShapeUvAngleRangeZeroMid ? u_cylinderShapeUvAngleMinMax.x : angle;
            #elif defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MAX_DISCONTINUITY)
                angle = angle < u_cylinderShapeUvAngleRangeZeroMid ? u_cylinderShapeUvAngleMinMax.y : angle;
            #endif

            angle = angle * u_cylinderUvToShapeUvAngle.x + u_cylinderUvToShapeUvAngle.y; // x = scale, y = offset
        #endif
    #endif

    return vec3(radius, height, angle);
}
