uniform sampler2D u_texture;
uniform float u_t;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 rgb = texture2D(u_texture, v_textureCoordinates).rgb;
    vec3 target = vec3(0.5);

    gl_FragColor = vec4(mix(target, rgb, u_t), 1.0);
}