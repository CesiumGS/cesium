//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec4 color;\n\
uniform vec4 rimColor;\n\
uniform float width;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    // See http://www.fundza.com/rman_shaders/surface/fake_rim/fake_rim1.html\n\
    float d = 1.0 - dot(materialInput.normalEC, normalize(materialInput.positionToEyeEC));\n\
    float s = smoothstep(1.0 - width, 1.0, d);\n\
\n\
    vec4 outColor = czm_gammaCorrect(color);\n\
    vec4 outRimColor = czm_gammaCorrect(rimColor);\n\
\n\
    material.diffuse = outColor.rgb;\n\
    material.emission = outRimColor.rgb * s;\n\
    material.alpha = mix(outColor.a, outRimColor.a, s);\n\
\n\
    return material;\n\
}\n\
";
