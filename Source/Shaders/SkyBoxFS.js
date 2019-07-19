//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform samplerCube u_cubeMap;\n\
\n\
varying vec3 v_texCoord;\n\
\n\
void main()\n\
{\n\
    vec4 color = textureCube(u_cubeMap, normalize(v_texCoord));\n\
    gl_FragColor = vec4(czm_gammaCorrect(color).rgb, czm_morphTime);\n\
}\n\
";
});