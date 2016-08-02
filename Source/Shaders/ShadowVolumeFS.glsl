#extension GL_EXT_frag_depth : enable

// emulated noperspective
varying float v_WindowZ;

#ifndef VECTOR_TILE
varying vec4 v_color;
#endif

void writeDepthClampedToFarPlane()
{
    gl_FragDepthEXT = min(v_WindowZ * gl_FragCoord.w, 1.0);
}

void main(void)
{
#ifdef VECTOR_TILE
    gl_FragColor = vec4(1.0);
#else
    gl_FragColor = v_color;
#endif
    writeDepthClampedToFarPlane();
}