uniform sampler2D depthTexture;
uniform float length;
uniform vec4 color;

in vec2 v_textureCoordinates;

void main(void)
{
    float directions[3];
    directions[0] = -1.0;
    directions[1] = 0.0;
    directions[2] = 1.0;

    float scalars[3];
    scalars[0] = 3.0;
    scalars[1] = 10.0;
    scalars[2] = 3.0;

    float padx = czm_pixelRatio / czm_viewport.z;
    float pady = czm_pixelRatio / czm_viewport.w;

#ifdef CZM_SELECTED_FEATURE
    bool selected = false;
    for (int i = 0; i < 3; ++i)
    {
        float dir = directions[i];
        selected = selected || czm_selected(vec2(-padx, dir * pady));
        selected = selected || czm_selected(vec2(padx, dir * pady));
        selected = selected || czm_selected(vec2(dir * padx, -pady));
        selected = selected || czm_selected(vec2(dir * padx, pady));
        if (selected)
        {
            break;
        }
    }
    if (!selected)
    {
        out_FragColor = vec4(color.rgb, 0.0);
        return;
    }
#endif

    float horizEdge = 0.0;
    float vertEdge = 0.0;

    for (int i = 0; i < 3; ++i)
    {
        float dir = directions[i];
        float scale = scalars[i];

        horizEdge -= texture(depthTexture, v_textureCoordinates + vec2(-padx, dir * pady)).x * scale;
        horizEdge += texture(depthTexture, v_textureCoordinates + vec2(padx, dir * pady)).x * scale;

        vertEdge -= texture(depthTexture, v_textureCoordinates + vec2(dir * padx, -pady)).x * scale;
        vertEdge += texture(depthTexture, v_textureCoordinates + vec2(dir * padx, pady)).x * scale;
    }

    float len = sqrt(horizEdge * horizEdge + vertEdge * vertEdge);
    out_FragColor = vec4(color.rgb, len > length ? color.a : 0.0);
}
