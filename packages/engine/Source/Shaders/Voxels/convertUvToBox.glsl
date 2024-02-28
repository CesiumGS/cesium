/* Box defines (set in Scene/VoxelBoxShape.js)
#define BOX_HAS_SHAPE_BOUNDS
*/

#if defined(BOX_HAS_SHAPE_BOUNDS)
    uniform vec3 u_boxUvToShapeUvScale;
    uniform vec3 u_boxUvToShapeUvTranslate;
#endif

PointJacobianT convertUvToShapeSpaceDerivative(in vec3 positionUv) {
    // For BOX, UV space = shape space, so we can use positionUv as-is,
    // and the Jacobian is the identity matrix
    return PointJacobianT(positionUv, mat3(1.0));
}

vec3 convertShapeToShapeUvSpace(in vec3 positionShape) {
#if defined(BOX_HAS_SHAPE_BOUNDS)
    return positionShape * u_boxUvToShapeUvScale + u_boxUvToShapeUvTranslate;
#else
    return positionShape;
#endif
}

PointJacobianT convertUvToShapeUvSpaceDerivative(in vec3 positionUv) {
    PointJacobianT pointJacobian = convertUvToShapeSpaceDerivative(positionUv);
    pointJacobian.point = convertShapeToShapeUvSpace(pointJacobian.point);
    return pointJacobian;
}

vec3 convertShapeUvToUvSpace(in vec3 shapeUv) {
#if defined(BOX_HAS_SHAPE_BOUNDS)
    return (shapeUv - u_boxUvToShapeUvTranslate) / u_boxUvToShapeUvScale;
#else
    return shapeUv;
#endif
}

vec3 scaleShapeUvToShapeSpace(in vec3 shapeUv) {
#if defined(BOX_HAS_SHAPE_BOUNDS)
    return shapeUv / u_boxUvToShapeUvScale;
#else
    return shapeUv;
#endif
}