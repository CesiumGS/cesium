uniform sampler2D u_atlas;

varying vec2 v_textureCoordinates;
varying vec4 v_color;
varying vec4 v_pickColor;

void main()
{
    vec4 color = texture2D(u_atlas, v_textureCoordinates) * v_color;

    if (color.a == 0.0)
    {
        discard;
    }
    
#ifdef RENDER_FOR_PICK    
    gl_FragColor = v_pickColor;
#else
    gl_FragColor = color;
#endif    
}