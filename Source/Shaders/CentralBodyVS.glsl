attribute vec3 position3D;
attribute vec2 textureCoordinates;

uniform float u_morphTime;
uniform int u_mode;

uniform vec3 u_center3D;
uniform mat4 u_modifiedModelView;
uniform vec4 u_tileExtent;

// Uniforms for 2D Mercator projection
uniform float u_southLatitude;
uniform float u_northLatitude;
uniform float u_southMercatorYLow;
uniform float u_southMercatorYHigh;
uniform float u_oneOverMercatorHeight;

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec3 v_rayleighColor;
varying vec3 v_mieColor;

varying vec2 v_textureCoordinates;

// These functions are generated at runtime.
vec4 getPosition(vec3 position3DWC);
float get2DYPositionFraction();

vec4 getPosition3DMode(vec3 position3DWC)
{
    return czm_projection * (u_modifiedModelView * vec4(position3D, 1.0));
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
    if (u_northLatitude - u_southLatitude > maxTileWidth)
    {
        float currentLatitude = mix(u_southLatitude, u_northLatitude, textureCoordinates.y);
        currentLatitude = clamp(currentLatitude, -czm_webMercatorMaxLatitude, czm_webMercatorMaxLatitude);
        float sinLatitude = sin(currentLatitude);
        float mercatorY = 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));
    
        // mercatorY - u_southMercatorY in simulated double precision.
        float t1 = 0.0 - u_southMercatorYLow;
        float e = t1 - 0.0;
        float t2 = ((-u_southMercatorYLow - e) + (0.0 - (t1 - e))) + mercatorY - u_southMercatorYHigh;
        float highDifference = t1 + t2;
        float lowDifference = t2 - (highDifference - t1);
        
        positionFraction = highDifference * u_oneOverMercatorHeight + lowDifference * u_oneOverMercatorHeight;
    }    
    return positionFraction;
}

float get2DGeographicYPositionFraction()
{
    return textureCoordinates.y;
}

vec4 getPosition2DMode(vec3 position3DWC)
{
    float yPositionFraction = get2DYPositionFraction();
    vec4 rtcPosition2D = vec4(0.0, mix(u_tileExtent.st, u_tileExtent.pq, vec2(textureCoordinates.x, yPositionFraction)), 1.0);  
    return czm_projection * (u_modifiedModelView * rtcPosition2D);
}

vec4 getPositionColumbusViewMode(vec3 position3DWC)
{
    // TODO: RTC in Columbus View
    float yPositionFraction = get2DYPositionFraction();
    vec4 position2DWC = vec4(0.0, mix(u_tileExtent.st, u_tileExtent.pq, vec2(textureCoordinates.x, yPositionFraction)), 1.0);
    return czm_modelViewProjection * position2DWC;
}

vec4 getPositionMorphingMode(vec3 position3DWC)
{
    // TODO: RTC while morphing?
    float yPositionFraction = get2DYPositionFraction();
    vec3 position2DWC = vec3(0.0, mix(u_tileExtent.st, u_tileExtent.pq, vec2(textureCoordinates.x, yPositionFraction)));
    vec4 morphPosition = czm_columbusViewMorph(position2DWC, position3DWC, u_morphTime);
    return czm_modelViewProjection * morphPosition;
}

void main() 
{
    vec3 position3DWC = position3D + u_center3D;

    gl_Position = getPosition(position3DWC);
    
    AtmosphereColor atmosphereColor = computeGroundAtmosphereFromSpace(position3DWC);

    v_positionEC = (czm_modelView * vec4(position3DWC, 1.0)).xyz;
    v_positionMC = position3DWC;                                 // position in model coordinates
    v_mieColor = atmosphereColor.mie;
    v_rayleighColor = atmosphereColor.rayleigh;
    v_textureCoordinates = textureCoordinates;
}
