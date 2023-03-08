//This file is automatically rebuilt by the Cesium build process.
export default "varying vec3 v_cubeMapCoordinates;\n\
uniform samplerCube cubeMap;\n\
\n\
void main()\n\
{\n\
    vec4 rgba = textureCube(cubeMap, v_cubeMapCoordinates);\n\
    #ifdef RGBA_NORMALIZED\n\
        gl_FragColor = vec4(rgba.rgb, 1.0);\n\
    #else\n\
        float m = rgba.a * 16.0;\n\
        vec3 r = rgba.rgb * m;\n\
        gl_FragColor = vec4(r * r, 1.0);\n\
    #endif\n\
}\n\
";
