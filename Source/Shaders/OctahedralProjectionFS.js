//This file is automatically rebuilt by the Cesium build process.
export default "varying vec3 v_cubeMapCoordinates;\n\
uniform samplerCube cubeMap;\n\
\n\
void main()\n\
{\n\
    vec4 rgbm = textureCube(cubeMap, v_cubeMapCoordinates);\n\
    float m = rgbm.a * 16.0;\n\
    vec3 r = rgbm.rgb * m;\n\
    gl_FragColor = vec4(r * r, 1.0);\n\
}\n\
";
