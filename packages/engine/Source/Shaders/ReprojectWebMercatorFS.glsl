uniform sampler2D u_texture;

in vec2 v_textureCoordinates;

void main()
{
    out_FragColor = texture(u_texture, v_textureCoordinates);
}
