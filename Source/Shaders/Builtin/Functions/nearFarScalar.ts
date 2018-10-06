//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_nearFarScalar(vec4 nearFarScalar, float cameraDistSq)\n\
{\n\
float valueAtMin = nearFarScalar.y;\n\
float valueAtMax = nearFarScalar.w;\n\
float nearDistanceSq = nearFarScalar.x * nearFarScalar.x;\n\
float farDistanceSq = nearFarScalar.z * nearFarScalar.z;\n\
float t = (cameraDistSq - nearDistanceSq) / (farDistanceSq - nearDistanceSq);\n\
t = pow(clamp(t, 0.0, 1.0), 0.2);\n\
return mix(valueAtMin, valueAtMax, t);\n\
}\n\
";
});