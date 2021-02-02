//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef GL_OES_standard_derivatives\n\
    #extension GL_OES_standard_derivatives : enable\n\
#endif\n\
\n\
uniform vec4 color;\n\
uniform float spacing;\n\
uniform float width;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    float distanceToContour = mod(materialInput.height, spacing);\n\
\n\
#ifdef GL_OES_standard_derivatives\n\
    float dxc = abs(dFdx(materialInput.height));\n\
    float dyc = abs(dFdy(materialInput.height));\n\
    float dF = max(dxc, dyc) * czm_pixelRatio * width;\n\
    float alpha = (distanceToContour < dF) ? 1.0 : 0.0;\n\
#else\n\
    float alpha = (distanceToContour < (czm_pixelRatio * width)) ? 1.0 : 0.0;\n\
#endif\n\
\n\
    vec4 outColor = czm_gammaCorrect(vec4(color.rgb, alpha * color.a));\n\
    material.diffuse = outColor.rgb;\n\
    material.alpha = outColor.a;\n\
\n\
    return material;\n\
}\n\
";
