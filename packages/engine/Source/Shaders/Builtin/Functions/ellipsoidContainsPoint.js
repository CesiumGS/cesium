//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_ellipsoidContainsPoint\n\
 * @glslFunction\n\
 *\n\
 */\n\
bool czm_ellipsoidContainsPoint(vec3 ellipsoid_inverseRadii, vec3 point)\n\
{\n\
    vec3 scaled = ellipsoid_inverseRadii * (czm_inverseModelView * vec4(point, 1.0)).xyz;\n\
    return (dot(scaled, scaled) <= 1.0);\n\
}\n\
";
