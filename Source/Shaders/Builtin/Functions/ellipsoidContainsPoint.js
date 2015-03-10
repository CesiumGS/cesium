    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_ellipsoidContainsPoint\n\
 * @glslFunction\n\
 *\n\
 */\n\
bool czm_ellipsoidContainsPoint(czm_ellipsoid ellipsoid, vec3 point)\n\
{\n\
    vec3 scaled = ellipsoid.inverseRadii * (czm_inverseModelView * vec4(point, 1.0)).xyz;\n\
    return (dot(scaled, scaled) <= 1.0);\n\
}\n\
";
});