#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

void main(void)
{
#ifdef VECTOR_TILE
    out_FragColor = czm_gammaCorrect(u_highlightColor);
#else
    out_FragColor = vec4(1.0);
#endif
    czm_writeDepthClamp();
}
