uniform sampler2D u_atlas;

varying vec4 v_color;
varying vec4 v_outlineColor;
varying float v_innerPercent;
varying float v_pixelDistance;

#ifdef RENDER_FOR_PICK
varying vec4 v_pickColor;
#endif

void main()
{
    float distance = length(gl_PointCoord - vec2(0.5));
    float innerDistance = max(0.0, 0.5 - v_pixelDistance);
    float whole = 1.0 - smoothstep(innerDistance, 0.5, distance);
    float inner = 1.0 - smoothstep(innerDistance * v_innerPercent, 0.5 * v_innerPercent, distance);

    vec4 color = mix(v_outlineColor, v_color, inner);
    color.a *= whole;
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