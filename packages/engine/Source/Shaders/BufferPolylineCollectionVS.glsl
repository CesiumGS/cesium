in vec4 positionHighAndShow;
in vec4 positionLowAndColor;

out vec4 v_color;

void main()
{
    // Unpack attributes.
    vec3 positionHigh = positionHighAndShow.xyz;
    vec3 positionLow = positionLowAndColor.xyz;
    float show = positionHighAndShow.w;
    vec4 color = czm_decodeRGB8(positionLowAndColor.w);

    ///////////////////////////////////////////////////////////////////////////

    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;

    ///////////////////////////////////////////////////////////////////////////

    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth();

    v_color = color;
    v_color.a *= show;

    gl_Position *= show;
}
