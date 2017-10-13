varying vec4 v_color;
varying vec4 v_position;

void main()
{
    gl_FragColor = v_color;
    czm_logDepth(v_position.w);
}
