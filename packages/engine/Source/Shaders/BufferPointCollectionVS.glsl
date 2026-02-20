in vec4 positionHighAndShow;
in vec4 positionLowAndColor;
in vec4 pixelSizeAndOutline;

out vec4 v_color;
out vec4 v_outlineColor;
out float v_innerRadiusFrac;

void main()
{
    // Unpack attributes.
    vec3 positionHigh = positionHighAndShow.xyz;
    vec3 positionLow = positionLowAndColor.xyz;
    float show = positionHighAndShow.w;
    vec4 color = czm_decodeRGB8(positionLowAndColor.w);
    float pixelSize = pixelSizeAndOutline.x;
    float outlineWidth = pixelSizeAndOutline.y;
    vec4 outlineColor = czm_decodeRGB8(pixelSizeAndOutline.z);

    ///////////////////////////////////////////////////////////////////////////

    float innerRadius = 0.5 * pixelSize * czm_pixelRatio;
    float outerRadius = (0.5 * pixelSize + outlineWidth) * czm_pixelRatio;

    ///////////////////////////////////////////////////////////////////////////

    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;

    ///////////////////////////////////////////////////////////////////////////

    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth();

    v_color = color;
    v_color.a *= show;

    v_outlineColor = outlineColor;
    v_outlineColor.a *= show;

    v_innerRadiusFrac = innerRadius / outerRadius;

    gl_PointSize = 2.0 * outerRadius * show;
    gl_Position *= show;
}
