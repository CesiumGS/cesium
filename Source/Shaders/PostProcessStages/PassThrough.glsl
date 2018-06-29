uniform sampler2D colorTexture;

varying vec2 v_textureCoordinates;

void main()
{
    gl_FragColor = texture2D(colorTexture, v_textureCoordinates);
}
