#define EXTRUDED_GEOMETRY
#define TEXTURE_COORDINATES
#define VERTEX_TEXTURE_COORDS
#define OES_texture_float_linear











float czm_signNotZero(float value)
{
    return value >= 0.0 ? 1.0 : -1.0;
}

vec2 czm_signNotZero(vec2 value)
{
    return vec2(czm_signNotZero(value.x), czm_signNotZero(value.y));
}

vec3 czm_signNotZero(vec3 value)
{
    return vec3(czm_signNotZero(value.x), czm_signNotZero(value.y), czm_signNotZero(value.z));
}

vec4 czm_signNotZero(vec4 value)
{
    return vec4(czm_signNotZero(value.x), czm_signNotZero(value.y), czm_signNotZero(value.z), czm_signNotZero(value.w));
}

uniform vec3 czm_encodedCameraPositionMCLow;
uniform vec3 czm_encodedCameraPositionMCHigh;










  vec3 czm_octDecode(vec2 encoded, float range)
  {
      if (encoded.x == 0.0 && encoded.y == 0.0) {
          return vec3(0.0, 0.0, 0.0);
      }

     encoded = encoded / range * 2.0 - 1.0;
     vec3 v = vec3(encoded.x, encoded.y, 1.0 - abs(encoded.x) - abs(encoded.y));
     if (v.z < 0.0)
     {
         v.xy = (1.0 - abs(v.yx)) * czm_signNotZero(v.xy);
     }

     return normalize(v);
  }










 vec3 czm_octDecode(vec2 encoded)
 {
    return czm_octDecode(encoded, 255.0);
 }










 vec3 czm_octDecode(float encoded)
 {
    float temp = encoded / 256.0;
    float x = floor(temp);
    float y = (temp - x) * 256.0;
    return czm_octDecode(vec2(x, y));
 }












  void czm_octDecode(vec2 encoded, out vec3 vector1, out vec3 vector2, out vec3 vector3)
 {
    float temp = encoded.x / 65536.0;
    float x = floor(temp);
    float encodedFloat1 = (temp - x) * 65536.0;

    temp = encoded.y / 65536.0;
    float y = floor(temp);
    float encodedFloat2 = (temp - y) * 65536.0;

    vector1 = czm_octDecode(encodedFloat1);
    vector2 = czm_octDecode(encodedFloat2);
    vector3 = czm_octDecode(vec2(x, y));
 }


uniform vec2 czm_eyeHeight2D;










const float czm_sceneMode2D = 2.0;







vec4 czm_columbusViewMorph(vec4 position2D, vec4 position3D, float time)
{

    vec3 p = mix(position2D.xyz, position3D.xyz, time);
    return vec4(p, 1.0);
}

uniform float czm_morphTime;
uniform mat4 czm_modelViewProjectionRelativeToEye;

#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)
varying float v_WindowZ;
#endif































vec4 czm_depthClamp(vec4 coords)
{
#ifndef LOG_DEPTH
#ifdef GL_EXT_frag_depth
    v_WindowZ = (0.5 * (coords.z / coords.w) + 0.5) * coords.w;
    coords.z = 0.0;
#else
    coords.z = min(coords.z, coords.w);
#endif
#endif
    return coords;
}

uniform mat3 czm_normal;

































vec4 czm_translateRelativeToEye(vec3 high, vec3 low)
{
    vec3 highDifference = high - czm_encodedCameraPositionMCHigh;
    vec3 lowDifference = low - czm_encodedCameraPositionMCLow;

    return vec4(highDifference + lowDifference, 1.0);
}

uniform mat4 czm_modelViewRelativeToEye;













float czm_branchFreeTernary(bool comparison, float a, float b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}














vec2 czm_branchFreeTernary(bool comparison, vec2 a, vec2 b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}














vec3 czm_branchFreeTernary(bool comparison, vec3 a, vec3 b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}














vec4 czm_branchFreeTernary(bool comparison, vec4 a, vec4 b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}











const float czm_sceneMode3D = 3.0;

uniform float czm_sceneMode;
uniform float czm_geometricToleranceOverMeter;





















vec4 czm_computePosition();



#line 0

#line 0
attribute vec2 compressedAttributes;
vec3 extrudeDirection;



attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute float batchId;

#ifdef EXTRUDED_GEOMETRY


uniform float u_globeMinimumAltitude;
#endif

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#endif

#ifdef TEXTURE_COORDINATES
#ifdef SPHERICAL
varying vec4 v_sphericalExtents;
#else
varying vec2 v_inversePlaneExtents;
varying vec4 v_westPlane;
varying vec4 v_southPlane;
#endif
varying vec3 v_uvMinAndSphericalLongitudeRotation;
varying vec3 v_uMaxAndInverseDistance;
varying vec3 v_vMaxAndInverseDistance;
#endif



#ifdef VERTEX_TEXTURE_COORDS
    attribute vec2 aTextureCoord;

    uniform vec3 highAnchorCoords[4];
    uniform vec3 lowAnchorCoords[4];


    uniform vec2 anchorTCoords[4];

    varying vec2 vTextureCoord;
#endif


uniform highp sampler2D batchTexture;
uniform vec4 batchTextureStep;
vec2 computeSt(float batchId)
{
    float stepX = batchTextureStep.x;
    float centerX = batchTextureStep.y;
    float numberOfAttributes = float(16);
    return vec2(centerX + (batchId * numberOfAttributes * stepX), 0.5);
}

vec4 czm_batchTable_uMaxVmax(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(0);
    vec4 textureValue = texture2D(batchTexture, st);
    vec4 value = textureValue;
    return value;
}
vec4 czm_batchTable_uvMinAndExtents(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(1);
    vec4 textureValue = texture2D(batchTexture, st);
    vec4 value = textureValue;
    return value;
}
vec3 czm_batchTable_southWest_HIGH(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(2);
    vec4 textureValue = texture2D(batchTexture, st);
    vec3 value = textureValue.xyz;
    return value;
}
vec3 czm_batchTable_southWest_LOW(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(3);
    vec4 textureValue = texture2D(batchTexture, st);
    vec3 value = textureValue.xyz;
    return value;
}
vec3 czm_batchTable_eastward(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(4);
    vec4 textureValue = texture2D(batchTexture, st);
    vec3 value = textureValue.xyz;
    return value;
}
vec3 czm_batchTable_northward(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(5);
    vec4 textureValue = texture2D(batchTexture, st);
    vec3 value = textureValue.xyz;
    return value;
}
vec4 czm_batchTable_planes2D_HIGH(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(6);
    vec4 textureValue = texture2D(batchTexture, st);
    vec4 value = textureValue;
    return value;
}
vec4 czm_batchTable_planes2D_LOW(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(7);
    vec4 textureValue = texture2D(batchTexture, st);
    vec4 value = textureValue;
    return value;
}
float czm_batchTable_show(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(8);
    vec4 textureValue = texture2D(batchTexture, st);
    float value = textureValue.x;
    return value;
}
vec2 czm_batchTable_distanceDisplayCondition(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(9);
    vec4 textureValue = texture2D(batchTexture, st);
    vec2 value = textureValue.xy;
    return value;
}
vec3 czm_batchTable_boundingSphereCenter3DHigh(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(10);
    vec4 textureValue = texture2D(batchTexture, st);
    vec3 value = textureValue.xyz;
    return value;
}
vec3 czm_batchTable_boundingSphereCenter3DLow(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(11);
    vec4 textureValue = texture2D(batchTexture, st);
    vec3 value = textureValue.xyz;
    return value;
}
vec3 czm_batchTable_boundingSphereCenter2DHigh(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(12);
    vec4 textureValue = texture2D(batchTexture, st);
    vec3 value = textureValue.xyz;
    return value;
}
vec3 czm_batchTable_boundingSphereCenter2DLow(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(13);
    vec4 textureValue = texture2D(batchTexture, st);
    vec3 value = textureValue.xyz;
    return value;
}
float czm_batchTable_boundingSphereRadius(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(14);
    vec4 textureValue = texture2D(batchTexture, st);
    float value = textureValue.x;
    return value;
}
vec4 czm_batchTable_pickColor(float batchId)
{
    vec2 st = computeSt(batchId);
    st.x += batchTextureStep.x * float(15);
    vec4 textureValue = texture2D(batchTexture, st);
    vec4 value = textureValue;
value /= 255.0;
    return value;
}

void czm_non_distanceDisplayCondition_main()
{
    vec4 position = czm_computePosition();

#ifdef EXTRUDED_GEOMETRY
    float delta = min(u_globeMinimumAltitude, czm_geometricToleranceOverMeter * length(position.xyz));
    delta *= czm_sceneMode == czm_sceneMode3D ? 1.0 : 0.0;


    position = position + vec4(extrudeDirection * delta, 0.0);
#endif

#ifdef VERTEX_TEXTURE_COORDS
      vTextureCoord = aTextureCoord;























#endif

#ifdef TEXTURE_COORDINATES
#ifdef SPHERICAL
    v_sphericalExtents = czm_batchTable_sphericalExtents(batchId);
    v_uvMinAndSphericalLongitudeRotation.z = czm_batchTable_longitudeRotation(batchId);
#else
#ifdef COLUMBUS_VIEW_2D
    vec4 planes2D_high = czm_batchTable_planes2D_HIGH(batchId);
    vec4 planes2D_low = czm_batchTable_planes2D_LOW(batchId);





    vec2 idlSplitNewPlaneHiLow = vec2(EAST_MOST_X_HIGH - (WEST_MOST_X_HIGH - planes2D_high.w), EAST_MOST_X_LOW - (WEST_MOST_X_LOW - planes2D_low.w));
    bool idlSplit = planes2D_high.x > planes2D_high.w && position3DLow.y > 0.0;
    planes2D_high.w = czm_branchFreeTernary(idlSplit, idlSplitNewPlaneHiLow.x, planes2D_high.w);
    planes2D_low.w = czm_branchFreeTernary(idlSplit, idlSplitNewPlaneHiLow.y, planes2D_low.w);




    idlSplit = planes2D_high.x > planes2D_high.w && position3DLow.y < 0.0;
    idlSplitNewPlaneHiLow = vec2(WEST_MOST_X_HIGH - (EAST_MOST_X_HIGH - planes2D_high.x), WEST_MOST_X_LOW - (EAST_MOST_X_LOW - planes2D_low.x));
    planes2D_high.x = czm_branchFreeTernary(idlSplit, idlSplitNewPlaneHiLow.x, planes2D_high.x);
    planes2D_low.x = czm_branchFreeTernary(idlSplit, idlSplitNewPlaneHiLow.y, planes2D_low.x);

    vec3 southWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(vec3(0.0, planes2D_high.xy), vec3(0.0, planes2D_low.xy))).xyz;
    vec3 northWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(vec3(0.0, planes2D_high.x, planes2D_high.z), vec3(0.0, planes2D_low.x, planes2D_low.z))).xyz;
    vec3 southEastCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(vec3(0.0, planes2D_high.w, planes2D_high.y), vec3(0.0, planes2D_low.w, planes2D_low.y))).xyz;
#else

    vec3 southWestCorner = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(czm_batchTable_southWest_HIGH(batchId), czm_batchTable_southWest_LOW(batchId))).xyz;
    vec3 northWestCorner = czm_normal * czm_batchTable_northward(batchId) + southWestCorner;
    vec3 southEastCorner = czm_normal * czm_batchTable_eastward(batchId) + southWestCorner;
#endif

    vec3 eastWard = southEastCorner - southWestCorner;
    float eastExtent = length(eastWard);
    eastWard /= eastExtent;

    vec3 northWard = northWestCorner - southWestCorner;
    float northExtent = length(northWard);
    northWard /= northExtent;

    v_westPlane = vec4(eastWard, -dot(eastWard, southWestCorner));
    v_southPlane = vec4(northWard, -dot(northWard, southWestCorner));
    v_inversePlaneExtents = vec2(1.0 / eastExtent, 1.0 / northExtent);
#endif
    vec4 uvMinAndExtents = czm_batchTable_uvMinAndExtents(batchId);
    vec4 uMaxVmax = czm_batchTable_uMaxVmax(batchId);

    v_uMaxAndInverseDistance = vec3(uMaxVmax.xy, uvMinAndExtents.z);
    v_vMaxAndInverseDistance = vec3(uMaxVmax.zw, uvMinAndExtents.w);
    v_uvMinAndSphericalLongitudeRotation.xy = uvMinAndExtents.xy;
#endif

#ifdef PER_INSTANCE_COLOR
    v_color = czm_batchTable_color(batchId);
#endif

    gl_Position = czm_depthClamp(czm_modelViewProjectionRelativeToEye * position);
}

void czm_non_compressed_main()
{
    czm_non_distanceDisplayCondition_main();
    vec2 distanceDisplayCondition = czm_batchTable_distanceDisplayCondition(batchId);
    vec3 boundingSphereCenter3DHigh = czm_batchTable_boundingSphereCenter3DHigh(batchId);
    vec3 boundingSphereCenter3DLow = czm_batchTable_boundingSphereCenter3DLow(batchId);
    float boundingSphereRadius = czm_batchTable_boundingSphereRadius(batchId);
    vec3 boundingSphereCenter2DHigh = czm_batchTable_boundingSphereCenter2DHigh(batchId);
    vec3 boundingSphereCenter2DLow = czm_batchTable_boundingSphereCenter2DLow(batchId);
    vec4 centerRTE;
    if (czm_morphTime == 1.0)
    {
        centerRTE = czm_translateRelativeToEye(boundingSphereCenter3DHigh, boundingSphereCenter3DLow);
    }
    else if (czm_morphTime == 0.0)
    {
        centerRTE = czm_translateRelativeToEye(boundingSphereCenter2DHigh.zxy, boundingSphereCenter2DLow.zxy);
    }
    else
    {
        centerRTE = czm_columbusViewMorph(
                czm_translateRelativeToEye(boundingSphereCenter2DHigh.zxy, boundingSphereCenter2DLow.zxy),
                czm_translateRelativeToEye(boundingSphereCenter3DHigh, boundingSphereCenter3DLow),
                czm_morphTime);
    }
    float radiusSq = boundingSphereRadius * boundingSphereRadius;
    float distanceSq;
    if (czm_sceneMode == czm_sceneMode2D)
    {
        distanceSq = czm_eyeHeight2D.y - radiusSq;
    }
    else
    {
        distanceSq = dot(centerRTE.xyz, centerRTE.xyz) - radiusSq;
    }
    distanceSq = max(distanceSq, 0.0);
    float nearSq = distanceDisplayCondition.x * distanceDisplayCondition.x;
    float farSq = distanceDisplayCondition.y * distanceDisplayCondition.y;
    float show = (distanceSq >= nearSq && distanceSq <= farSq) ? 1.0 : 0.0;
    gl_Position *= show;
}
vec4 czm_computePosition()
{
    return czm_translateRelativeToEye(position3DHigh, position3DLow);
}


void czm_non_show_main()
{
    extrudeDirection = czm_octDecode(compressedAttributes, 65535.0);
    czm_non_compressed_main();
}
void main()
{
    czm_non_show_main();
    gl_Position *= czm_batchTable_show(batchId);
}
