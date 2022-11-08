in vec4 v_color;

void main()
{
    out_FragColor = czm_gammaCorrect(v_color);
}
