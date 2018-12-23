uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main()
{
    bool inBounds = 0.0 < v_textureCoordinates.x && v_textureCoordinates.x < 1.0 && 0.0 < v_textureCoordinates.y && v_textureCoordinates.y < 1.0;
    if (!inBounds) {
        discard;
    }

    gl_FragColor = texture2D(u_texture, v_textureCoordinates);
}
