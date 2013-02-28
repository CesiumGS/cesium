//#define SHOW_TILE_BOUNDARIES

uniform float u_morphTime;

#if TEXTURE_UNITS > 0
uniform sampler2D u_dayTextures[TEXTURE_UNITS];
uniform sampler2D u_parentTextures[TEXTURE_UNITS];
uniform float u_textureBlendFactor[TEXTURE_UNITS];
uniform vec4 u_dayTextureTranslationAndScale[TEXTURE_UNITS];
uniform float u_dayTextureAlpha[TEXTURE_UNITS];
uniform float u_dayTextureBrightness[TEXTURE_UNITS];
uniform float u_dayTextureContrast[TEXTURE_UNITS];
uniform float u_dayTextureHue[TEXTURE_UNITS];
uniform float u_dayTextureSaturation[TEXTURE_UNITS];
uniform float u_dayTextureOneOverGamma[TEXTURE_UNITS];
uniform vec4 u_dayTextureTexCoordsExtent[TEXTURE_UNITS];
#endif

#ifdef SHOW_REFLECTIVE_OCEAN
uniform sampler2D u_waterMask;
uniform vec4 u_waterMaskTranslationAndScale;
uniform float u_zoomedOutOceanSpecularIntensity;
#endif

#ifdef SHOW_OCEAN_WAVES
uniform sampler2D u_oceanNormalMap;
#endif

uniform float u_distanceToScreenSpaceError;
uniform float u_maxScreenSpaceError;

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_textureCoordinates;

vec3 sampleAndBlend(
    vec3 previousColor,
    sampler2D texture,
    vec2 tileTextureCoordinates,
    vec4 textureCoordinateTranslationAndScale,
    float layerAlpha,
    float layerBrightness,
    float layerContrast,
    float layerHue,
    float layerSaturation,
    float layerOneOverGamma)
{
    vec2 translation = textureCoordinateTranslationAndScale.xy;
    vec2 scale = textureCoordinateTranslationAndScale.zw;
    vec2 textureCoordinates = tileTextureCoordinates * scale + translation;
    vec4 sample = texture2D(texture, textureCoordinates);

    vec3 color = sample.rgb;
    float alpha = sample.a;
    
#ifdef APPLY_BRIGHTNESS
    color = mix(vec3(0.0), color, layerBrightness);
#endif

#ifdef APPLY_CONTRAST
    color = mix(vec3(0.5), color, layerContrast);
#endif

#ifdef APPLY_HUE
    color = czm_hue(color, layerHue);
#endif

#ifdef APPLY_SATURATION
    color = czm_saturation(color, layerSaturation);
#endif

#ifdef APPLY_GAMMA
    color = pow(color, vec3(layerOneOverGamma));
#endif

    return mix(previousColor, color, alpha * layerAlpha);
}

vec3 computeDayColor(vec3 initialColor, vec2 textureCoordinates);
vec4 computeWaterColor(vec3 positionEyeCoordinates, vec2 textureCoordinates, mat3 enuToEye, vec3 imageryColor, float specularMapValue);

void main()
{
    // The clamp below works around an apparent bug in Chrome Canary v23.0.1241.0
    // where the fragment shader sees textures coordinates < 0.0 and > 1.0 for the
    // fragments on the edges of tiles even though the vertex shader is outputting
    // coordinates strictly in the 0-1 range.
    vec3 initialColor = vec3(0.0, 0.0, 0.5);
    vec3 startDayColor = computeDayColor(initialColor, clamp(v_textureCoordinates, 0.0, 1.0));

#ifdef SHOW_TILE_BOUNDARIES
    if (v_textureCoordinates.x < (1.0/256.0) || v_textureCoordinates.x > (255.0/256.0) ||
        v_textureCoordinates.y < (1.0/256.0) || v_textureCoordinates.y > (255.0/256.0))
    {
        startDayColor = vec3(1.0, 0.0, 0.0);
    }
#endif

    vec4 color = vec4(startDayColor, 1.0);

#ifdef SHOW_LOD_FACTOR
    color = vec4(textureLevelOfDetailFactor, textureLevelOfDetailFactor, textureLevelOfDetailFactor, 1.0);
    if (textureLevelOfDetailFactor < 0.0)
    {
        color.r = -textureLevelOfDetailFactor + 0.25;
        color.g = 0.0;
        color.b = 1.0 - color.r;
    }
    else if (textureLevelOfDetailFactor > 1.0)
    {
        color.r = 0.0;
        color.g = textureLevelOfDetailFactor - 1.0;
        color.b = 1.0 - color.g;
    }
#endif

#ifdef SHOW_REFLECTIVE_OCEAN
    vec2 waterMaskTranslation = u_waterMaskTranslationAndScale.xy;
    vec2 waterMaskScale = u_waterMaskTranslationAndScale.zw;
    vec2 waterMaskTextureCoordinates = v_textureCoordinates * waterMaskScale + waterMaskTranslation;

    float mask = texture2D(u_waterMask, waterMaskTextureCoordinates).r;

    if (mask > 0.0)
    {
        vec3 normalMC = normalize(czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));   // normalized surface normal in model coordinates
        vec3 normalEC = normalize(czm_normal3D * normalMC);                                           // normalized surface normal in eye coordiantes
        mat3 enuToEye = czm_eastNorthUpToEyeCoordinates(v_positionMC, normalEC);

        vec2 ellipsoidTextureCoordinates = czm_ellipsoidWgs84TextureCoordinates(normalMC);
        vec2 ellipsoidFlippedTextureCoordinates = czm_ellipsoidWgs84TextureCoordinates(normalMC.zyx);

        vec2 textureCoordinates = mix(ellipsoidTextureCoordinates, ellipsoidFlippedTextureCoordinates, u_morphTime * smoothstep(0.9, 0.95, normalMC.z));

        color = computeWaterColor(v_positionEC, textureCoordinates, enuToEye, startDayColor, mask);
    }
#endif
    
    gl_FragColor = color;
}

#ifdef SHOW_REFLECTIVE_OCEAN

float waveFade(float edge0, float edge1, float x)
{
    float y = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return pow(1.0 - y, 5.0);
}

// Based on water rendering by Jonas Wagner:
// http://29a.ch/2012/7/19/webgl-terrain-rendering-water-fog

const float oceanFrequency = 125000.0;
const float oceanAnimationSpeed = 0.006;
const float oceanAmplitude = 2.0;
const float oceanSpecularIntensity = 0.5;

vec4 computeWaterColor(vec3 positionEyeCoordinates, vec2 textureCoordinates, mat3 enuToEye, vec3 imageryColor, float specularMapValue)
{
    float time = czm_frameNumber * oceanAnimationSpeed;
    
    vec3 positionToEyeEC = -positionEyeCoordinates;
    float positionToEyeECLength = length(positionToEyeEC);

    // The double normalize below works around a bug in Firefox on Android devices.
    vec3 normalizedpositionToEyeEC = normalize(normalize(positionToEyeEC));
    
    // Fade out the waves as the camera moves far from the surface.
    float waveIntensity = waveFade(70000.0, 1000000.0, positionToEyeECLength);

#ifdef SHOW_OCEAN_WAVES
    vec4 noise = czm_getWaterNoise(u_oceanNormalMap, textureCoordinates * oceanFrequency, time, 0.0);
    vec3 normalTangentSpace = noise.xyz * vec3(1.0, 1.0, (1.0 / oceanAmplitude));
    
    // fade out the normal perturbation as we move farther from the water surface
    normalTangentSpace.xy *= waveIntensity;
    normalTangentSpace = normalize(normalTangentSpace);
#else
    vec3 normalTangentSpace = vec3(0.0, 0.0, 1.0);
#endif

    vec3 normalEC = enuToEye * normalTangentSpace;
    
    const vec3 waveHighlightColor = vec3(0.3, 0.45, 0.6);
    
    // Use diffuse light to highlight the waves
    float diffuseIntensity = getLambertDiffuse(czm_sunDirectionEC, normalEC);
    vec3 diffuseHighlight = waveHighlightColor * diffuseIntensity;
    
#ifdef SHOW_OCEAN_WAVES
    // Where diffuse light is low or non-existent, use wave highlights based solely on
    // the wave bumpiness and no particular light direction.
    float tsPerturbationRatio = normalTangentSpace.z;
    vec3 nonDiffuseHighlight = mix(waveHighlightColor * 5.0 * (1.0 - tsPerturbationRatio), vec3(0.0), diffuseIntensity);
#else
    vec3 nonDiffuseHighlight = vec3(0.0);
#endif

    // Add specular highlights in 3D, and in all modes when zoomed in.
    float specularIntensity = getSpecular(czm_sunDirectionEC, normalizedpositionToEyeEC, normalEC, 10.0) + 0.25 * getSpecular(czm_moonDirectionEC, normalizedpositionToEyeEC, normalEC, 10.0);
    float surfaceReflectance = mix(0.0, mix(u_zoomedOutOceanSpecularIntensity, oceanSpecularIntensity, waveIntensity), specularMapValue);
    float specular = specularIntensity * surfaceReflectance;
    
    return vec4(imageryColor + diffuseHighlight + nonDiffuseHighlight + specular, 1.0); 
}

#endif // #ifdef SHOW_REFLECTIVE_OCEAN
