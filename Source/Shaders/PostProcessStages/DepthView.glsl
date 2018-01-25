uniform sampler2D depthTexture;

varying vec2 v_textureCoordinates;

void main(void)
{
    float depth = texture2D(depthTexture, v_textureCoordinates).r;
    gl_FragColor = vec4(vec3(depth), 1.0);
}
