#ifdef LOG_DEPTH
varying float v_logZ;
#endif

void czm_writeLogZ(float logZ)
{
#if defined(GL_EXT_frag_depth) && defined(LOG_DEPTH)
    gl_FragDepthEXT = log2(logZ) / log2(czm_currentFrustum.y + 1.0);
#endif
}

void czm_writeLogZ() {
#ifdef LOG_DEPTH
    czm_writeLogZ(v_logZ);
#endif
}
