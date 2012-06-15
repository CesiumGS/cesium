varying vec4 v_color;
varying vec4 v_pickColor;

void main()
{
#ifdef RENDER_FOR_PICK    
    gl_FragColor = v_pickColor;
#else
    gl_FragColor = v_color;
#endif   
}