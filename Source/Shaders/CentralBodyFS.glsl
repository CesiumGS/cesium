//#define SHOW_TILE_BOUNDARIES

#if TEXTURE_UNITS > 0
uniform sampler2D u_dayTextures[TEXTURE_UNITS];
uniform vec4 u_dayTextureTranslationAndScale[TEXTURE_UNITS];
uniform float u_dayTextureAlpha[TEXTURE_UNITS];
uniform float u_dayTextureBrightness[TEXTURE_UNITS];
uniform float u_dayTextureContrast[TEXTURE_UNITS];
uniform float u_dayTextureHue[TEXTURE_UNITS];
uniform float u_dayTextureSaturation[TEXTURE_UNITS];
uniform float u_dayTextureOneOverGamma[TEXTURE_UNITS];
uniform vec4 u_dayTextureTexCoordsExtent[TEXTURE_UNITS];
#endif

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_textureCoordinates;

vec3 sampleAndBlend(
    vec3 previousColor,
    vec4 sampledColor,
    vec2 tileTextureCoordinates,
    vec4 textureCoordinateExtent,
    vec4 textureCoordinateTranslationAndScale,
    float textureAlpha,
    float textureBrightness,
    float textureContrast,
    float textureHue,
    float textureSaturation,
    float textureOneOverGamma)
{
    // This crazy step stuff sets the alpha to 0.0 if this following condition is true:
    //    tileTextureCoordinates.s < textureCoordinateExtent.s ||
    //    tileTextureCoordinates.s > textureCoordinateExtent.p ||
    //    tileTextureCoordinates.t < textureCoordinateExtent.t ||
    //    tileTextureCoordinates.t > textureCoordinateExtent.q
    // In other words, the alpha is zero if the fragment is outside the extent
    // covered by this texture.  Would an actual 'if' yield better performance?
    if (tileTextureCoordinates.s < textureCoordinateExtent.s ||
        tileTextureCoordinates.s > textureCoordinateExtent.p ||
        tileTextureCoordinates.t < textureCoordinateExtent.t ||
        tileTextureCoordinates.t > textureCoordinateExtent.q)
    {
        textureAlpha = 0.0;
    }
    
    return mix(previousColor, sampledColor.rgb, sampledColor.a * textureAlpha);
}

// !!!COMPUTEDAYCOLOR!!!

//vec3 computeDayColor(vec3 initialColor, vec2 textureCoordinates);
//vec4 computeWaterColor(vec3 positionEyeCoordinates, vec2 textureCoordinates, mat3 enuToEye, vec3 imageryColor, float specularMapValue);

void main()
{
    // The clamp below works around an apparent bug in Chrome Canary v23.0.1241.0
    // where the fragment shader sees textures coordinates < 0.0 and > 1.0 for the
    // fragments on the edges of tiles even though the vertex shader is outputting
    // coordinates strictly in the 0-1 range.
    vec3 initialColor = vec3(0.0, 0.0, 0.5);
    vec3 startDayColor = computeDayColor(initialColor, clamp(v_textureCoordinates, 0.0, 1.0));

    vec4 color = vec4(startDayColor, 1.0);

    gl_FragColor = color;
}
