varying vec4 v_color;

void main()
{
    gl_FragColor = czm_gammaCorrect(v_color);
}
