#extension GL_EXT_frag_depth : enable

// emulated noperspective
varying float v_WindowZ;

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#else
varying vec4 v_color;
#endif

void writeDepthClampedToFarPlane()
{
    gl_FragDepthEXT = min(v_WindowZ * gl_FragCoord.w, 1.0);
}

void main(void)
{
#ifdef VECTOR_TILE
    gl_FragColor = u_highlightColor;
#else
    gl_FragColor = v_color;
#endif
    writeDepthClampedToFarPlane();
}