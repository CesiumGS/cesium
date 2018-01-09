varying vec4 v_color;
varying float v_inverse_depth;

void main()
{
    gl_FragColor = v_color;
    czm_logDepth(v_inverse_depth);
}
