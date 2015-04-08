#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

//varying vec3 v_pointEC;

void czm_writeDepthClampedToFarPlane()
{
/*
#ifdef GL_EXT_frag_depth
    vec4 pointCC = czm_projection * vec4(v_pointEC, 1.0);
    float z = pointCC.z / pointCC.w;

    float n = czm_depthRange.near;
    float f = czm_depthRange.far;

    float depth = (z * (f - n) + f + n) * 0.5;
    depth = clamp(depth, n, f);
    //gl_FragDepthEXT = depth;
    
    //gl_FragDepthEXT = (z * (f - n) + f + n) * 0.5;
#endif
*/
}

void main(void)
{
    gl_FragColor = vec4(1.0, 1.0, 0.0, 0.5);
    czm_writeDepthClampedToFarPlane();
}