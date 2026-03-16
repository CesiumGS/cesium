in vec3 positionHigh;
in vec3 positionLow;
in vec3 showPixelSizeAndColor;
in vec2 outlineWidthAndOutlineColor;

out vec4 v_color;
out vec4 v_outlineColor;
out float v_innerRadiusFrac;

void main()
{
    // Unpack attributes.
    float show = showPixelSizeAndColor.x;
    float pixelSize = showPixelSizeAndColor.y;
    vec4 color = czm_decodeRGB8(showPixelSizeAndColor.z);
    float outlineWidth = outlineWidthAndOutlineColor.x;
    vec4 outlineColor = czm_decodeRGB8(outlineWidthAndOutlineColor.y);

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
