    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Transforms a position from eye to window coordinates.  The transformation\n\
 * from eye to clip coordinates is done using {@link czm_projection}.\n\
 * The transform from normalized device coordinates to window coordinates is\n\
 * done using {@link czm_viewportTransformation}, which assumes a depth range\n\
 * of <code>near = 0</code> and <code>far = 1</code>.\n\
 * <br /><br />\n\
 * This transform is useful when there is a need to manipulate window coordinates\n\
 * in a vertex shader as done by {@link BillboardCollection}.\n\
 *\n\
 * @name czm_eyeToWindowCoordinates\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} position The position in eye coordinates to transform.\n\
 *\n\
 * @returns {vec4} The transformed position in window coordinates.\n\
 *\n\
 * @see czm_modelToWindowCoordinates\n\
 * @see czm_projection\n\
 * @see czm_viewportTransformation\n\
 * @see BillboardCollection\n\
 *\n\
 * @example\n\
 * vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);\n\
 */\n\
vec4 czm_eyeToWindowCoordinates(vec4 positionEC)\n\
{\n\
    vec4 q = czm_projection * positionEC;                        // clip coordinates\n\
    q.xyz /= q.w;                                                // normalized device coordinates\n\
    q.xyz = (czm_viewportTransformation * vec4(q.xyz, 1.0)).xyz; // window coordinates\n\
    return q;\n\
}\n\
";
});