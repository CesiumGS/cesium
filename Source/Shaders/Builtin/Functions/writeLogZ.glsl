#ifdef LOG_DEPTH
varying float v_logZ;
#endif

void czm_writeLogZ(float logZ)
{
#if defined(GL_EXT_frag_depth) && defined(LOG_DEPTH)
    float Fcoef = 2.0 / log2(czm_currentFrustum.y + 1.0);
    float Fcoef_half = 0.5 * Fcoef;
    gl_FragDepthEXT = log2(logZ) * Fcoef_half;
#endif
}

void czm_writeLogZ() {
#ifdef LOG_DEPTH
    czm_writeLogZ(v_logZ);
#endif
}
