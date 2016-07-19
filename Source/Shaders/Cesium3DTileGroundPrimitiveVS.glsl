attribute vec3 position;
attribute vec4 color;

uniform mat4 u_modifiedModelViewProjection;

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
    gl_Position = depthClampFarPlane(u_modifiedModelViewProjection * vec4(position, 1.0));
}
