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

#if defined(TEXTURE_COORDINATES) && !defined(SPHERICAL) && defined(UINT8_PACKING)
vec4 clampAndMagnitude(vec4 sd)
{
    vec4 d = sd;
    d.x = czm_branchFreeTernary(sd.x < 128.0, d.x, (255.0 - sd.x));
    d.x = floor(0.5 + d.x);
    d.y = floor(0.5 + d.y);
    d.z = floor(0.5 + d.z);
    d.w = floor(0.5 + d.w);
    return d;
}

float unpackLowLessThan100k(vec4 sd)
{
    vec4 d = clampAndMagnitude(sd);
    return (1000.0 * d.x + 10.0 * d.y + 0.1 * d.z + 0.001 * d.w) * czm_branchFreeTernary(sd.x < 128.0, 1.0, -1.0);
}

vec3 southwest_LOW(vec4 x, vec4 y, vec4 z)
{
    vec3 value;
    value.x = unpackLowLessThan100k(x);
    value.y = unpackLowLessThan100k(y);
    value.z = unpackLowLessThan100k(z);
    return value;
}

float unpackHighMagLessThan100Million(vec4 sd)
{
    vec4 d = clampAndMagnitude(sd);
    return (1000000.0 * d.x + 10000.0 * d.y + 100.0 * d.z + d.w) * czm_branchFreeTernary(sd.x < 128.0, 1.0, -1.0);
}

vec3 southwest_HIGH(vec4 x, vec4 y, vec4 z)
{
    vec3 value;
    value.x = unpackHighMagLessThan100Million(x);
    value.y = unpackHighMagLessThan100Million(y);
    value.z = unpackHighMagLessThan100Million(z);
    return value;
}

#ifdef COLUMBUS_VIEW_2D
vec4 unpackPlanes2D_HIGH(vec4 x, vec4 y, vec4 z, vec4 w)
{
    vec4 value;
    value.x = unpackHighMagLessThan100Million(x);
    value.y = unpackHighMagLessThan100Million(y);
    value.z = unpackHighMagLessThan100Million(z);
    value.w = unpackHighMagLessThan100Million(w);
    return value;
}

vec4 unpackPlanes2D_LOW(vec4 x, vec4 y, vec4 z, vec4 w)
{
    vec4 value;
    value.x = unpackLowLessThan100k(x);
    value.y = unpackLowLessThan100k(y);
    value.z = unpackLowLessThan100k(z);
    value.w = unpackLowLessThan100k(w);
    return value;
}

#else
float unpackLowLessThan1000k(vec4 sd)
{
    vec4 d = clampAndMagnitude(sd);
    return (10000.0 * d.x + 100.0 * d.y + d.z + 0.01 * d.w) * czm_branchFreeTernary(sd.x < 128.0, 1.0, -1.0);
}

vec3 unpackExtent(vec4 x, vec4 y, vec4 z)
{
    vec3 value;
    value.x = unpackLowLessThan1000k(x);
    value.y = unpackLowLessThan1000k(y);
    value.z = unpackLowLessThan1000k(z);
    return value;
}

#endif
#endif

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
#ifdef UINT8_PACKING
    vec4 planes2D_high = unpackPlanes2D_HIGH(czm_batchTable_planes2D_HIGH_x(batchId),
        czm_batchTable_planes2D_HIGH_y(batchId),
        czm_batchTable_planes2D_HIGH_z(batchId),
        czm_batchTable_planes2D_HIGH_w(batchId));
    vec4 planes2D_low = unpackPlanes2D_LOW(czm_batchTable_planes2D_LOW_x(batchId),
        czm_batchTable_planes2D_LOW_y(batchId),
        czm_batchTable_planes2D_LOW_z(batchId),
        czm_batchTable_planes2D_LOW_w(batchId));
#else // UINT8_PACKING
    vec4 planes2D_high = czm_batchTable_planes2D_HIGH(batchId);
    vec4 planes2D_low = czm_batchTable_planes2D_LOW(batchId);
#endif // UINT8_PACKING

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
#ifdef UINT8_PACKING
    vec3 low = southwest_LOW(czm_batchTable_southWest_LOW_x(batchId), czm_batchTable_southWest_LOW_y(batchId), czm_batchTable_southWest_LOW_z(batchId));
    vec3 high = southwest_HIGH(czm_batchTable_southWest_HIGH_x(batchId), czm_batchTable_southWest_HIGH_y(batchId), czm_batchTable_southWest_HIGH_z(batchId));
    vec3 southWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(high, low)).xyz;
    vec3 northWestCorner = czm_normal * unpackExtent(
        czm_batchTable_northward_x(batchId),
        czm_batchTable_northward_y(batchId),
        czm_batchTable_northward_z(batchId)) + southWestCorner;

    vec3 southEastCorner = czm_normal * unpackExtent(
        czm_batchTable_eastward_x(batchId),
        czm_batchTable_eastward_y(batchId),
        czm_batchTable_eastward_z(batchId)) + southWestCorner;
#else // UINT8_PACKING
    vec3 southWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(czm_batchTable_southWest_HIGH(batchId), czm_batchTable_southWest_LOW(batchId))).xyz;
    vec3 northWestCorner = czm_normal * czm_batchTable_northward(batchId) + southWestCorner;
    vec3 southEastCorner = czm_normal * czm_batchTable_eastward(batchId) + southWestCorner;
#endif // UINT8_PACKING
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
