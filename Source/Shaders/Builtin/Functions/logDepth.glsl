void czm_logDepth(float w)
{
#if defined(GL_EXT_frag_depth) && defined(LOG_DEPTH)
    gl_FragDepthEXT = -log(w * czm_currentFrustum.x) / log( czm_currentFrustum.y / czm_currentFrustum.x);
#endif
}
