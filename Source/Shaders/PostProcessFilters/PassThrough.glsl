uniform sampler2D u_colorTexture;

varying vec2 v_textureCoordinates;

void main()
{
    gl_FragColor = texture2D(u_colorTexture, v_textureCoordinates);
}
