void czm_logDepth(float w)
{
#ifdef GL_EXT_frag_depth
    gl_FragDepthEXT = -log(w * czm_currentFrustum.x) / log( czm_currentFrustum.y / czm_currentFrustum.x);
#endif
}
