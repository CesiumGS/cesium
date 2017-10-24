uniform sampler2D u_colorTexture;
uniform float u_brightness;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 rgb = texture2D(u_colorTexture, v_textureCoordinates).rgb;
    vec3 target = vec3(0.0);
    gl_FragColor = vec4(mix(target, rgb, u_brightness), 1.0);
}
