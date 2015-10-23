attribute vec4 position3DAndHeight;
attribute vec3 textureCoordAndEncodedNormals;

uniform vec3 u_center3D;
uniform mat4 u_modifiedModelView;
uniform vec4 u_tileRectangle;

// Uniforms for 2D Mercator projection
uniform vec2 u_southAndNorthLatitude;
uniform vec2 u_southMercatorYAndOneOverHeight;

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec2 v_textureCoordinates;
varying vec3 v_normalMC;
varying vec3 v_normalEC;

varying float v_distance;

// These functions are generated at runtime.
vec4 getPosition(vec3 position3DWC);
float get2DYPositionFraction();

vec4 getPosition3DMode(vec3 position3DWC)
{
    return czm_projection * (u_modifiedModelView * vec4(position3DAndHeight.xyz, 1.0));
}

float get2DMercatorYPositionFraction()
{
    // The width of a tile at level 11, in radians and assuming a single root tile, is
    //   2.0 * czm_pi / pow(2.0, 11.0)
    // We want to just linearly interpolate the 2D position from the texture coordinates
    // when we're at this level or higher.  The constant below is the expression
    // above evaluated and then rounded up at the 4th significant digit.
    const float maxTileWidth = 0.003068;
    float positionFraction = textureCoordAndEncodedNormals.y;
    float southLatitude = u_southAndNorthLatitude.x;
    float northLatitude = u_southAndNorthLatitude.y;
    if (northLatitude - southLatitude > maxTileWidth)
    {
        float southMercatorY = u_southMercatorYAndOneOverHeight.x;
        float oneOverMercatorHeight = u_southMercatorYAndOneOverHeight.y;

        float currentLatitude = mix(southLatitude, northLatitude, textureCoordAndEncodedNormals.y);
        currentLatitude = clamp(currentLatitude, -czm_webMercatorMaxLatitude, czm_webMercatorMaxLatitude);
        positionFraction = czm_latitudeToWebMercatorFraction(currentLatitude, southMercatorY, oneOverMercatorHeight);
    }    
    return positionFraction;
}

float get2DGeographicYPositionFraction()
{
    return textureCoordAndEncodedNormals.y;
}

vec4 getPositionPlanarEarth(vec3 position3DWC, float height2D)
{
    float yPositionFraction = get2DYPositionFraction();
    vec4 rtcPosition2D = vec4(height2D, mix(u_tileRectangle.st, u_tileRectangle.pq, vec2(textureCoordAndEncodedNormals.x, yPositionFraction)), 1.0);  
    return czm_projection * (u_modifiedModelView * rtcPosition2D);
}

vec4 getPosition2DMode(vec3 position3DWC)
{
    return getPositionPlanarEarth(position3DWC, 0.0);
}

vec4 getPositionColumbusViewMode(vec3 position3DWC)
{
    return getPositionPlanarEarth(position3DWC, position3DAndHeight.w);
}

vec4 getPositionMorphingMode(vec3 position3DWC)
{
    // We do not do RTC while morphing, so there is potential for jitter.
    // This is unlikely to be noticeable, though.
    float yPositionFraction = get2DYPositionFraction();
    vec4 position2DWC = vec4(0.0, mix(u_tileRectangle.st, u_tileRectangle.pq, vec2(textureCoordAndEncodedNormals.x, yPositionFraction)), 1.0);
    vec4 morphPosition = czm_columbusViewMorph(position2DWC, vec4(position3DWC, 1.0), czm_morphTime);
    return czm_modelViewProjection * morphPosition;
}

const float fOuterRadius = 6378137.0 * 1.025;
const float fOuterRadius2 = fOuterRadius * fOuterRadius;
const float fInnerRadius = 6378137.0;
const float fScale = 1.0 / (fOuterRadius - fInnerRadius);
const float fScaleDepth = 0.25;
const float fScaleOverScaleDepth = fScale / fScaleDepth;

const float Kr = 0.0025;
const float fKr4PI = Kr * 4.0 * czm_pi;
const float Km = 0.0015;
const float fKm4PI = Km * 4.0 * czm_pi;
const float ESun = 15.0;
const float fKmESun = Km * ESun;
const float fKrESun = Kr * ESun;
const vec3 v3InvWavelength = vec3(
    5.60204474633241,  // Red = 1.0 / Math.pow(0.650, 4.0)
    9.473284437923038, // Green = 1.0 / Math.pow(0.570, 4.0)
    19.643802610477206); // Blue = 1.0 / Math.pow(0.475, 4.0)
const float rayleighScaleDepth = 0.25;
          
const int nSamples = 2;
const float fSamples = 2.0;

varying vec3 v_rayleighColor;
varying vec3 v_mieColor;
varying vec3 v_toCamera;

float scale(float fCos)
{
    float x = 1.0 - fCos;
    return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));
}

void setAtmosphereVaryings(vec3 position)
{
    float fCameraHeight = length(czm_viewerPositionWC) - 6356752.3142451793;
    float fCameraHeight2 = fCameraHeight * fCameraHeight;
    
    // Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)
    vec3 v3Pos = position.xyz;
    vec3 v3Ray = v3Pos - czm_viewerPositionWC;
    float fFar = length(v3Ray);
    v3Ray /= fFar;

    vec3 v3Start = czm_viewerPositionWC;
    float fHeight = length(v3Start);
    float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fCameraHeight));
    float fStartAngle = dot(v3Ray, v3Start) / fHeight;
    float fStartOffset = fDepth*scale(fStartAngle);

    // Initialize the scattering loop variables
    float fSampleLength = fFar / fSamples;
    float fScaledLength = fSampleLength * fScale;
    vec3 v3SampleRay = v3Ray * fSampleLength;
    vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;

    // Now loop through the sample rays
    vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);
    for(int i=0; i<nSamples; i++)
    {
        float fHeight = length(v3SamplePoint);
        float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));
        vec3 lightPosition = normalize(czm_viewerPositionWC); // czm_sunDirectionWC
        float fLightAngle = dot(lightPosition, v3SamplePoint) / fHeight;
        float fCameraAngle = dot(v3Ray, v3SamplePoint) / fHeight;
        float fScatter = (fStartOffset + fDepth*(scale(fLightAngle) - scale(fCameraAngle)));
        vec3 v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));
        v3FrontColor += v3Attenuate * (fDepth * fScaledLength);
        v3SamplePoint += v3SampleRay;
    }

    // Finally, scale the Mie and Rayleigh colors and set up the varying variables for the pixel shader
    v_mieColor = v3FrontColor * fKmESun;
    v_rayleighColor = v3FrontColor * (v3InvWavelength * fKrESun);
    v_toCamera = czm_viewerPositionWC - v3Pos;
}

void main() 
{
    vec3 position3DWC = position3DAndHeight.xyz + u_center3D;

    gl_Position = getPosition(position3DWC);

#if defined(ENABLE_VERTEX_LIGHTING)
    v_positionEC = (czm_modelView3D * vec4(position3DWC, 1.0)).xyz;
    v_positionMC = position3DWC;                                 // position in model coordinates
    float encodedNormal = textureCoordAndEncodedNormals.z;
    v_normalMC = czm_octDecode(encodedNormal);
    v_normalEC = czm_normal3D * v_normalMC;
#elif defined(SHOW_REFLECTIVE_OCEAN) || defined(ENABLE_DAYNIGHT_SHADING)
    v_positionEC = (czm_modelView3D * vec4(position3DWC, 1.0)).xyz;
    v_positionMC = position3DWC;                                 // position in model coordinates
#endif

    v_distance = length((czm_modelView3D * vec4(position3DWC, 1.0)).xyz);
    
    v_textureCoordinates = textureCoordAndEncodedNormals.xy;
    
    setAtmosphereVaryings(position3DWC);
}
