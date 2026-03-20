in vec4 v_color;
in vec4 v_outlineColor;
in float v_innerRadiusFrac;

void main()
{
    // Distance between fragment and point center, 0 to 0.5.
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float delta = fwidth(distanceToCenter);

    float outerLimit = 0.5;
    float innerLimit = 0.5 * v_innerRadiusFrac;

    float outerAlpha = 1.0 - smoothstep(max(0.0, outerLimit - delta), outerLimit, distanceToCenter);
    float innerAlpha = 1.0 - smoothstep(innerLimit - delta, innerLimit, distanceToCenter);

    vec4 color = vec4(mix(v_outlineColor.rgb, v_color.rgb, innerAlpha), outerAlpha);

    if (color.a < 0.005)   // matches 0/255 and 1/255
    {
        discard;
    }

    out_FragColor = czm_gammaCorrect(color);
    czm_writeLogDepth();
}
