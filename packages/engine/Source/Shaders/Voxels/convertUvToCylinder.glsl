/* Cylinder defines (set in Scene/VoxelCylinderShape.js)
#define CYLINDER_HAS_SHAPE_BOUNDS_RADIUS
#define CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE
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
    float radius = positionShape.x;
    #if defined(CYLINDER_HAS_SHAPE_BOUNDS_RADIUS)
        radius = radius * u_cylinderUvToShapeUvRadius.x + u_cylinderUvToShapeUvRadius.y;
    #endif

    float angle = (positionShape.y + czm_pi) / czm_twoPi;
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

        angle = angle * u_cylinderUvToShapeUvAngle.x + u_cylinderUvToShapeUvAngle.y;
    #endif

    float height = positionShape.z;
    #if defined(CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT)
        height = height * u_cylinderUvToShapeUvHeight.x + u_cylinderUvToShapeUvHeight.y;
    #endif

    return vec3(radius, angle, height);
}

PointJacobianT convertUvToShapeUvSpaceDerivative(in vec3 positionUv) {
    PointJacobianT pointJacobian = convertUvToShapeSpaceDerivative(positionUv);
    pointJacobian.point = convertShapeToShapeUvSpace(pointJacobian.point);
    return pointJacobian;
}

vec3 scaleShapeUvToShapeSpace(in vec3 shapeUv) {
    float radius = shapeUv.x;
    #if defined(CYLINDER_HAS_SHAPE_BOUNDS_RADIUS)
        radius /= u_cylinderUvToShapeUvRadius.x;
    #endif

    float angle = shapeUv.y * czm_twoPi;
    #if defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE)
        angle /= u_cylinderUvToShapeUvAngle.x;
    #endif

    float height = shapeUv.z;
    #if defined(CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT)
        height /= u_cylinderUvToShapeUvHeight.x;
    #endif

    return vec3(radius, angle, height);
}
