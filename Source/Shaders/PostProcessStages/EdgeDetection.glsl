uniform sampler2D depthTexture;
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

    float frustum = czm_readDepth(depthTexture, v_textureCoordinates).y;

    for (int i = 0; i < 3; ++i) {
        float dir = directions[i];
        float scale = scalars[i];

        vec2 negHoriz = czm_readDepth(depthTexture, v_textureCoordinates + vec2(-padx, dir * pady));
        vec2 posHoriz = czm_readDepth(depthTexture, v_textureCoordinates + vec2(padx, dir * pady));

        vec2 negVert = czm_readDepth(depthTexture, v_textureCoordinates + vec2(dir * padx, -pady));
        vec2 posVert = czm_readDepth(depthTexture, v_textureCoordinates + vec2(dir * padx, pady));

        if (negHoriz.y != frustum || negHoriz.y != posHoriz.y || negVert.y != posVert.y || negHoriz.y != negVert.y)
        {
            gl_FragColor = vec4(color.rgb, 0.0);
            return;
        }

        horizEdge -= negHoriz.x * scale;
        horizEdge += posHoriz.x * scale;

        vertEdge -= negVert.x * scale;
        vertEdge += posVert.x * scale;
    }

    float len = sqrt(horizEdge * horizEdge + vertEdge * vertEdge);
    float alpha = len > length ? 1.0 : 0.0;
    gl_FragColor = vec4(color.rgb, alpha);
}
