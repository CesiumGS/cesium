in vec4 v_pickColor;
flat in float v_selected;
in float v_perp;

uniform vec4 u_edgeColor;
uniform vec4 u_edgeSelectedColor;

void main()
{
    // Anti-alias the long edges of the quad: v_perp goes from -1 to +1 across
    // the width, so |v_perp| reaches 1 at the geometric edge.
    float dist = abs(v_perp);
    float delta = fwidth(dist);
    float alpha = 1.0 - smoothstep(1.0 - delta, 1.0, dist);

    vec4 baseColor = v_selected > 0.5 ? u_edgeSelectedColor : u_edgeColor;
    vec4 color = vec4(baseColor.rgb, baseColor.a * alpha);
    if (color.a < 0.005) // matches 0/255 and 1/255
    {
        discard;
    }

    out_FragColor = czm_gammaCorrect(color);
    czm_writeLogDepth();
}
