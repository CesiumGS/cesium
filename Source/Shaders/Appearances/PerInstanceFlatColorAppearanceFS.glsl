varying vec4 v_color;

void main()
{
    gl_FragColor = czm_gammaCorrect(czm_readNonPerspective(v_color, gl_FragCoord.w));
}
