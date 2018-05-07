uniform sampler2D depthTexture;

varying vec2 v_textureCoordinates;

void main(void)
{
    float depth = czm_readDepth(depthTexture, v_textureCoordinates);
    gl_FragColor = vec4(vec3(depth), 1.0);
}
