//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_getLambertDiffuse(vec3 lightDirectionEC, vec3 normalEC)\n\
{\n\
return max(dot(lightDirectionEC, normalEC), 0.0);\n\
}\n\
";
});