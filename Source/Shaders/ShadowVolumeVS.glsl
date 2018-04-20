#ifdef VECTOR_TILE
attribute vec3 position;
attribute float a_batchId;

uniform mat4 u_modifiedModelViewProjection;
#else
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute float batchId;
#endif

#ifdef EXTRUDED_GEOMETRY
attribute vec3 extrudeDirection;

uniform float u_globeMinimumAltitude;
#endif

void main()
{
#ifdef VECTOR_TILE
    gl_Position = czm_depthClampFarPlane(u_modifiedModelViewProjection * vec4(position, 1.0));
#else
    vec4 position = czm_computePosition();

#ifdef EXTRUDED_GEOMETRY
    float delta = min(u_globeMinimumAltitude, czm_geometricToleranceOverMeter * length(position.xyz));
    delta *= czm_sceneMode == czm_sceneMode3D ? 1.0 : 0.0;

    //extrudeDirection is zero for the top layer
    position = position + vec4(extrudeDirection * delta, 0.0);
#endif
    gl_Position = czm_depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);
#endif
}
