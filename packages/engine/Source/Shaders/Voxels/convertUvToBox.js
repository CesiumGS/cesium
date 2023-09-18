//This file is automatically rebuilt by the Cesium build process.
export default "/* Box defines (set in Scene/VoxelBoxShape.js)\n\
#define BOX_HAS_SHAPE_BOUNDS\n\
*/\n\
\n\
#if defined(BOX_HAS_SHAPE_BOUNDS)\n\
    uniform vec3 u_boxUvToShapeUvScale;\n\
    uniform vec3 u_boxUvToShapeUvTranslate;\n\
#endif\n\
\n\
vec3 convertUvToShapeUvSpace(in vec3 positionUv) {\n\
#if defined(BOX_HAS_SHAPE_BOUNDS)\n\
    return positionUv * u_boxUvToShapeUvScale + u_boxUvToShapeUvTranslate;\n\
#else\n\
    return positionUv;\n\
#endif\n\
}\n\
\n\
vec3 convertShapeUvToUvSpace(in vec3 shapeUv) {\n\
#if defined(BOX_HAS_SHAPE_BOUNDS)\n\
    return (shapeUv - u_boxUvToShapeUvTranslate) / u_boxUvToShapeUvScale;\n\
#else\n\
    return shapeUv;\n\
#endif\n\
}\n\
";
