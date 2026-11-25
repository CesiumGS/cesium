#ifdef USE_FLOAT64
in vec3 positionHigh;
in vec3 positionLow;
#else
in vec3 position;
#endif
in vec4 pickColor;
in vec4 showSizeColorAlpha;
in vec3 outlineWidthColorAlpha;

#ifdef USE_STYLE
uniform vec4 u_color;
uniform vec4 u_outlineColor;
uniform float u_pixelSize;
uniform float u_outlineWidth;
#endif

out vec4 v_pickColor;
out vec4 v_color;
out vec4 v_outlineColor;
out float v_innerRadiusFrac;

void main()
{
    // Unpack attributes.
    float show = showSizeColorAlpha.x;
#ifdef USE_STYLE
    float pixelSize = u_pixelSize;
    vec4 color = u_color;
    float outlineWidth = u_outlineWidth;
    // A zero-width outline takes the fill color to prevent subpixel bleeding.
    vec4 outlineColor = outlineWidth > 0.0 ? u_outlineColor : u_color;
#else
    float pixelSize = showSizeColorAlpha.y;
    vec4 color = czm_decodeRGB8(showSizeColorAlpha.z);
    color.a *= showSizeColorAlpha.w;
    float outlineWidth = outlineWidthColorAlpha.x;
    vec4 outlineColor = czm_decodeRGB8(outlineWidthColorAlpha.y);
    outlineColor.a *= outlineWidthColorAlpha.z;
#endif

    ///////////////////////////////////////////////////////////////////////////

    float innerRadius = 0.5 * pixelSize * czm_pixelRatio;
    float outerRadius = (0.5 * pixelSize + outlineWidth) * czm_pixelRatio;

    ///////////////////////////////////////////////////////////////////////////

#ifdef USE_FLOAT64
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;
#else
    vec4 positionEC = czm_modelView * vec4(position, 1.0);
#endif

    ///////////////////////////////////////////////////////////////////////////

    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth();

    v_pickColor = pickColor / 255.0;

    v_color = color;
    v_color.a *= show;

    v_outlineColor = outlineColor;
    v_outlineColor.a *= show;

    v_innerRadiusFrac = innerRadius / outerRadius;

    gl_PointSize = 2.0 * outerRadius * show;
    gl_Position *= show;
}
