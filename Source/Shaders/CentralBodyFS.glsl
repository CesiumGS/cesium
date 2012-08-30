uniform sampler2D u_dayTexture;

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec3 v_rayleighColor;
varying vec3 v_mieColor;

varying vec2 v_textureCoordinates;

void main()
{
    vec3 normalMC = normalize(czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));   // normalized surface normal in model coordinates
    vec3 normalEC = normalize(czm_normal * normalMC);                                           // normalized surface normal in eye coordiantes
    
#ifdef SHOW_DAY    
    vec3 startDayColor = texture2D(u_dayTexture, v_textureCoordinates).rgb;
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
