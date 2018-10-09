//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec4 czm_transformPlane(vec4 clippingPlane, mat4 transform) {\n\
    vec3 transformedDirection = normalize((transform * vec4(clippingPlane.xyz, 0.0)).xyz);\n\
    vec3 transformedPosition = (transform * vec4(clippingPlane.xyz * -clippingPlane.w, 1.0)).xyz;\n\
    vec4 transformedPlane;\n\
    transformedPlane.xyz = transformedDirection;\n\
    transformedPlane.w = -dot(transformedDirection, transformedPosition);\n\
    return transformedPlane;\n\
}\n\
";
});