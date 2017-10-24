uniform sampler2D u_colorTexture;
uniform float u_gradations;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 rgb = texture2D(u_colorTexture, v_textureCoordinates).rgb;
    float luminance = czm_luminance(rgb);
    float darkness = luminance * u_gradations;
    darkness = (darkness - fract(darkness)) / u_gradations;
    gl_FragColor = vec4(vec3(darkness), 1.0);
}
