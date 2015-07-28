attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec4 color;

// emulated noperspective
varying float v_WindowZ;
varying vec4 v_color;

vec4 depthClampFarPlane(vec4 vertexInClipCoordinates)
{
    v_WindowZ = (0.5 * (vertexInClipCoordinates.z / vertexInClipCoordinates.w) + 0.5) * vertexInClipCoordinates.w;
    vertexInClipCoordinates.z = min(vertexInClipCoordinates.z, vertexInClipCoordinates.w);
    return vertexInClipCoordinates;
}

void main()
{
    v_color = color;
    
    vec4 position = czm_computePosition();
    gl_Position = depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);
}
