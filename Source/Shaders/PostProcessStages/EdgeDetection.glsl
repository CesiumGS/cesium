uniform sampler2D depthTexture;
uniform float length;
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

    for (int i = 0; i < 3; ++i) {
        float dir = directions[i];
        float scale = scalars[i];

        horizEdge -= texture2D(depthTexture, v_textureCoordinates + vec2(-padx, dir * pady)).x * scale;
        horizEdge += texture2D(depthTexture, v_textureCoordinates + vec2(padx, dir * pady)).x * scale;

        vertEdge -= texture2D(depthTexture, v_textureCoordinates + vec2(dir * padx, -pady)).x * scale;
        vertEdge += texture2D(depthTexture, v_textureCoordinates + vec2(dir * padx, pady)).x * scale;
    }

    float len = sqrt(horizEdge * horizEdge + vertEdge * vertEdge);
    float alpha = len > length ? 1.0 : 0.0;
    gl_FragColor = vec4(color.rgb, alpha);
}
