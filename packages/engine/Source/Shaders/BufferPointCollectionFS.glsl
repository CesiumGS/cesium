in vec4 v_color;

void main()
{
    if (v_color.a < 0.005)   // matches 0/255 and 1/255
    {
        discard;
    }

    out_FragColor = czm_gammaCorrect(v_color);
    czm_writeLogDepth();
}
