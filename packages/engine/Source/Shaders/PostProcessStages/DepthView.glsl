uniform sampler2D depthTexture;

in vec2 v_textureCoordinates;

void main(void)
{
    float depth = czm_readDepth(depthTexture, v_textureCoordinates);
    out_FragColor = vec4(vec3(depth), 1.0);
}
