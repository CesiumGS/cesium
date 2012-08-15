#define SHOW_TILE_BOUNDARIES
//#define SHOW_LEVELS
//#define SHOW_CAMERA_INSIDE_BOUNDING_SPHERE

#ifndef TEXTURE_UNITS
#define TEXTURE_UNITS 8
#endif

uniform int u_numberOfDayTextures;
uniform sampler2D u_dayTextures[TEXTURE_UNITS];
uniform vec2 u_dayTextureTranslation[TEXTURE_UNITS];
uniform vec2 u_dayTextureScale[TEXTURE_UNITS];
uniform float u_dayTextureAlpha[TEXTURE_UNITS];
uniform bool u_dayTextureIsGeographic[TEXTURE_UNITS];
uniform bool u_cameraInsideBoundingSphere;
uniform int u_level;

uniform float u_northLatitude;
uniform float u_southLatitude;
uniform float u_southMercatorYHigh;
uniform float u_southMercatorYLow;
uniform float u_oneOverMercatorHeight;

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec3 v_rayleighColor;
varying vec3 v_mieColor;

varying vec2 v_textureCoordinates;

void main()
{
    vec3 normalMC = normalize(agi_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));   // normalized surface normal in model coordinates
    vec3 normalEC = normalize(agi_normal * normalMC);                                           // normalized surface normal in eye coordiantes
    
#ifdef SHOW_DAY
    vec2 geographicUV = v_textureCoordinates;
    vec2 webMercatorUV = geographicUV;
    
    if (u_level < 12)
    {
	    float currentLatitude = mix(u_southLatitude, u_northLatitude, geographicUV.y);
	    float sinLatitude = sin(currentLatitude);
	    float mercatorY = 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));
	    
	    // mercatorY - u_southMercatorY in simulated double precision.
	    float t1 = 0.0 - u_southMercatorYLow;
	    float e = t1 - 0.0;
	    float t2 = ((-u_southMercatorYLow - e) + (0.0 - (t1 - e))) + mercatorY - u_southMercatorYHigh;
	    float highDifference = t1 + t2;
	    float lowDifference = t2 - (highDifference - t1);
	    
	    webMercatorUV = vec2(geographicUV.x, highDifference * u_oneOverMercatorHeight + lowDifference * u_oneOverMercatorHeight);
    }

    vec3 startDayColor = vec3(2.0 / 255.0, 6.0 / 255.0, 18.0 / 255.0);
    for (int i = 0; i < TEXTURE_UNITS; ++i)
    {
        if (i >= u_numberOfDayTextures)
            break;
        
        vec2 baseTextureCoordinates = mix(webMercatorUV, geographicUV, float(u_dayTextureIsGeographic[i]));
        vec2 textureCoordinates = (baseTextureCoordinates - u_dayTextureTranslation[i]) / u_dayTextureScale[i];
        
        if (textureCoordinates.x >= 0.0 && textureCoordinates.x <= 1.0 &&
            textureCoordinates.y >= 0.0 && textureCoordinates.y <= 1.0)
        {
	        vec4 color = texture2D(u_dayTextures[i], textureCoordinates);
	        startDayColor = mix(startDayColor, color.rgb, color.a * u_dayTextureAlpha[i]);
        } 
    }
#ifdef SHOW_CAMERA_INSIDE_BOUNDING_SPHERE
    if (u_cameraInsideBoundingSphere)
    {
        startDayColor = mix(startDayColor, vec3(1.0, 0.0, 0.0), 0.2);
    }
#endif
   
#ifdef SHOW_LEVELS
    startDayColor = vec3(0.0, 0.0, 0.0);
    if (u_numberOfDayTextures > 0)
    {
	    float x = float(u_level) / 20.0;
	    if (x < 0.25) {
	        // blue to cyan
	        startDayColor.g = 4.0 * x;
	        startDayColor.b = 1.0;
	    } else if (x < 0.5) {
	        // cyan to green
	        startDayColor.g = 1.0;
	        startDayColor.b = 2.0 - 4.0 * x;
	    } else if (x < 0.75) {
	        // green to yellow
	        startDayColor.r = 4.0 * x - 2.0;
	        startDayColor.g = 1.0;
	    } else {
	        // yellow to red
	        startDayColor.r = 1.0;
	        startDayColor.g = 4.0 * (1.0 - x);
	    }
    }
#endif
    
#ifdef SHOW_TILE_BOUNDARIES
    if (v_textureCoordinates.x < (1.0/256.0) || v_textureCoordinates.x > (255.0/256.0) ||
        v_textureCoordinates.y < (1.0/256.0) || v_textureCoordinates.y > (255.0/256.0))
    {
        startDayColor = vec3(1.0, 0.0, 0.0);
    }
#endif
#else
    vec3 startDayColor = vec3(1.0);
#endif

#ifdef AFFECTED_BY_LIGHTING
    vec3 rgb = getCentralBodyColor(v_positionMC, v_positionEC, normalMC, normalEC, startDayColor, v_rayleighColor, v_mieColor);
#else
    vec3 rgb = startDayColor;
#endif
    
    gl_FragColor = vec4(rgb, 1.0);
}
