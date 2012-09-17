attribute vec3 position3D;
attribute vec2 textureCoordinates;

uniform float u_morphTime;
uniform int u_mode;

uniform vec3 u_center3D;
uniform mat4 u_modifiedModelView;
uniform mat4 u_modifiedModelViewProjection;
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

vec4 getPosition3DMode(vec3 position3DWC)
{
    return u_modifiedModelViewProjection * vec4(position3D, 1.0);
}

vec4 getPosition2DGeographicMode(vec3 position3DWC)
{
    vec4 rtcPosition2D = vec4(0.0, mix(u_tileExtent.st, u_tileExtent.pq, textureCoordinates), 1.0);  
    return u_modifiedModelViewProjection * rtcPosition2D;
}

vec4 getPosition2DWebMercatorMode(vec3 position3DWC)
{
    // TODO: only do this transformation for low LODs.
    float currentLatitude = mix(u_southLatitude, u_northLatitude, textureCoordinates.y);
    float sinLatitude = sin(currentLatitude);
    float mercatorY = 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));

    // mercatorY - u_southMercatorY in simulated double precision.
    float t1 = 0.0 - u_southMercatorYLow;
    float e = t1 - 0.0;
    float t2 = ((-u_southMercatorYLow - e) + (0.0 - (t1 - e))) + mercatorY - u_southMercatorYHigh;
    float highDifference = t1 + t2;
    float lowDifference = t2 - (highDifference - t1);
    
    float mercatorFraction = highDifference * u_oneOverMercatorHeight + lowDifference * u_oneOverMercatorHeight;
    
    vec4 rtcPosition2D = vec4(0.0, mix(u_tileExtent.st, u_tileExtent.pq, vec2(textureCoordinates.x, mercatorFraction)), 1.0);  
    return u_modifiedModelViewProjection * rtcPosition2D;
}

vec4 getPositionColumbusViewMode(vec3 position3DWC)
{
    // TODO: RTC in Columbus View
    vec4 position2DWC = vec4(0.0, mix(u_tileExtent.st, u_tileExtent.pq, textureCoordinates), 1.0);
    return czm_modelViewProjection * position2DWC;
}

vec4 getPositionMorphingMode(vec3 position3DWC)
{
    // TODO: RTC while morphing?
    vec3 position2DWC = vec3(0.0, mix(u_tileExtent.st, u_tileExtent.pq, textureCoordinates));
    vec4 morphPosition = czm_columbusViewMorph(position2DWC, position3DWC, u_morphTime);
    return czm_modelViewProjection * morphPosition;
}

vec4 getPosition(vec3 position3DWC);

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
