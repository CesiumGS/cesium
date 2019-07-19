//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_raySegment\n\
 * @glslStruct\n\
 */\n\
struct czm_raySegment\n\
{\n\
    float start;\n\
    float stop;\n\
};\n\
\n\
/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_emptyRaySegment\n\
 * @glslConstant \n\
 */\n\
const czm_raySegment czm_emptyRaySegment = czm_raySegment(-czm_infinity, -czm_infinity);\n\
\n\
/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_fullRaySegment\n\
 * @glslConstant \n\
 */\n\
const czm_raySegment czm_fullRaySegment = czm_raySegment(0.0, czm_infinity);\n\
";
});