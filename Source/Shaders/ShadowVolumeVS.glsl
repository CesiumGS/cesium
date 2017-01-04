attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 extrudeDirection;
attribute vec4 color;
attribute float batchId;

uniform float u_globeMinimumAltitude;

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
    float delta = min(u_globeMinimumAltitude, czm_geometricToleranceOverMeter * length(position.xyz));

    //extrudeDirection is zero for the top layer
    position = position + vec4(extrudeDirection * delta, 0.0);
    gl_Position = depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);
}
