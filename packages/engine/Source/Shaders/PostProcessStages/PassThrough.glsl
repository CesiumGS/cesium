uniform sampler2D colorTexture;

in vec2 v_textureCoordinates;

void main()
{
    out_FragColor = texture(colorTexture, v_textureCoordinates);
}
