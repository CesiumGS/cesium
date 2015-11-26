#extension GL_EXT_frag_depth : enable

// emulated noperspective
varying float v_WindowZ;
varying vec4 v_color;

void writeDepthClampedToFarPlane()
{
    gl_FragDepthEXT = min(v_WindowZ * gl_FragCoord.w, 1.0);
}

void main(void)
{
    gl_FragColor = v_color;
    writeDepthClampedToFarPlane();
}