attribute vec4 position3DAndHeight;
attribute vec2 textureCoordinates;

uniform vec3 u_center3D;
uniform mat4 u_modifiedModelView;
uniform vec4 u_tileExtent;

// Uniforms for 2D Mercator projection
uniform vec2 u_southAndNorthLatitude;
uniform vec3 u_southMercatorYLowAndHighAndOneOverHeight;

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec2 v_textureCoordinates;

// Ground push related settings
#ifdef APPLY_PUSH
varying float v_push;
uniform vec4 u_realTileExtent;
uniform float u_pushDepth;
uniform float u_pushBlend;
uniform vec4 u_pushExtent;
#endif

// These functions are generated at runtime.
vec4 getPosition(vec3 position3DWC);
float get2DYPositionFraction();

vec4 getPosition3DMode(vec3 position3DWC)
{
#ifdef APPLY_PUSH
    vec3 geocentricNormal = normalize(position3DWC); // Use incoming position as geocentric normal
    vec3 pmod = position3DAndHeight.xyz + geocentricNormal * (v_push * u_pushDepth);
    return czm_projection * (u_modifiedModelView * vec4(pmod, 1.0));
#else
    return czm_projection * (u_modifiedModelView * vec4(position3DAndHeight.xyz, 1.0));
#endif
}

float get2DMercatorYPositionFraction()
{
    // The width of a tile at level 11, in radians and assuming a single root tile, is
    //   2.0 * czm_pi / pow(2.0, 11.0)
    // We want to just linearly interpolate the 2D position from the texture coordinates
    // when we're at this level or higher.  The constant below is the expression
    // above evaluated and then rounded up at the 4th significant digit.
    const float maxTileWidth = 0.003068;
    float positionFraction = textureCoordinates.y;
    float southLatitude = u_southAndNorthLatitude.x;
    float northLatitude = u_southAndNorthLatitude.y;
    if (northLatitude - southLatitude > maxTileWidth)
    {
        float southMercatorYLow = u_southMercatorYLowAndHighAndOneOverHeight.x;
        float southMercatorYHigh = u_southMercatorYLowAndHighAndOneOverHeight.y;
        float oneOverMercatorHeight = u_southMercatorYLowAndHighAndOneOverHeight.z;

        float currentLatitude = mix(southLatitude, northLatitude, textureCoordinates.y);
        currentLatitude = clamp(currentLatitude, -czm_webMercatorMaxLatitude, czm_webMercatorMaxLatitude);
        positionFraction = czm_latitudeToWebMercatorFraction(currentLatitude, southMercatorYLow, southMercatorYHigh, oneOverMercatorHeight);
    }    
    return positionFraction;
}

float get2DGeographicYPositionFraction()
{
    return textureCoordinates.y;
}

vec4 getPositionPlanarEarth(vec3 position3DWC, float height2D)
{
    float yPositionFraction = get2DYPositionFraction();
    vec4 rtcPosition2D = vec4(height2D, mix(u_tileExtent.st, u_tileExtent.pq, vec2(textureCoordinates.x, yPositionFraction)), 1.0);  
    return czm_projection * (u_modifiedModelView * rtcPosition2D);
}

vec4 getPosition2DMode(vec3 position3DWC)
{
    return getPositionPlanarEarth(position3DWC, 0.0);
}

vec4 getPositionColumbusViewMode(vec3 position3DWC)
{
#ifdef APPLY_PUSH
    return getPositionPlanarEarth(position3DWC, position3DAndHeight.w + v_push * u_pushDepth);
#else
    return getPositionPlanarEarth(position3DWC, position3DAndHeight.w);
#endif
}

vec4 getPositionMorphingMode(vec3 position3DWC)
{
    // We do not do RTC while morphing, so there is potential for jitter.
    // This is unlikely to be noticeable, though.
    float yPositionFraction = get2DYPositionFraction();
    vec4 position2DWC = vec4(0.0, mix(u_tileExtent.st, u_tileExtent.pq, vec2(textureCoordinates.x, yPositionFraction)), 1.0);
    vec4 morphPosition = czm_columbusViewMorph(position2DWC, vec4(position3DWC, 1.0), czm_morphTime);
    return czm_modelViewProjection * morphPosition;
}

#ifdef APPLY_PUSH
float calcPush1d(float x, float sidesStart, float baseStart, float baseFinish, float sidesFinish)
{
    // Outside push extent
    if( x <= sidesStart || x >= sidesFinish ) return 0.0;

    // Inside base region
    if( x >= baseStart && x <= baseFinish ) return 1.0;

    // Smooth the sides
    if( x < baseStart ) return smoothstep(sidesStart, baseStart, x);
    return smoothstep(sidesFinish, baseFinish, x);
}

float calcPush(vec2 loc)
{
    return calcPush1d(loc.x, u_pushExtent.x - u_pushBlend, u_pushExtent.x, u_pushExtent.z, u_pushExtent.z + u_pushBlend)
    * calcPush1d(loc.y, u_pushExtent.y - u_pushBlend, u_pushExtent.y, u_pushExtent.w, u_pushExtent.w + u_pushBlend);
}
#endif

void main() 
{
#ifdef APPLY_PUSH
    vec2 actualLoc = mix(u_realTileExtent.st, u_realTileExtent.pq, vec2(textureCoordinates.x, textureCoordinates.y));
    v_push = calcPush(actualLoc);
#endif

    vec3 position3DWC = position3DAndHeight.xyz + u_center3D;

    gl_Position = getPosition(position3DWC);

#if defined(SHOW_REFLECTIVE_OCEAN) || defined(ENABLE_LIGHTING)
    v_positionEC = (czm_modelView3D * vec4(position3DWC, 1.0)).xyz;
    v_positionMC = position3DWC;                                 // position in model coordinates
#endif

    v_textureCoordinates = textureCoordinates;
}
