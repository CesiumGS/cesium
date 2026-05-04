in vec4 v_pickColor;
flat in float v_selected;

uniform vec4 u_pointColor;
uniform vec4 u_pointSelectedColor;

void main()
{
    // Distance from the point sprite's center, 0 to 0.5 across the quad.
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float delta = fwidth(distanceToCenter);
    float alpha = 1.0 - smoothstep(0.5 - delta, 0.5, distanceToCenter);

    vec4 baseColor = v_selected > 0.5 ? u_pointSelectedColor : u_pointColor;
    vec4 color = vec4(baseColor.rgb, baseColor.a * alpha);
    if (color.a < 0.005) // matches 0/255 and 1/255
    {
        discard;
    }

    out_FragColor = czm_gammaCorrect(color);
    czm_writeLogDepth();
}
