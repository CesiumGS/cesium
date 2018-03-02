#ifdef LOG_DEPTH
varying float v_logZ;
#endif

void czm_writeLogZ(float logZ)
{
#if defined(GL_EXT_frag_depth) && defined(LOG_DEPTH) && !defined(DISABLE_LOG_DEPTH_FRAGMENT_WRITE)
    float halfLogFarDistance = czm_logFarDistance * 0.5;
    gl_FragDepthEXT = log2(logZ) * halfLogFarDistance;
#endif
}

void czm_writeLogZ() {
#ifdef LOG_DEPTH
    czm_writeLogZ(v_logZ);
#endif
}
