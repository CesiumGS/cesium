//attribute vec3 positionHigh;
//attribute vec3 positionLow;
//attribute vec3 normal;
//attribute float extrude;

attribute vec3 position3DHigh;
attribute vec3 position3DLow;

uniform float centralBodyMinimumAltitude;
uniform float LODNegativeToleranceOverDistance;

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
    //vec4 position = czm_translateRelativeToEye(positionHigh, positionLow);
    
    vec4 position = czm_translateRelativeToEye(position3DHigh, position3DLow);
    
    //float delta = 1.0; // TODO: moving the vertex is a function of the view
    //position.xyz = position.xyz + extrude * normal * delta;
    
    gl_Position = depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);
}
