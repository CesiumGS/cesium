uniform sampler2D colorTexture;
uniform sampler2D bloomTexture;
uniform bool glowOnly;

in vec2 v_textureCoordinates;

void main(void)
{
    vec4 color = texture(colorTexture, v_textureCoordinates);

#ifdef CZM_SELECTED_FEATURE
    if (czm_selected()) {
        out_FragColor = color;
        return;
    }
#endif

    vec4 bloom = texture(bloomTexture, v_textureCoordinates);
    out_FragColor = glowOnly ? bloom : bloom + color;
}
