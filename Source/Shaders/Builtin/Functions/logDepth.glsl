void czm_logDepth(float z)
{
#ifdef GL_EXT_frag_depth
    gl_FragDepthEXT = log(z / czm_currentFrustum.x + 1.) / log( czm_currentFrustum.y / czm_currentFrustum.x + 1.);
#endif
}
