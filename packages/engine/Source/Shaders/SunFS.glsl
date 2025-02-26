uniform sampler2D u_texture;

in vec2 v_textureCoordinates;

void main()
{
    vec4 color = texture(u_texture, v_textureCoordinates);
    out_FragColor = czm_gammaCorrect(color);
}
