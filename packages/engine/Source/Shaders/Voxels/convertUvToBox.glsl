/* Box defines:
#define BOX_HAS_SHAPE_BOUND
*/

// Box uniforms:
#if defined(BOX_HAS_SHAPE_BOUND)
    uniform vec3 u_boxScaleUvToShapeBoundsUv;
    uniform vec3 u_boxOffsetUvToShapeBoundsUv;
#endif

vec3 convertUvToShapeUvSpace(in vec3 positionUv) {
    #if defined(BOX_HAS_SHAPE_BOUND)
        return positionUv * u_boxScaleUvToShapeBoundsUv + u_boxOffsetUvToShapeBoundsUv;
    #else
        return positionUv;
    #endif
}
