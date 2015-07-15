attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec4 color;

varying vec4 v_color;

#ifdef GL_EXT_frag_depth
// emulated noperspective
varying float v_WindowZ;
#endif

vec4 depthClampFarPlane(vec4 vertexInClipCoordinates)
{
#ifdef GL_EXT_frag_depth
    v_WindowZ = (0.5 * (vertexInClipCoordinates.z / vertexInClipCoordinates.w) + 0.5) * vertexInClipCoordinates.w;
    vertexInClipCoordinates.z = min(vertexInClipCoordinates.z, vertexInClipCoordinates.w);
#endif
    return vertexInClipCoordinates;
}

void main()
{
    v_color = color;
    
    vec4 position = czm_computePosition();
    gl_Position = depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);
}
