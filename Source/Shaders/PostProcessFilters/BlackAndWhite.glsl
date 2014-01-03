uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main()
{
    float gradations = 5.0;
    vec3 rgb = texture2D(u_texture, v_textureCoordinates).rgb;
    float luminance = czm_luminance(rgb);

    float darkness = luminance * gradations;
    darkness = (darkness - fract(darkness)) / gradations;

    gl_FragColor = vec4(vec3(darkness), 1.0);
}
