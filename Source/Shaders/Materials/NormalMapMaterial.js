    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "uniform sampler2D image;\n\
uniform float strength;\n\
uniform vec2 repeat;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
    \n\
    vec4 textureValue = texture2D(image, fract(repeat * materialInput.st));\n\
    vec3 normalTangentSpace = textureValue.channels;\n\
    normalTangentSpace.xy = normalTangentSpace.xy * 2.0 - 1.0;\n\
    normalTangentSpace.z = clamp(1.0 - strength, 0.1, 1.0);\n\
    normalTangentSpace = normalize(normalTangentSpace);\n\
    vec3 normalEC = materialInput.tangentToEyeMatrix * normalTangentSpace;\n\
    \n\
    material.normal = normalEC;\n\
    \n\
    return material;\n\
}";
});