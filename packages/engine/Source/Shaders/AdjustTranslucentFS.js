//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef MRT\n\
layout (location = 0) out vec4 out_FragData_0;\n\
layout (location = 1) out vec4 out_FragData_1;\n\
#else\n\
layout (location = 0) out vec4 out_FragColor;\n\
#endif\n\
\n\
uniform vec4 u_bgColor;\n\
uniform sampler2D u_depthTexture;\n\
\n\
in vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    if (texture(u_depthTexture, v_textureCoordinates).r < 1.0)\n\
    {\n\
#ifdef MRT\n\
        out_FragData_0 = u_bgColor;\n\
        out_FragData_1 = vec4(u_bgColor.a);\n\
#else\n\
        out_FragColor = u_bgColor;\n\
#endif\n\
        return;\n\
    }\n\
    \n\
    discard;\n\
}\n\
";
