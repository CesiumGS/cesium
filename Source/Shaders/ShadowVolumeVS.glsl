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

#ifdef SPHERICAL_EXTENTS
varying vec4 v_sphericalExtents;
varying vec4 v_stSineCosineUVScale;
#endif

#ifdef PLANAR_EXTENTS
varying vec2 v_inversePlaneExtents;
varying vec4 v_westPlane;
varying vec4 v_southPlane;
varying vec4 v_stSineCosineUVScale;
#endif

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

#ifdef SPHERICAL_EXTENTS
    v_sphericalExtents = czm_batchTable_sphericalExtents(batchId);
    v_stSineCosineUVScale = czm_batchTable_stSineCosineUVScale(batchId);
#endif

#ifdef PLANAR_EXTENTS
    vec3 southWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(czm_batchTable_southWest_HIGH(batchId), czm_batchTable_southWest_LOW(batchId))).xyz;
    vec3 northWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(czm_batchTable_northWest_HIGH(batchId), czm_batchTable_northWest_LOW(batchId))).xyz;
    vec3 southEastCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(czm_batchTable_southEast_HIGH(batchId), czm_batchTable_southEast_LOW(batchId))).xyz;

    vec3 eastWard = southEastCorner - southWestCorner;
    float eastExtent = length(eastWard);
    eastWard /= eastExtent;

    vec3 northWard = northWestCorner - southWestCorner;
    float northExtent = length(northWard);
    northWard /= northExtent;

    v_westPlane = vec4(eastWard, -dot(eastWard, southWestCorner));
    v_southPlane = vec4(northWard, -dot(northWard, southWestCorner));
    v_inversePlaneExtents = vec2(1.0 / eastExtent, 1.0 / northExtent);
    v_stSineCosineUVScale = czm_batchTable_stSineCosineUVScale(batchId);
#endif

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
