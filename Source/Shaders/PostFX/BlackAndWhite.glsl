uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main(void)
{
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);

    float gradations = 5.0;
    vec3 rgb = texture2D(u_texture, v_textureCoordinates).rgb;
    float luminance = dot(rgb, W);

    float darkness = luminance * gradations;
    darkness = (darkness - fract(darkness)) / gradations;

    gl_FragColor = vec4(vec3(darkness), 1.0);
}
