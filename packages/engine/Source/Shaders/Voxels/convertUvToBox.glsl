/* Box defines (set in Scene/VoxelBoxShape.js)
#define BOX_HAS_SHAPE_BOUNDS
*/

#if defined(BOX_HAS_SHAPE_BOUNDS)
    uniform vec3 u_boxUvToShapeUvScale;
    uniform vec3 u_boxUvToShapeUvTranslate;
#endif

vec3 convertUvToShapeUvSpace(in vec3 positionUv) {
    #if defined(BOX_HAS_SHAPE_BOUNDS)
        return positionUv * u_boxUvToShapeUvScale + u_boxUvToShapeUvTranslate;
    #else
        return positionUv;
    #endif
}
