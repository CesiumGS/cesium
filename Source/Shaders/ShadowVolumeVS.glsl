#ifdef VECTOR_TILE
attribute vec3 position;
attribute float a_batchId;

uniform mat4 u_modifiedModelViewProjection;
#else
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec4 color;
attribute float batchId;
#endif

// emulated noperspective
varying float v_WindowZ;

#ifndef VECTOR_TILE
varying vec4 v_color;
#endif

vec4 depthClampFarPlane(vec4 vertexInClipCoordinates)
{
    v_WindowZ = (0.5 * (vertexInClipCoordinates.z / vertexInClipCoordinates.w) + 0.5) * vertexInClipCoordinates.w;
    vertexInClipCoordinates.z = min(vertexInClipCoordinates.z, vertexInClipCoordinates.w);
    return vertexInClipCoordinates;
}

void main()
{
#ifdef VECTOR_TILE
    gl_Position = depthClampFarPlane(u_modifiedModelViewProjection * vec4(position, 1.0));
#else
    v_color = color;

    vec4 position = czm_computePosition();
    gl_Position = depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);
#endif
}
