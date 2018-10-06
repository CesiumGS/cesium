//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec4 czm_eyeOffset(vec4 positionEC, vec3 eyeOffset)\n\
{\n\
vec4 p = positionEC;\n\
vec4 zEyeOffset = normalize(p) * eyeOffset.z;\n\
p.xy += eyeOffset.xy + zEyeOffset.xy;\n\
p.z += zEyeOffset.z;\n\
return p;\n\
}\n\
";
});