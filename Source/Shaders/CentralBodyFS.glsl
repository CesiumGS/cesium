//#define SHOW_TILE_BOUNDARIES

uniform sampler2D u_dayTextures[TEXTURE_UNITS];
uniform vec4 u_dayTextureTranslationAndScale[TEXTURE_UNITS];
uniform float u_dayTextureAlpha[TEXTURE_UNITS];
uniform vec4 u_dayTextureTexCoordsExtent[TEXTURE_UNITS];

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec3 v_rayleighColor;
varying vec3 v_mieColor;

varying vec2 v_textureCoordinates;

vec3 sampleAndBlend(
    vec3 previousColor,
    sampler2D texture,
    vec2 tileTextureCoordinates,
    vec4 textureCoordinateExtent,
    vec4 textureCoordinateTranslationAndScale,
    float textureAlpha)
{
    // This crazy step stuff sets the alpha to 0.0 if this following condition is true:
    //    tileTextureCoordinates.s < textureCoordinateExtent.s ||
    //    tileTextureCoordinates.s > textureCoordinateExtent.p ||
    //    tileTextureCoordinates.t < textureCoordinateExtent.t ||
    //    tileTextureCoordinates.t > textureCoordinateExtent.q
    // In other words, the alpha is zero if the fragment is outside the extent
    // covered by this texture.  Would an actual 'if' yield better performance?
    vec2 alphaMultiplier = step(textureCoordinateExtent.st, tileTextureCoordinates); 
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;
    
    alphaMultiplier = step(vec2(0.0), textureCoordinateExtent.pq - tileTextureCoordinates);
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;
    
    vec2 translation = textureCoordinateTranslationAndScale.xy;
    vec2 scale = textureCoordinateTranslationAndScale.zw;
    vec2 textureCoordinates = tileTextureCoordinates * scale + translation;
    vec4 color = texture2D(texture, textureCoordinates);
    return mix(previousColor, color.rgb, color.a * textureAlpha);
}

vec3 computeDayColor(vec3 initialColor, vec2 textureCoordinates);

void main()
{
#ifdef SHOW_DAY
    // The clamp below works around an apparent bug in Chrome Canary v23.0.1241.0
    // where the fragment shader sees textures coordinates < 0.0 and > 1.0 for the
    // fragments on the edges of tiles even though the vertex shader is outputting
    // coordinates strictly in the 0-1 range.
    vec3 initialColor = vec3(2.0 / 255.0, 6.0 / 255.0, 18.0 / 255.0);
    vec3 startDayColor = computeDayColor(initialColor, clamp(v_textureCoordinates, 0.0, 1.0));
#else
    vec3 startDayColor = vec3(1.0);
#endif
    
#ifdef SHOW_TILE_BOUNDARIES
    if (v_textureCoordinates.x < (1.0/256.0) || v_textureCoordinates.x > (255.0/256.0) ||
        v_textureCoordinates.y < (1.0/256.0) || v_textureCoordinates.y > (255.0/256.0))
    {
        startDayColor = vec3(1.0, 0.0, 0.0);
    }
#endif

#ifdef AFFECTED_BY_LIGHTING
    vec3 normalMC = normalize(czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));   // normalized surface normal in model coordinates
    vec3 normalEC = normalize(czm_normal * normalMC);                                           // normalized surface normal in eye coordiantes
    vec3 rgb = getCentralBodyColor(v_positionMC, v_positionEC, normalMC, normalEC, startDayColor, v_rayleighColor, v_mieColor);
#else
    vec3 rgb = startDayColor;
#endif
    
    gl_FragColor = vec4(rgb, 1.0);
}
