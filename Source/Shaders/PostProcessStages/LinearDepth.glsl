uniform sampler2D depthTexture;

varying vec2 v_textureCoordinates;

float linearDepth(float depth)
{
    float far = czm_currentFrustum.y;
    float near = czm_currentFrustum.x;
    return (2.0 * near) / (far + near - depth * (far - near));
}

void main(void)
{
    float depth = czm_readDepth(depthTexture, v_textureCoordinates);
    gl_FragColor = vec4(linearDepth(depth));
}
