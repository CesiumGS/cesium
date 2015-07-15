#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

#ifdef GL_EXT_frag_depth
// emulated noperspective
varying float v_WindowZ;
#endif

void writeDepthClampedToFarPlane()
{
#ifdef GL_EXT_frag_depth
    gl_FragDepthEXT = min(v_WindowZ * gl_FragCoord.w, 1.0);
#endif
}

void main(void)
{
    gl_FragColor = vec4(1.0, 1.0, 0.0, 0.5);
    writeDepthClampedToFarPlane();
}