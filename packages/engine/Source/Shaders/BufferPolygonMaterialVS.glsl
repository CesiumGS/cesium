#ifdef QUANTIZED_POSITIONS
in vec3 position;
#else
in vec3 positionHigh;
in vec3 positionLow;
#endif
in vec4 pickColor;
in vec2 showAndColor;

out vec4 v_pickColor;
out vec4 v_color;

void main()
{
    float show = showAndColor.x;
    vec4 color = czm_decodeRGB8(showAndColor.y);

    ///////////////////////////////////////////////////////////////////////////

#ifdef QUANTIZED_POSITIONS
    // Normalized integer positions are hardware-decoded to [-1, 1] by the attribute pipeline.
    vec4 positionEC = czm_modelView * vec4(position, 1.0);
#else
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;
#endif

    ///////////////////////////////////////////////////////////////////////////

    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth();

    v_pickColor = pickColor / 255.0;

    v_color = color;
    v_color.a *= show;

    gl_Position *= show;
}
