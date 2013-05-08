uniform sampler2D u_texture0;
uniform sampler2D u_texture1;

varying vec2 v_textureCoordinates;

void main()
{
    vec4 color0 = texture2D(u_texture0, v_textureCoordinates);
    vec4 color1 = texture2D(u_texture1, v_textureCoordinates);
    
    gl_FragColor = color0 + color1;
}
