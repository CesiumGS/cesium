//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D depthTexture;\n\
uniform float length;\n\
uniform vec4 color;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    float directions[3];\n\
    directions[0] = -1.0;\n\
    directions[1] = 0.0;\n\
    directions[2] = 1.0;\n\
\n\
    float scalars[3];\n\
    scalars[0] = 3.0;\n\
    scalars[1] = 10.0;\n\
    scalars[2] = 3.0;\n\
\n\
    float padx = czm_pixelRatio / czm_viewport.z;\n\
    float pady = czm_pixelRatio / czm_viewport.w;\n\
\n\
#ifdef CZM_SELECTED_FEATURE\n\
    bool selected = false;\n\
    for (int i = 0; i < 3; ++i)\n\
    {\n\
        float dir = directions[i];\n\
        selected = selected || czm_selected(vec2(-padx, dir * pady));\n\
        selected = selected || czm_selected(vec2(padx, dir * pady));\n\
        selected = selected || czm_selected(vec2(dir * padx, -pady));\n\
        selected = selected || czm_selected(vec2(dir * padx, pady));\n\
        if (selected)\n\
        {\n\
            break;\n\
        }\n\
    }\n\
    if (!selected)\n\
    {\n\
        gl_FragColor = vec4(color.rgb, 0.0);\n\
        return;\n\
    }\n\
#endif\n\
\n\
    float horizEdge = 0.0;\n\
    float vertEdge = 0.0;\n\
\n\
    for (int i = 0; i < 3; ++i)\n\
    {\n\
        float dir = directions[i];\n\
        float scale = scalars[i];\n\
\n\
        horizEdge -= texture2D(depthTexture, v_textureCoordinates + vec2(-padx, dir * pady)).x * scale;\n\
        horizEdge += texture2D(depthTexture, v_textureCoordinates + vec2(padx, dir * pady)).x * scale;\n\
\n\
        vertEdge -= texture2D(depthTexture, v_textureCoordinates + vec2(dir * padx, -pady)).x * scale;\n\
        vertEdge += texture2D(depthTexture, v_textureCoordinates + vec2(dir * padx, pady)).x * scale;\n\
    }\n\
\n\
    float len = sqrt(horizEdge * horizEdge + vertEdge * vertEdge);\n\
    gl_FragColor = vec4(color.rgb, len > length ? color.a : 0.0);\n\
}\n\
";
