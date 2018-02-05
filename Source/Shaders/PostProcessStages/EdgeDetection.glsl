uniform sampler2D depthTexture;
uniform sampler2D idTexture;
uniform float length;
uniform float stepSize;
uniform vec4 color;

varying vec2 v_textureCoordinates;

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

    float padx = 1.0 / czm_viewport.z;
    float pady = 1.0 / czm_viewport.w;

    float horizEdge = 0.0;
    float vertEdge = 0.0;

/*
    if (all(equal(texture2D(idTexture, v_textureCoordinates), vec4(0.0))))
    {
        gl_FragColor = vec4(color.rgb, 0.0);
        return;
    }
    */
    bool found = false;

    for (int i = 0; i < 3; ++i)
    {
        float dir = directions[i];
        float scale = scalars[i];

        horizEdge -= texture2D(depthTexture, v_textureCoordinates + vec2(-padx, dir * pady)).x * scale;
        horizEdge += texture2D(depthTexture, v_textureCoordinates + vec2(padx, dir * pady)).x * scale;

        vertEdge -= texture2D(depthTexture, v_textureCoordinates + vec2(dir * padx, -pady)).x * scale;
        vertEdge += texture2D(depthTexture, v_textureCoordinates + vec2(dir * padx, pady)).x * scale;

        if (found)
        {
            continue;
        }

        vec4 horizEdge0 = texture2D(idTexture, v_textureCoordinates + vec2(-padx, dir * pady));
        vec4 horizEdge1 = texture2D(idTexture, v_textureCoordinates + vec2(padx, dir * pady));

        vec4 vertEdge0 = texture2D(idTexture, v_textureCoordinates + vec2(dir * padx, -pady));
        vec4 vertEdge1 = texture2D(idTexture, v_textureCoordinates + vec2(dir * padx, pady));

        found = !all(equal(horizEdge0, vec4(0.0)));
        found = found || !all(equal(horizEdge1, vec4(0.0)));
        found = found || !all(equal(vertEdge0, vec4(0.0)));
        found = found || !all(equal(vertEdge1, vec4(0.0)));
    }

    if (!found)
    {
        gl_FragColor = vec4(color.rgb, 0.0);
        return;
    }

    float len = sqrt(horizEdge * horizEdge + vertEdge * vertEdge);
    float alpha = len > length ? 1.0 : 0.0;
    gl_FragColor = vec4(color.rgb, alpha);
}
