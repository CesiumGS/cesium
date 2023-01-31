uniform sampler2D colorTexture;
uniform sampler2D bloomTexture;
uniform bool glowOnly;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec4 color = texture2D(colorTexture, v_textureCoordinates);

#ifdef CZM_SELECTED_FEATURE
    if (czm_selected()) {
        gl_FragColor = color;
        return;
    }
#endif

    vec4 bloom = texture2D(bloomTexture, v_textureCoordinates);
    gl_FragColor = glowOnly ? bloom : bloom + color;
}
