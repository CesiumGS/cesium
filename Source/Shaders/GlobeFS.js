    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "//#define SHOW_TILE_BOUNDARIES\n\
\n\
uniform vec4 u_initialColor;\n\
\n\
#if TEXTURE_UNITS > 0\n\
uniform sampler2D u_dayTextures[TEXTURE_UNITS];\n\
uniform vec4 u_dayTextureTranslationAndScale[TEXTURE_UNITS];\n\
\n\
#ifdef APPLY_ALPHA\n\
uniform float u_dayTextureAlpha[TEXTURE_UNITS];\n\
#endif\n\
\n\
#ifdef APPLY_BRIGHTNESS\n\
uniform float u_dayTextureBrightness[TEXTURE_UNITS];\n\
#endif\n\
\n\
#ifdef APPLY_CONTRAST\n\
uniform float u_dayTextureContrast[TEXTURE_UNITS];\n\
#endif\n\
\n\
#ifdef APPLY_HUE\n\
uniform float u_dayTextureHue[TEXTURE_UNITS];\n\
#endif\n\
\n\
#ifdef APPLY_SATURATION\n\
uniform float u_dayTextureSaturation[TEXTURE_UNITS];\n\
#endif\n\
\n\
#ifdef APPLY_GAMMA\n\
uniform float u_dayTextureOneOverGamma[TEXTURE_UNITS];\n\
#endif\n\
\n\
uniform vec4 u_dayTextureTexCoordsRectangle[TEXTURE_UNITS];\n\
#endif\n\
\n\
#ifdef SHOW_REFLECTIVE_OCEAN\n\
uniform sampler2D u_waterMask;\n\
uniform vec4 u_waterMaskTranslationAndScale;\n\
uniform float u_zoomedOutOceanSpecularIntensity;\n\
#endif\n\
\n\
#ifdef SHOW_OCEAN_WAVES\n\
uniform sampler2D u_oceanNormalMap;\n\
#endif\n\
\n\
#ifdef ENABLE_DAYNIGHT_SHADING\n\
uniform vec2 u_lightingFadeDistance;\n\
#endif\n\
\n\
varying vec3 v_positionMC;\n\
varying vec3 v_positionEC;\n\
varying vec2 v_textureCoordinates;\n\
varying vec3 v_normalMC;\n\
varying vec3 v_normalEC;\n\
\n\
vec4 sampleAndBlend(\n\
    vec4 previousColor,\n\
    sampler2D texture,\n\
    vec2 tileTextureCoordinates,\n\
    vec4 textureCoordinateRectangle,\n\
    vec4 textureCoordinateTranslationAndScale,\n\
    float textureAlpha,\n\
    float textureBrightness,\n\
    float textureContrast,\n\
    float textureHue,\n\
    float textureSaturation,\n\
    float textureOneOverGamma)\n\
{\n\
    // This crazy step stuff sets the alpha to 0.0 if this following condition is true:\n\
    //    tileTextureCoordinates.s < textureCoordinateRectangle.s ||\n\
    //    tileTextureCoordinates.s > textureCoordinateRectangle.p ||\n\
    //    tileTextureCoordinates.t < textureCoordinateRectangle.t ||\n\
    //    tileTextureCoordinates.t > textureCoordinateRectangle.q\n\
    // In other words, the alpha is zero if the fragment is outside the rectangle\n\
    // covered by this texture.  Would an actual 'if' yield better performance?\n\
    vec2 alphaMultiplier = step(textureCoordinateRectangle.st, tileTextureCoordinates); \n\
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;\n\
    \n\
    alphaMultiplier = step(vec2(0.0), textureCoordinateRectangle.pq - tileTextureCoordinates);\n\
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;\n\
    \n\
    vec2 translation = textureCoordinateTranslationAndScale.xy;\n\
    vec2 scale = textureCoordinateTranslationAndScale.zw;\n\
    vec2 textureCoordinates = tileTextureCoordinates * scale + translation;\n\
    vec4 sample = texture2D(texture, textureCoordinates);\n\
    vec3 color = sample.rgb;\n\
    float alpha = sample.a;\n\
    \n\
#ifdef APPLY_BRIGHTNESS\n\
    color = mix(vec3(0.0), color, textureBrightness);\n\
#endif\n\
\n\
#ifdef APPLY_CONTRAST\n\
    color = mix(vec3(0.5), color, textureContrast);\n\
#endif\n\
\n\
#ifdef APPLY_HUE\n\
    color = czm_hue(color, textureHue);\n\
#endif\n\
\n\
#ifdef APPLY_SATURATION\n\
    color = czm_saturation(color, textureSaturation);\n\
#endif\n\
\n\
#ifdef APPLY_GAMMA\n\
    color = pow(color, vec3(textureOneOverGamma));\n\
#endif\n\
\n\
    float sourceAlpha = alpha * textureAlpha;\n\
    float outAlpha = mix(previousColor.a, 1.0, sourceAlpha);\n\
    vec3 outColor = mix(previousColor.rgb * previousColor.a, color, sourceAlpha) / outAlpha;\n\
    return vec4(outColor, outAlpha);\n\
}\n\
\n\
vec4 computeDayColor(vec4 initialColor, vec2 textureCoordinates);\n\
vec4 computeWaterColor(vec3 positionEyeCoordinates, vec2 textureCoordinates, mat3 enuToEye, vec4 imageryColor, float specularMapValue);\n\
\n\
void main()\n\
{\n\
    // The clamp below works around an apparent bug in Chrome Canary v23.0.1241.0\n\
    // where the fragment shader sees textures coordinates < 0.0 and > 1.0 for the\n\
    // fragments on the edges of tiles even though the vertex shader is outputting\n\
    // coordinates strictly in the 0-1 range.\n\
    vec4 color = computeDayColor(u_initialColor, clamp(v_textureCoordinates, 0.0, 1.0));\n\
\n\
#ifdef SHOW_TILE_BOUNDARIES\n\
    if (v_textureCoordinates.x < (1.0/256.0) || v_textureCoordinates.x > (255.0/256.0) ||\n\
        v_textureCoordinates.y < (1.0/256.0) || v_textureCoordinates.y > (255.0/256.0))\n\
    {\n\
        color = vec4(1.0, 0.0, 0.0, 1.0);\n\
    }\n\
#endif\n\
\n\
#if defined(SHOW_REFLECTIVE_OCEAN) || defined(ENABLE_DAYNIGHT_SHADING)\n\
    vec3 normalMC = normalize(czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));   // normalized surface normal in model coordinates\n\
    vec3 normalEC = normalize(czm_normal3D * normalMC);                                         // normalized surface normal in eye coordiantes\n\
#endif\n\
\n\
#ifdef SHOW_REFLECTIVE_OCEAN\n\
    vec2 waterMaskTranslation = u_waterMaskTranslationAndScale.xy;\n\
    vec2 waterMaskScale = u_waterMaskTranslationAndScale.zw;\n\
    vec2 waterMaskTextureCoordinates = v_textureCoordinates * waterMaskScale + waterMaskTranslation;\n\
\n\
    float mask = texture2D(u_waterMask, waterMaskTextureCoordinates).r;\n\
\n\
    if (mask > 0.0)\n\
    {\n\
        mat3 enuToEye = czm_eastNorthUpToEyeCoordinates(v_positionMC, normalEC);\n\
        \n\
        vec2 ellipsoidTextureCoordinates = czm_ellipsoidWgs84TextureCoordinates(normalMC);\n\
        vec2 ellipsoidFlippedTextureCoordinates = czm_ellipsoidWgs84TextureCoordinates(normalMC.zyx);\n\
\n\
        vec2 textureCoordinates = mix(ellipsoidTextureCoordinates, ellipsoidFlippedTextureCoordinates, czm_morphTime * smoothstep(0.9, 0.95, normalMC.z));\n\
\n\
        color = computeWaterColor(v_positionEC, textureCoordinates, enuToEye, color, mask);\n\
    }\n\
#endif\n\
\n\
#ifdef ENABLE_VERTEX_LIGHTING\n\
    float diffuseIntensity = clamp(czm_getLambertDiffuse(czm_sunDirectionEC, normalize(v_normalEC)) * 0.9 + 0.3, 0.0, 1.0);\n\
    gl_FragColor = vec4(color.rgb * diffuseIntensity, color.a);\n\
#elif defined(ENABLE_DAYNIGHT_SHADING)\n\
    float diffuseIntensity = clamp(czm_getLambertDiffuse(czm_sunDirectionEC, normalEC) * 5.0 + 0.3, 0.0, 1.0);\n\
    float cameraDist = length(czm_view[3]);\n\
    float fadeOutDist = u_lightingFadeDistance.x;\n\
    float fadeInDist = u_lightingFadeDistance.y;\n\
    float t = clamp((cameraDist - fadeOutDist) / (fadeInDist - fadeOutDist), 0.0, 1.0);\n\
    diffuseIntensity = mix(1.0, diffuseIntensity, t);\n\
    gl_FragColor = vec4(color.rgb * diffuseIntensity, color.a);\n\
#else\n\
    gl_FragColor = color;\n\
#endif\n\
}\n\
\n\
#ifdef SHOW_REFLECTIVE_OCEAN\n\
\n\
float waveFade(float edge0, float edge1, float x)\n\
{\n\
    float y = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);\n\
    return pow(1.0 - y, 5.0);\n\
}\n\
\n\
float linearFade(float edge0, float edge1, float x)\n\
{\n\
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);\n\
}\n\
\n\
// Based on water rendering by Jonas Wagner:\n\
// http://29a.ch/2012/7/19/webgl-terrain-rendering-water-fog\n\
\n\
// low altitude wave settings\n\
const float oceanFrequencyLowAltitude = 825000.0;\n\
const float oceanAnimationSpeedLowAltitude = 0.004;\n\
const float oceanOneOverAmplitudeLowAltitude = 1.0 / 2.0;\n\
const float oceanSpecularIntensity = 0.5;\n\
 \n\
// high altitude wave settings\n\
const float oceanFrequencyHighAltitude = 125000.0;\n\
const float oceanAnimationSpeedHighAltitude = 0.008;\n\
const float oceanOneOverAmplitudeHighAltitude = 1.0 / 2.0;\n\
\n\
vec4 computeWaterColor(vec3 positionEyeCoordinates, vec2 textureCoordinates, mat3 enuToEye, vec4 imageryColor, float maskValue)\n\
{\n\
    vec3 positionToEyeEC = -positionEyeCoordinates;\n\
    float positionToEyeECLength = length(positionToEyeEC);\n\
\n\
    // The double normalize below works around a bug in Firefox on Android devices.\n\
    vec3 normalizedpositionToEyeEC = normalize(normalize(positionToEyeEC));\n\
    \n\
    // Fade out the waves as the camera moves far from the surface.\n\
    float waveIntensity = waveFade(70000.0, 1000000.0, positionToEyeECLength);\n\
\n\
#ifdef SHOW_OCEAN_WAVES\n\
    // high altitude waves\n\
    float time = czm_frameNumber * oceanAnimationSpeedHighAltitude;\n\
    vec4 noise = czm_getWaterNoise(u_oceanNormalMap, textureCoordinates * oceanFrequencyHighAltitude, time, 0.0);\n\
    vec3 normalTangentSpaceHighAltitude = vec3(noise.xy, noise.z * oceanOneOverAmplitudeHighAltitude);\n\
    \n\
    // low altitude waves\n\
    time = czm_frameNumber * oceanAnimationSpeedLowAltitude;\n\
    noise = czm_getWaterNoise(u_oceanNormalMap, textureCoordinates * oceanFrequencyLowAltitude, time, 0.0);\n\
    vec3 normalTangentSpaceLowAltitude = vec3(noise.xy, noise.z * oceanOneOverAmplitudeLowAltitude);\n\
    \n\
    // blend the 2 wave layers based on distance to surface\n\
    float highAltitudeFade = linearFade(0.0, 60000.0, positionToEyeECLength);\n\
    float lowAltitudeFade = 1.0 - linearFade(20000.0, 60000.0, positionToEyeECLength);\n\
    vec3 normalTangentSpace = \n\
    	(highAltitudeFade * normalTangentSpaceHighAltitude) + \n\
    	(lowAltitudeFade * normalTangentSpaceLowAltitude);\n\
    normalTangentSpace = normalize(normalTangentSpace);\n\
    \n\
    // fade out the normal perturbation as we move farther from the water surface\n\
    normalTangentSpace.xy *= waveIntensity;\n\
    normalTangentSpace = normalize(normalTangentSpace);\n\
#else\n\
    vec3 normalTangentSpace = vec3(0.0, 0.0, 1.0);\n\
#endif\n\
\n\
    vec3 normalEC = enuToEye * normalTangentSpace;\n\
    \n\
    const vec3 waveHighlightColor = vec3(0.3, 0.45, 0.6);\n\
    \n\
    // Use diffuse light to highlight the waves\n\
    float diffuseIntensity = czm_getLambertDiffuse(czm_sunDirectionEC, normalEC) * maskValue;\n\
    vec3 diffuseHighlight = waveHighlightColor * diffuseIntensity;\n\
    \n\
#ifdef SHOW_OCEAN_WAVES\n\
    // Where diffuse light is low or non-existent, use wave highlights based solely on\n\
    // the wave bumpiness and no particular light direction.\n\
    float tsPerturbationRatio = normalTangentSpace.z;\n\
    vec3 nonDiffuseHighlight = mix(waveHighlightColor * 5.0 * (1.0 - tsPerturbationRatio), vec3(0.0), diffuseIntensity);\n\
#else\n\
    vec3 nonDiffuseHighlight = vec3(0.0);\n\
#endif\n\
\n\
    // Add specular highlights in 3D, and in all modes when zoomed in.\n\
    float specularIntensity = czm_getSpecular(czm_sunDirectionEC, normalizedpositionToEyeEC, normalEC, 10.0) + 0.25 * czm_getSpecular(czm_moonDirectionEC, normalizedpositionToEyeEC, normalEC, 10.0);\n\
    float surfaceReflectance = mix(0.0, mix(u_zoomedOutOceanSpecularIntensity, oceanSpecularIntensity, waveIntensity), maskValue);\n\
    float specular = specularIntensity * surfaceReflectance;\n\
    \n\
    return vec4(imageryColor.rgb + diffuseHighlight + nonDiffuseHighlight + specular, imageryColor.a); \n\
}\n\
\n\
#endif // #ifdef SHOW_REFLECTIVE_OCEAN\n\
";
});