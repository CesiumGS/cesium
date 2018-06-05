uniform sampler2D colorTexture;
uniform float gradations;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 rgb = texture2D(colorTexture, v_textureCoordinates).rgb;
    float luminance = czm_luminance(rgb);
    float darkness = luminance * gradations;
    darkness = (darkness - fract(darkness)) / gradations;
    gl_FragColor = vec4(vec3(darkness), 1.0);
}
