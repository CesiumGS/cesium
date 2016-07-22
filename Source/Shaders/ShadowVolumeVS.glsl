#ifdef VECTOR_TILE
attribute vec3 position;
attribute vec4 color;

// TODO: remove
attribute float a_batchId;

uniform mat4 u_modifiedModelViewProjection;
#else
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec4 color;
#endif

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

#ifdef VECTOR_TILE
    gl_Position = depthClampFarPlane(u_modifiedModelViewProjection * vec4(position, 1.0));
#else
    vec4 position = czm_computePosition();
    gl_Position = depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);
#endif
}
