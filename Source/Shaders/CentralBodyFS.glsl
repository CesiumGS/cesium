//#define SHOW_TILE_BOUNDARIES
uniform int u_numberOfDayTextures;
uniform sampler2D u_dayTextures[8];
uniform vec2 u_dayTextureTranslation[8];
uniform vec2 u_dayTextureScale[8];
uniform bool u_cameraInsideBoundingSphere;

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
    vec3 startDayColor = vec3(0.0, 0.0, 0.0);
    for (int i = 0; i < 8; ++i)
    {
        if (i >= u_numberOfDayTextures)
            break;
        vec2 textureCoordinates = (v_textureCoordinates - u_dayTextureTranslation[i]) / u_dayTextureScale[i];
        if (textureCoordinates.x >= 0.0 && textureCoordinates.x <= 1.0 &&
            textureCoordinates.y >= 0.0 && textureCoordinates.y <= 1.0)
        {
	        vec4 color = texture2D(u_dayTextures[i], textureCoordinates);
	        startDayColor = mix(startDayColor, color.rgb, color.a);
        } 
    }
    if (u_cameraInsideBoundingSphere)
    {
        startDayColor = mix(startDayColor, vec3(1.0, 0.0, 0.0), 0.2);
    }
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
