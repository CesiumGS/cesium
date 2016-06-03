varying vec4 v_color;
varying vec4 v_outlineColor;
varying float v_innerPercent;
varying float v_pixelDistance;

#ifdef RENDER_FOR_PICK
varying vec4 v_pickColor;
#endif

void main()
{
    // The distance in UV space from this fragment to the center of the point, at most 0.5.
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    // The max distance stops one pixel shy of the edge to leave space for anti-aliasing.
    float maxDistance = max(0.0, 0.5 - v_pixelDistance);
    float wholeAlpha = 1.0 - smoothstep(maxDistance, 0.5, distanceToCenter);
    float innerAlpha = 1.0 - smoothstep(maxDistance * v_innerPercent, 0.5 * v_innerPercent, distanceToCenter);

    vec4 color = mix(v_outlineColor, v_color, innerAlpha);
    color.a *= wholeAlpha;
    if (color.a < 0.005)
    {
        discard;
    }

#ifdef RENDER_FOR_PICK
    gl_FragColor = v_pickColor;
#else
    gl_FragColor = color;
#endif
}