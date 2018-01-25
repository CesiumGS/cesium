uniform sampler2D colorTexture;
uniform float brightness;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 rgb = texture2D(colorTexture, v_textureCoordinates).rgb;
    vec3 target = vec3(0.0);
    gl_FragColor = vec4(mix(target, rgb, brightness), 1.0);
}
