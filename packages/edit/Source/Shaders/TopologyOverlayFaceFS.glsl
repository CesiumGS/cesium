in vec4 v_pickColor;

uniform vec4 u_faceColor;

void main()
{
    if (u_faceColor.a < 0.005)
    {
        discard;
    }
    out_FragColor = czm_gammaCorrect(u_faceColor);
    czm_writeLogDepth();
}
