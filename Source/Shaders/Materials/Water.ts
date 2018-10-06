//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D specularMap;\n\
uniform sampler2D normalMap;\n\
uniform vec4 baseWaterColor;\n\
uniform vec4 blendColor;\n\
uniform float frequency;\n\
uniform float animationSpeed;\n\
uniform float amplitude;\n\
uniform float specularIntensity;\n\
uniform float fadeFactor;\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
czm_material material = czm_getDefaultMaterial(materialInput);\n\
float time = czm_frameNumber * animationSpeed;\n\
float fade = max(1.0, (length(materialInput.positionToEyeEC) / 10000000000.0) * frequency * fadeFactor);\n\
float specularMapValue = texture2D(specularMap, materialInput.st).r;\n\
vec4 noise = czm_getWaterNoise(normalMap, materialInput.st * frequency, time, 0.0);\n\
vec3 normalTangentSpace = noise.xyz * vec3(1.0, 1.0, (1.0 / amplitude));\n\
normalTangentSpace.xy /= fade;\n\
normalTangentSpace = mix(vec3(0.0, 0.0, 50.0), normalTangentSpace, specularMapValue);\n\
normalTangentSpace = normalize(normalTangentSpace);\n\
float tsPerturbationRatio = clamp(dot(normalTangentSpace, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);\n\
material.alpha = specularMapValue;\n\
material.diffuse = mix(blendColor.rgb, baseWaterColor.rgb, specularMapValue);\n\
material.diffuse += (0.1 * tsPerturbationRatio);\n\
material.normal = normalize(materialInput.tangentToEyeMatrix * normalTangentSpace);\n\
material.specular = specularIntensity;\n\
material.shininess = 10.0;\n\
return material;\n\
}\n\
";
});