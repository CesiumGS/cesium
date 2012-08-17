uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main(void)
{
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);

    vec3 rgb = texture2D(u_texture, v_textureCoordinates).rgb;
    float luminance = dot(rgb, W);

    gl_FragColor = vec4(vec3(luminance), 1.0);
}
