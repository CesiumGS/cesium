uniform sampler2D colorTexture;
uniform float gradations;

in vec2 v_textureCoordinates;

void main(void)
{
    vec3 rgb = texture(colorTexture, v_textureCoordinates).rgb;
#ifdef CZM_SELECTED_FEATURE
    if (czm_selected()) {
        out_FragColor = vec4(rgb, 1.0);
        return;
    }
#endif
    float luminance = czm_luminance(rgb);
    float darkness = luminance * gradations;
    darkness = (darkness - fract(darkness)) / gradations;
    out_FragColor = vec4(vec3(darkness), 1.0);
}
