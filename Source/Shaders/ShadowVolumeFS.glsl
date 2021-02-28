#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

void main(void)
{
#ifdef VECTOR_TILE
    gl_FragColor = czm_gammaCorrect(u_highlightColor);
#else
    gl_FragColor = vec4(1.0);
#endif
    czm_writeDepthClamp();
}
