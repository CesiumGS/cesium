uniform float u_globeMinimumAltitude;

attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 normal;
attribute float isBottom;
attribute vec4 color;
attribute float batchId;

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
    float delta = min(u_globeMinimumAltitude, czm_LODNegativeGeometricToleranceOverDistance * length(position.xyz));

    if (isBottom == 1.0)
    {
        position = position + vec4(normal.xyz * 40.0, 0);
    }
    gl_Position = depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);
}
