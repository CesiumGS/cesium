// emulated noperspective
varying float v_WindowZ;
varying vec4 v_color;
varying float v_inverse_depth;

void writeDepthClampedToFarPlane()
{
#ifdef GL_EXT_frag_depth
    gl_FragDepthEXT = min(v_WindowZ * gl_FragCoord.w, 1.0);
#endif
}

void main(void)
{
    gl_FragColor = v_color;
    czm_logDepth(v_inverse_depth);
}
