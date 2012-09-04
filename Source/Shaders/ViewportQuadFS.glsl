uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main()
{
    vec4 c = texture2D(u_texture, v_textureCoordinates);
    
    if (c.a == 0.0)
    {
        discard;
    }
    
    gl_FragColor = c;
}