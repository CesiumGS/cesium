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

// Fully transparent parts of the billboard are not pickable.
#if defined(RENDER_FOR_PICK) || (!defined(OPAQUE) && !defined(TRANSLUCENT))
    if (color.a < 0.005)   // matches 0/255 and 1/255
    {
        discard;
    }
#else
// The billboard is rendered twice. The opaque pass discards translucent fragments
// and the translucent pass discards opaque fragments.
#ifdef OPAQUE
    if (color.a < 0.995)   // matches < 254/255
    {
        discard;
    }
#else
    if (color.a >= 0.995)  // matches 254/255 and 255/255
    {
        discard;
    }
#endif
#endif

#ifdef RENDER_FOR_PICK
    gl_FragColor = v_pickColor;
#else
    gl_FragColor = color;
#endif
}
