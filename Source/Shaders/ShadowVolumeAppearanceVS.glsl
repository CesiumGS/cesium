attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute float batchId;

#ifdef EXTRUDED_GEOMETRY
attribute vec3 extrudeDirection;

uniform float u_globeMinimumAltitude;
#endif // EXTRUDED_GEOMETRY

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#endif // PER_INSTANCE_COLOR

#ifdef TEXTURE_COORDINATES
#ifdef SPHERICAL
varying vec4 v_sphericalExtents;
#else // SPHERICAL
varying vec2 v_inversePlaneExtents;
varying vec4 v_westPlane;
varying vec4 v_southPlane;
#endif // SPHERICAL
varying vec3 v_uvMinAndSphericalLongitudeRotation;
varying vec3 v_uMaxAndInverseDistance;
varying vec3 v_vMaxAndInverseDistance;
#endif // TEXTURE_COORDINATES

void main()
{
    vec4 position = czm_computePosition();

#ifdef EXTRUDED_GEOMETRY
    float delta = min(u_globeMinimumAltitude, czm_geometricToleranceOverMeter * length(position.xyz));
    delta *= czm_sceneMode == czm_sceneMode3D ? 1.0 : 0.0;

    //extrudeDirection is zero for the top layer
    position = position + vec4(extrudeDirection * delta, 0.0);
#endif

#ifdef TEXTURE_COORDINATES
#ifdef SPHERICAL
    v_sphericalExtents = czm_batchTable_sphericalExtents(batchId);
    v_uvMinAndSphericalLongitudeRotation.z = czm_batchTable_longitudeRotation(batchId);
#else // SPHERICAL
#ifdef COLUMBUS_VIEW_2D
    vec4 planes2D_high = czm_batchTable_planes2D_HIGH(batchId);
    vec4 planes2D_low = czm_batchTable_planes2D_LOW(batchId);

    // If the primitive is split across the IDL (planes2D_high.x > planes2D_high.w):
    // - If this vertex is on the east side of the IDL (position3DLow.y > 0.0, comparison with position3DHigh may produce artifacts)
    // - existing "east" is on the wrong side of the world, far away (planes2D_high/low.w)
    // - so set "east" as beyond the eastmost extent of the projection (idlSplitNewPlaneHiLow)
    vec2 idlSplitNewPlaneHiLow = vec2(EAST_MOST_X_HIGH - (WEST_MOST_X_HIGH - planes2D_high.w), EAST_MOST_X_LOW - (WEST_MOST_X_LOW - planes2D_low.w));
    bool idlSplit = planes2D_high.x > planes2D_high.w && position3DLow.y > 0.0;
    planes2D_high.w = czm_branchFreeTernary(idlSplit, idlSplitNewPlaneHiLow.x, planes2D_high.w);
    planes2D_low.w = czm_branchFreeTernary(idlSplit, idlSplitNewPlaneHiLow.y, planes2D_low.w);

    // - else, if this vertex is on the west side of the IDL (position3DLow.y < 0.0)
    // - existing "west" is on the wrong side of the world, far away (planes2D_high/low.x)
    // - so set "west" as beyond the westmost extent of the projection (idlSplitNewPlaneHiLow)
    idlSplit = planes2D_high.x > planes2D_high.w && position3DLow.y < 0.0;
    idlSplitNewPlaneHiLow = vec2(WEST_MOST_X_HIGH - (EAST_MOST_X_HIGH - planes2D_high.x), WEST_MOST_X_LOW - (EAST_MOST_X_LOW - planes2D_low.x));
    planes2D_high.x = czm_branchFreeTernary(idlSplit, idlSplitNewPlaneHiLow.x, planes2D_high.x);
    planes2D_low.x = czm_branchFreeTernary(idlSplit, idlSplitNewPlaneHiLow.y, planes2D_low.x);

    vec3 southWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(vec3(0.0, planes2D_high.xy), vec3(0.0, planes2D_low.xy))).xyz;
    vec3 northWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(vec3(0.0, planes2D_high.x, planes2D_high.z), vec3(0.0, planes2D_low.x, planes2D_low.z))).xyz;
    vec3 southEastCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(vec3(0.0, planes2D_high.w, planes2D_high.y), vec3(0.0, planes2D_low.w, planes2D_low.y))).xyz;
#else // COLUMBUS_VIEW_2D
    // 3D case has smaller "plane extents," so planes encoded as a 64 bit position and 2 vec3s for distances/direction
    vec3 southWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(czm_batchTable_southWest_HIGH(batchId), czm_batchTable_southWest_LOW(batchId))).xyz;
    vec3 northWestCorner = czm_normal * czm_batchTable_northward(batchId) + southWestCorner;
    vec3 southEastCorner = czm_normal * czm_batchTable_eastward(batchId) + southWestCorner;
#endif // COLUMBUS_VIEW_2D

    vec3 eastWard = southEastCorner - southWestCorner;
    float eastExtent = length(eastWard);
    eastWard /= eastExtent;

    vec3 northWard = northWestCorner - southWestCorner;
    float northExtent = length(northWard);
    northWard /= northExtent;

    v_westPlane = vec4(eastWard, -dot(eastWard, southWestCorner));
    v_southPlane = vec4(northWard, -dot(northWard, southWestCorner));
    v_inversePlaneExtents = vec2(1.0 / eastExtent, 1.0 / northExtent);
#endif // SPHERICAL
    vec4 uvMinAndExtents = czm_batchTable_uvMinAndExtents(batchId);
    vec4 uMaxVmax = czm_batchTable_uMaxVmax(batchId);

    v_uMaxAndInverseDistance = vec3(uMaxVmax.xy, uvMinAndExtents.z);
    v_vMaxAndInverseDistance = vec3(uMaxVmax.zw, uvMinAndExtents.w);
    v_uvMinAndSphericalLongitudeRotation.xy = uvMinAndExtents.xy;
#endif // TEXTURE_COORDINATES

#ifdef PER_INSTANCE_COLOR
    v_color = czm_batchTable_color(batchId);
#endif

    gl_Position = czm_depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);
}
