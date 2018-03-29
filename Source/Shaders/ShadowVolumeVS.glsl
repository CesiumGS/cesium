#ifdef VECTOR_TILE
attribute vec3 position;
attribute float a_batchId;

uniform mat4 u_modifiedModelViewProjection;
#else
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
//attribute vec4 color;
attribute float batchId;
#endif

#ifdef EXTRUDED_GEOMETRY
attribute vec3 extrudeDirection;

uniform float u_globeMinimumAltitude;
#endif

#ifndef VECTOR_TILE
varying vec4 v_sphericalExtents;
varying vec2 v_inversePlaneExtents;
varying vec4 v_westPlane;
varying vec4 v_southPlane;
#endif

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#endif

void main()
{
#ifdef VECTOR_TILE
    gl_Position = czm_depthClampFarPlane(u_modifiedModelViewProjection * vec4(position, 1.0));
#else

#ifdef PER_INSTANCE_COLOR
    v_color = czm_batchTable_color(batchId);
#endif

    v_sphericalExtents = czm_batchTable_sphericalExtents(batchId);
    vec2 inversePlaneExtents = czm_batchTable_inversePlaneExtents(batchId);

    mat4 planesModel;
    planesMatrix[0] = czm_batchTable_column0(batchId);
    planesMatrix[1] = czm_batchTable_column1(batchId);
    planesMatrix[2] = czm_batchTable_column2(batchId);
    planesMatrix[3] = czm_batchTable_column3(batchId);

    // Planes in local ENU coordinate system
    vec4 westPlane = vec4(1.0, 0.0, 0.0, -0.5 / inversePlaneExtents.x);
    vec4 southPlane = vec4(0.0, 1.0, 0.0, -0.5 / inversePlaneExtents.y);

    mat4 planesModelView = czm_view * planesModel;

    v_inversePlaneExtents = inversePlaneExtents;
    v_westPlane = czm_transformPlane(westPlane, planesModelView);
    v_southPlane = czm_transformPlane(southPlane, planesModelView);

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
