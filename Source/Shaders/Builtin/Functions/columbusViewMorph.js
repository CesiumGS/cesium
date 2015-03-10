    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_columbusViewMorph\n\
 * @glslFunction\n\
 */\n\
vec4 czm_columbusViewMorph(vec4 position2D, vec4 position3D, float time)\n\
{\n\
    // Just linear for now.\n\
    vec3 p = mix(position2D.xyz, position3D.xyz, time);\n\
    return vec4(p, 1.0);\n\
}\n\
";
});