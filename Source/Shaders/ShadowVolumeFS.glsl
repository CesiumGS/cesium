#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

varying float v_z;

void czm_writeDepthClampedToFarPlane()
{
    // That is really 1/w
    //gl_FragDepthEXT = min(v_z * gl_FragCoord.w, 1.0);   
    //gl_FragDepthEXT = clamp(v_z * gl_FragCoord.w, 0.0, 1.0);
}

void main(void)
{
    gl_FragColor = vec4(1.0, 1.0, 0.0, 0.5);
    czm_writeDepthClampedToFarPlane();
}