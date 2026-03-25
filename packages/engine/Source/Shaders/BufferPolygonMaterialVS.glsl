in vec3 positionHigh;
in vec3 positionLow;
in vec4 pickColor;
in vec2 showAndColor;

out vec4 v_pickColor;
out vec4 v_color;

void main()
{
    float show = showAndColor.x;
    vec4 color = czm_decodeRGB8(showAndColor.y);

    ///////////////////////////////////////////////////////////////////////////

    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;

    ///////////////////////////////////////////////////////////////////////////

    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth();

    v_pickColor = pickColor / 255.0;

    v_color = color;
    v_color.a *= show;

    gl_Position *= show;
}
