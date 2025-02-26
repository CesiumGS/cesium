uniform sampler2D colorTexture;
uniform float brightness;

in vec2 v_textureCoordinates;

void main(void)
{
    vec3 rgb = texture(colorTexture, v_textureCoordinates).rgb;
    vec3 target = vec3(0.0);
    out_FragColor = vec4(mix(target, rgb, brightness), 1.0);
}
