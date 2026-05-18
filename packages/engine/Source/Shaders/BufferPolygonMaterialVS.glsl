#ifdef USE_FLOAT64
in vec3 positionHigh;
in vec3 positionLow;
#else
in vec3 position;
#endif
in vec4 pickColor;
in vec3 showColorAlpha;

out vec4 v_pickColor;
out vec4 v_color;

void main()
{
    float show = showColorAlpha.x;
    vec4 color = czm_decodeRGB8(showColorAlpha.y);
    float alpha = showColorAlpha.z;

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
    v_color.a *= alpha * show;

    gl_Position *= show;
}
