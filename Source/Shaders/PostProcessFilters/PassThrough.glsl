uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main() 
{
    gl_FragColor = texture2D(u_texture, v_textureCoordinates);
}
