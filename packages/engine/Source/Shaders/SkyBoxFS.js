//This file is automatically rebuilt by the Cesium build process.
export default "uniform samplerCube u_cubeMap;\n\
\n\
in vec3 v_texCoord;\n\
\n\
void main()\n\
{\n\
    vec4 color = czm_textureCube(u_cubeMap, normalize(v_texCoord));\n\
    out_FragColor = vec4(czm_gammaCorrect(color).rgb, czm_morphTime);\n\
}\n\
";
