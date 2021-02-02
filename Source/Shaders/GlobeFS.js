//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec4 u_initialColor;\n\
\n\
#if TEXTURE_UNITS > 0\n\
uniform sampler2D u_dayTextures[TEXTURE_UNITS];\n\
uniform vec4 u_dayTextureTranslationAndScale[TEXTURE_UNITS];\n\
uniform bool u_dayTextureUseWebMercatorT[TEXTURE_UNITS];\n\
\n\
#ifdef APPLY_ALPHA\n\
uniform float u_dayTextureAlpha[TEXTURE_UNITS];\n\
#endif\n\
\n\
#ifdef APPLY_DAY_NIGHT_ALPHA\n\
uniform float u_dayTextureNightAlpha[TEXTURE_UNITS];\n\
uniform float u_dayTextureDayAlpha[TEXTURE_UNITS];\n\
#endif\n\
\n\
#ifdef APPLY_SPLIT\n\
uniform float u_dayTextureSplit[TEXTURE_UNITS];\n\
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
#ifdef APPLY_IMAGERY_CUTOUT\n\
uniform vec4 u_dayTextureCutoutRectangles[TEXTURE_UNITS];\n\
#endif\n\
\n\
#ifdef APPLY_COLOR_TO_ALPHA\n\
uniform vec4 u_colorsToAlpha[TEXTURE_UNITS];\n\
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
#if defined(ENABLE_DAYNIGHT_SHADING) || defined(GROUND_ATMOSPHERE)\n\
uniform vec2 u_lightingFadeDistance;\n\
#endif\n\
\n\
#ifdef TILE_LIMIT_RECTANGLE\n\
uniform vec4 u_cartographicLimitRectangle;\n\
#endif\n\
\n\
#ifdef GROUND_ATMOSPHERE\n\
uniform vec2 u_nightFadeDistance;\n\
#endif\n\
\n\
#ifdef ENABLE_CLIPPING_PLANES\n\
uniform highp sampler2D u_clippingPlanes;\n\
uniform mat4 u_clippingPlanesMatrix;\n\
uniform vec4 u_clippingPlanesEdgeStyle;\n\
#endif\n\
\n\
#if defined(FOG) && defined(DYNAMIC_ATMOSPHERE_LIGHTING) && (defined(ENABLE_VERTEX_LIGHTING) || defined(ENABLE_DAYNIGHT_SHADING))\n\
uniform float u_minimumBrightness;\n\
#endif\n\
\n\
#ifdef COLOR_CORRECT\n\
uniform vec3 u_hsbShift; // Hue, saturation, brightness\n\
#endif\n\
\n\
#ifdef HIGHLIGHT_FILL_TILE\n\
uniform vec4 u_fillHighlightColor;\n\
#endif\n\
\n\
#ifdef TRANSLUCENT\n\
uniform vec4 u_frontFaceAlphaByDistance;\n\
uniform vec4 u_backFaceAlphaByDistance;\n\
uniform vec4 u_translucencyRectangle;\n\
#endif\n\
\n\
#ifdef UNDERGROUND_COLOR\n\
uniform vec4 u_undergroundColor;\n\
uniform vec4 u_undergroundColorAlphaByDistance;\n\
#endif\n\
\n\
varying vec3 v_positionMC;\n\
varying vec3 v_positionEC;\n\
varying vec3 v_textureCoordinates;\n\
varying vec3 v_normalMC;\n\
varying vec3 v_normalEC;\n\
\n\
#ifdef APPLY_MATERIAL\n\
varying float v_height;\n\
varying float v_slope;\n\
varying float v_aspect;\n\
#endif\n\
\n\
#if defined(FOG) || defined(GROUND_ATMOSPHERE) || defined(UNDERGROUND_COLOR) || defined(TRANSLUCENT)\n\
varying float v_distance;\n\
#endif\n\
\n\
#if defined(FOG) || defined(GROUND_ATMOSPHERE)\n\
varying vec3 v_fogRayleighColor;\n\
varying vec3 v_fogMieColor;\n\
#endif\n\
\n\
#ifdef GROUND_ATMOSPHERE\n\
varying vec3 v_rayleighColor;\n\
varying vec3 v_mieColor;\n\
#endif\n\
\n\
#if defined(UNDERGROUND_COLOR) || defined(TRANSLUCENT)\n\
float interpolateByDistance(vec4 nearFarScalar, float distance)\n\
{\n\
    float startDistance = nearFarScalar.x;\n\
    float startValue = nearFarScalar.y;\n\
    float endDistance = nearFarScalar.z;\n\
    float endValue = nearFarScalar.w;\n\
    float t = clamp((distance - startDistance) / (endDistance - startDistance), 0.0, 1.0);\n\
    return mix(startValue, endValue, t);\n\
}\n\
#endif\n\
\n\
#if defined(UNDERGROUND_COLOR) || defined(TRANSLUCENT) || defined(APPLY_MATERIAL)\n\
vec4 alphaBlend(vec4 sourceColor, vec4 destinationColor)\n\
{\n\
    return sourceColor * vec4(sourceColor.aaa, 1.0) + destinationColor * (1.0 - sourceColor.a);\n\
}\n\
#endif\n\
\n\
#ifdef TRANSLUCENT\n\
bool inTranslucencyRectangle()\n\
{\n\
    return\n\
        v_textureCoordinates.x > u_translucencyRectangle.x &&\n\
        v_textureCoordinates.x < u_translucencyRectangle.z &&\n\
        v_textureCoordinates.y > u_translucencyRectangle.y &&\n\
        v_textureCoordinates.y < u_translucencyRectangle.w;\n\
}\n\
#endif\n\
\n\
vec4 sampleAndBlend(\n\
    vec4 previousColor,\n\
    sampler2D textureToSample,\n\
    vec2 tileTextureCoordinates,\n\
    vec4 textureCoordinateRectangle,\n\
    vec4 textureCoordinateTranslationAndScale,\n\
    float textureAlpha,\n\
    float textureNightAlpha,\n\
    float textureDayAlpha,\n\
    float textureBrightness,\n\
    float textureContrast,\n\
    float textureHue,\n\
    float textureSaturation,\n\
    float textureOneOverGamma,\n\
    float split,\n\
    vec4 colorToAlpha,\n\
    float nightBlend)\n\
{\n\
    // This crazy step stuff sets the alpha to 0.0 if this following condition is true:\n\
    //    tileTextureCoordinates.s < textureCoordinateRectangle.s ||\n\
    //    tileTextureCoordinates.s > textureCoordinateRectangle.p ||\n\
    //    tileTextureCoordinates.t < textureCoordinateRectangle.t ||\n\
    //    tileTextureCoordinates.t > textureCoordinateRectangle.q\n\
    // In other words, the alpha is zero if the fragment is outside the rectangle\n\
    // covered by this texture.  Would an actual 'if' yield better performance?\n\
    vec2 alphaMultiplier = step(textureCoordinateRectangle.st, tileTextureCoordinates);\n\
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;\n\
\n\
    alphaMultiplier = step(vec2(0.0), textureCoordinateRectangle.pq - tileTextureCoordinates);\n\
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;\n\
\n\
#if defined(APPLY_DAY_NIGHT_ALPHA) && defined(ENABLE_DAYNIGHT_SHADING)\n\
    textureAlpha *= mix(textureDayAlpha, textureNightAlpha, nightBlend);\n\
#endif\n\
\n\
    vec2 translation = textureCoordinateTranslationAndScale.xy;\n\
    vec2 scale = textureCoordinateTranslationAndScale.zw;\n\
    vec2 textureCoordinates = tileTextureCoordinates * scale + translation;\n\
    vec4 value = texture2D(textureToSample, textureCoordinates);\n\
    vec3 color = value.rgb;\n\
    float alpha = value.a;\n\
\n\
#ifdef APPLY_COLOR_TO_ALPHA\n\
    vec3 colorDiff = abs(color.rgb - colorToAlpha.rgb);\n\
    colorDiff.r = max(max(colorDiff.r, colorDiff.g), colorDiff.b);\n\
    alpha = czm_branchFreeTernary(colorDiff.r < colorToAlpha.a, 0.0, alpha);\n\
#endif\n\
\n\
#if !defined(APPLY_GAMMA)\n\
    vec4 tempColor = czm_gammaCorrect(vec4(color, alpha));\n\
    color = tempColor.rgb;\n\
    alpha = tempColor.a;\n\
#else\n\
    color = pow(color, vec3(textureOneOverGamma));\n\
#endif\n\
\n\
#ifdef APPLY_SPLIT\n\
    float splitPosition = czm_imagerySplitPosition;\n\
    // Split to the left\n\
    if (split < 0.0 && gl_FragCoord.x > splitPosition) {\n\
       alpha = 0.0;\n\
    }\n\
    // Split to the right\n\
    else if (split > 0.0 && gl_FragCoord.x < splitPosition) {\n\
       alpha = 0.0;\n\
    }\n\
#endif\n\
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
    float sourceAlpha = alpha * textureAlpha;\n\
    float outAlpha = mix(previousColor.a, 1.0, sourceAlpha);\n\
    outAlpha += sign(outAlpha) - 1.0;\n\
\n\
    vec3 outColor = mix(previousColor.rgb * previousColor.a, color, sourceAlpha) / outAlpha;\n\
\n\
    // When rendering imagery for a tile in multiple passes,\n\
    // some GPU/WebGL implementation combinations will not blend fragments in\n\
    // additional passes correctly if their computation includes an unmasked\n\
    // divide-by-zero operation,\n\
    // even if it's not in the output or if the output has alpha zero.\n\
    //\n\
    // For example, without sanitization for outAlpha,\n\
    // this renders without artifacts:\n\
    //   if (outAlpha == 0.0) { outColor = vec3(0.0); }\n\
    //\n\
    // but using czm_branchFreeTernary will cause portions of the tile that are\n\
    // alpha-zero in the additional pass to render as black instead of blending\n\
    // with the previous pass:\n\
    //   outColor = czm_branchFreeTernary(outAlpha == 0.0, vec3(0.0), outColor);\n\
    //\n\
    // So instead, sanitize against divide-by-zero,\n\
    // store this state on the sign of outAlpha, and correct on return.\n\
\n\
    return vec4(outColor, max(outAlpha, 0.0));\n\
}\n\
\n\
vec3 colorCorrect(vec3 rgb) {\n\
#ifdef COLOR_CORRECT\n\
    // Convert rgb color to hsb\n\
    vec3 hsb = czm_RGBToHSB(rgb);\n\
    // Perform hsb shift\n\
    hsb.x += u_hsbShift.x; // hue\n\
    hsb.y = clamp(hsb.y + u_hsbShift.y, 0.0, 1.0); // saturation\n\
    hsb.z = hsb.z > czm_epsilon7 ? hsb.z + u_hsbShift.z : 0.0; // brightness\n\
    // Convert shifted hsb back to rgb\n\
    rgb = czm_HSBToRGB(hsb);\n\
#endif\n\
    return rgb;\n\
}\n\
\n\
vec4 computeDayColor(vec4 initialColor, vec3 textureCoordinates, float nightBlend);\n\
vec4 computeWaterColor(vec3 positionEyeCoordinates, vec2 textureCoordinates, mat3 enuToEye, vec4 imageryColor, float specularMapValue, float fade);\n\
\n\
#ifdef GROUND_ATMOSPHERE\n\
vec3 computeGroundAtmosphereColor(vec3 fogColor, vec4 finalColor, vec3 atmosphereLightDirection, float cameraDist);\n\
#endif\n\
\n\
const float fExposure = 2.0;\n\
\n\
void main()\n\
{\n\
#ifdef TILE_LIMIT_RECTANGLE\n\
    if (v_textureCoordinates.x < u_cartographicLimitRectangle.x || u_cartographicLimitRectangle.z < v_textureCoordinates.x ||\n\
        v_textureCoordinates.y < u_cartographicLimitRectangle.y || u_cartographicLimitRectangle.w < v_textureCoordinates.y)\n\
        {\n\
            discard;\n\
        }\n\
#endif\n\
\n\
#ifdef ENABLE_CLIPPING_PLANES\n\
    float clipDistance = clip(gl_FragCoord, u_clippingPlanes, u_clippingPlanesMatrix);\n\
#endif\n\
\n\
#if defined(SHOW_REFLECTIVE_OCEAN) || defined(ENABLE_DAYNIGHT_SHADING) || defined(HDR)\n\
    vec3 normalMC = czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0));   // normalized surface normal in model coordinates\n\
    vec3 normalEC = czm_normal3D * normalMC;                                         // normalized surface normal in eye coordiantes\n\
#endif\n\
\n\
#if defined(APPLY_DAY_NIGHT_ALPHA) && defined(ENABLE_DAYNIGHT_SHADING)\n\
    float nightBlend = 1.0 - clamp(czm_getLambertDiffuse(czm_lightDirectionEC, normalEC) * 5.0, 0.0, 1.0);\n\
#else\n\
    float nightBlend = 0.0;\n\
#endif\n\
\n\
    // The clamp below works around an apparent bug in Chrome Canary v23.0.1241.0\n\
    // where the fragment shader sees textures coordinates < 0.0 and > 1.0 for the\n\
    // fragments on the edges of tiles even though the vertex shader is outputting\n\
    // coordinates strictly in the 0-1 range.\n\
    vec4 color = computeDayColor(u_initialColor, clamp(v_textureCoordinates, 0.0, 1.0), nightBlend);\n\
\n\
#ifdef SHOW_TILE_BOUNDARIES\n\
    if (v_textureCoordinates.x < (1.0/256.0) || v_textureCoordinates.x > (255.0/256.0) ||\n\
        v_textureCoordinates.y < (1.0/256.0) || v_textureCoordinates.y > (255.0/256.0))\n\
    {\n\
        color = vec4(1.0, 0.0, 0.0, 1.0);\n\
    }\n\
#endif\n\
\n\
#if defined(ENABLE_DAYNIGHT_SHADING) || defined(GROUND_ATMOSPHERE)\n\
    float cameraDist;\n\
    if (czm_sceneMode == czm_sceneMode2D)\n\
    {\n\
        cameraDist = max(czm_frustumPlanes.x - czm_frustumPlanes.y, czm_frustumPlanes.w - czm_frustumPlanes.z) * 0.5;\n\
    }\n\
    else if (czm_sceneMode == czm_sceneModeColumbusView)\n\
    {\n\
        cameraDist = -czm_view[3].z;\n\
    }\n\
    else\n\
    {\n\
        cameraDist = length(czm_view[3]);\n\
    }\n\
    float fadeOutDist = u_lightingFadeDistance.x;\n\
    float fadeInDist = u_lightingFadeDistance.y;\n\
    if (czm_sceneMode != czm_sceneMode3D) {\n\
        vec3 radii = czm_ellipsoidRadii;\n\
        float maxRadii = max(radii.x, max(radii.y, radii.z));\n\
        fadeOutDist -= maxRadii;\n\
        fadeInDist -= maxRadii;\n\
    }\n\
    float fade = clamp((cameraDist - fadeOutDist) / (fadeInDist - fadeOutDist), 0.0, 1.0);\n\
#else\n\
    float fade = 0.0;\n\
#endif\n\
\n\
#ifdef SHOW_REFLECTIVE_OCEAN\n\
    vec2 waterMaskTranslation = u_waterMaskTranslationAndScale.xy;\n\
    vec2 waterMaskScale = u_waterMaskTranslationAndScale.zw;\n\
    vec2 waterMaskTextureCoordinates = v_textureCoordinates.xy * waterMaskScale + waterMaskTranslation;\n\
    waterMaskTextureCoordinates.y = 1.0 - waterMaskTextureCoordinates.y;\n\
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
        color = computeWaterColor(v_positionEC, textureCoordinates, enuToEye, color, mask, fade);\n\
    }\n\
#endif\n\
\n\
#ifdef APPLY_MATERIAL\n\
    czm_materialInput materialInput;\n\
    materialInput.st = v_textureCoordinates.st;\n\
    materialInput.normalEC = normalize(v_normalEC);\n\
    materialInput.slope = v_slope;\n\
    materialInput.height = v_height;\n\
    materialInput.aspect = v_aspect;\n\
    czm_material material = czm_getMaterial(materialInput);\n\
    vec4 materialColor = vec4(material.diffuse, material.alpha);\n\
    color = alphaBlend(materialColor, color);\n\
#endif\n\
\n\
#ifdef ENABLE_VERTEX_LIGHTING\n\
    float diffuseIntensity = clamp(czm_getLambertDiffuse(czm_lightDirectionEC, normalize(v_normalEC)) * 0.9 + 0.3, 0.0, 1.0);\n\
    vec4 finalColor = vec4(color.rgb * czm_lightColor * diffuseIntensity, color.a);\n\
#elif defined(ENABLE_DAYNIGHT_SHADING)\n\
    float diffuseIntensity = clamp(czm_getLambertDiffuse(czm_lightDirectionEC, normalEC) * 5.0 + 0.3, 0.0, 1.0);\n\
    diffuseIntensity = mix(1.0, diffuseIntensity, fade);\n\
    vec4 finalColor = vec4(color.rgb * czm_lightColor * diffuseIntensity, color.a);\n\
#else\n\
    vec4 finalColor = color;\n\
#endif\n\
\n\
#ifdef ENABLE_CLIPPING_PLANES\n\
    vec4 clippingPlanesEdgeColor = vec4(1.0);\n\
    clippingPlanesEdgeColor.rgb = u_clippingPlanesEdgeStyle.rgb;\n\
    float clippingPlanesEdgeWidth = u_clippingPlanesEdgeStyle.a;\n\
\n\
    if (clipDistance < clippingPlanesEdgeWidth)\n\
    {\n\
        finalColor = clippingPlanesEdgeColor;\n\
    }\n\
#endif\n\
\n\
#ifdef HIGHLIGHT_FILL_TILE\n\
    finalColor = vec4(mix(finalColor.rgb, u_fillHighlightColor.rgb, u_fillHighlightColor.a), finalColor.a);\n\
#endif\n\
\n\
#if defined(FOG) || defined(GROUND_ATMOSPHERE)\n\
    vec3 fogColor = colorCorrect(v_fogMieColor) + finalColor.rgb * colorCorrect(v_fogRayleighColor);\n\
#ifndef HDR\n\
    fogColor = vec3(1.0) - exp(-fExposure * fogColor);\n\
#endif\n\
#endif\n\
\n\
#if defined(DYNAMIC_ATMOSPHERE_LIGHTING_FROM_SUN)\n\
    vec3 atmosphereLightDirection = czm_sunDirectionWC;\n\
#else\n\
    vec3 atmosphereLightDirection = czm_lightDirectionWC;\n\
#endif\n\
\n\
#ifdef FOG\n\
#if defined(DYNAMIC_ATMOSPHERE_LIGHTING) && (defined(ENABLE_VERTEX_LIGHTING) || defined(ENABLE_DAYNIGHT_SHADING))\n\
    float darken = clamp(dot(normalize(czm_viewerPositionWC), atmosphereLightDirection), u_minimumBrightness, 1.0);\n\
    fogColor *= darken;\n\
#endif\n\
\n\
#ifdef HDR\n\
    const float modifier = 0.15;\n\
    finalColor = vec4(czm_fog(v_distance, finalColor.rgb, fogColor, modifier), finalColor.a);\n\
#else\n\
    finalColor = vec4(czm_fog(v_distance, finalColor.rgb, fogColor), finalColor.a);\n\
#endif\n\
#endif\n\
\n\
#ifdef GROUND_ATMOSPHERE\n\
    if (!czm_backFacing())\n\
    {\n\
        vec3 groundAtmosphereColor = computeGroundAtmosphereColor(fogColor, finalColor, atmosphereLightDirection, cameraDist);\n\
        finalColor = vec4(mix(finalColor.rgb, groundAtmosphereColor, fade), finalColor.a);\n\
    }\n\
#endif\n\
\n\
#ifdef UNDERGROUND_COLOR\n\
    if (czm_backFacing())\n\
    {\n\
        float distanceFromEllipsoid = max(czm_eyeHeight, 0.0);\n\
        float distance = max(v_distance - distanceFromEllipsoid, 0.0);\n\
        float blendAmount = interpolateByDistance(u_undergroundColorAlphaByDistance, distance);\n\
        vec4 undergroundColor = vec4(u_undergroundColor.rgb, u_undergroundColor.a * blendAmount);\n\
        finalColor = alphaBlend(undergroundColor, finalColor);\n\
    }\n\
#endif\n\
\n\
#ifdef TRANSLUCENT\n\
    if (inTranslucencyRectangle())\n\
    {\n\
      vec4 alphaByDistance = gl_FrontFacing ? u_frontFaceAlphaByDistance : u_backFaceAlphaByDistance;\n\
      finalColor.a *= interpolateByDistance(alphaByDistance, v_distance);\n\
    }\n\
#endif\n\
\n\
    gl_FragColor = finalColor;\n\
}\n\
\n\
#ifdef GROUND_ATMOSPHERE\n\
vec3 computeGroundAtmosphereColor(vec3 fogColor, vec4 finalColor, vec3 atmosphereLightDirection, float cameraDist)\n\
{\n\
#if defined(PER_FRAGMENT_GROUND_ATMOSPHERE) && defined(DYNAMIC_ATMOSPHERE_LIGHTING) && (defined(ENABLE_DAYNIGHT_SHADING) || defined(ENABLE_VERTEX_LIGHTING))\n\
    float mpp = czm_metersPerPixel(vec4(0.0, 0.0, -czm_currentFrustum.x, 1.0), 1.0);\n\
    vec2 xy = gl_FragCoord.xy / czm_viewport.zw * 2.0 - vec2(1.0);\n\
    xy *= czm_viewport.zw * mpp * 0.5;\n\
\n\
    vec3 direction = normalize(vec3(xy, -czm_currentFrustum.x));\n\
    czm_ray ray = czm_ray(vec3(0.0), direction);\n\
\n\
    vec3 ellipsoid_center = czm_view[3].xyz;\n\
\n\
    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid_center, czm_ellipsoidInverseRadii);\n\
\n\
    vec3 ellipsoidPosition = czm_pointAlongRay(ray, intersection.start);\n\
    ellipsoidPosition = (czm_inverseView * vec4(ellipsoidPosition, 1.0)).xyz;\n\
    AtmosphereColor atmosColor = computeGroundAtmosphereFromSpace(ellipsoidPosition, true, atmosphereLightDirection);\n\
\n\
    vec3 groundAtmosphereColor = colorCorrect(atmosColor.mie) + finalColor.rgb * colorCorrect(atmosColor.rayleigh);\n\
#ifndef HDR\n\
    groundAtmosphereColor = vec3(1.0) - exp(-fExposure * groundAtmosphereColor);\n\
#endif\n\
\n\
    float fadeInDist = u_nightFadeDistance.x;\n\
    float fadeOutDist = u_nightFadeDistance.y;\n\
\n\
    float sunlitAtmosphereIntensity = clamp((cameraDist - fadeOutDist) / (fadeInDist - fadeOutDist), 0.0, 1.0);\n\
\n\
#ifdef HDR\n\
    // Some tweaking to make HDR look better\n\
    sunlitAtmosphereIntensity = max(sunlitAtmosphereIntensity * sunlitAtmosphereIntensity, 0.03);\n\
#endif\n\
\n\
    groundAtmosphereColor = mix(groundAtmosphereColor, fogColor, sunlitAtmosphereIntensity);\n\
#else\n\
    vec3 groundAtmosphereColor = fogColor;\n\
#endif\n\
\n\
#ifdef HDR\n\
    // Some tweaking to make HDR look better\n\
    groundAtmosphereColor = czm_saturation(groundAtmosphereColor, 1.6);\n\
#endif\n\
\n\
    return groundAtmosphereColor;\n\
}\n\
#endif\n\
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
vec4 computeWaterColor(vec3 positionEyeCoordinates, vec2 textureCoordinates, mat3 enuToEye, vec4 imageryColor, float maskValue, float fade)\n\
{\n\
    vec3 positionToEyeEC = -positionEyeCoordinates;\n\
    float positionToEyeECLength = length(positionToEyeEC);\n\
\n\
    // The double normalize below works around a bug in Firefox on Android devices.\n\
    vec3 normalizedPositionToEyeEC = normalize(normalize(positionToEyeEC));\n\
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
    vec3 normalTangentSpace =\n\
        (highAltitudeFade * normalTangentSpaceHighAltitude) +\n\
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
    float diffuseIntensity = czm_getLambertDiffuse(czm_lightDirectionEC, normalEC) * maskValue;\n\
    vec3 diffuseHighlight = waveHighlightColor * diffuseIntensity * (1.0 - fade);\n\
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
    float specularIntensity = czm_getSpecular(czm_lightDirectionEC, normalizedPositionToEyeEC, normalEC, 10.0);\n\
    float surfaceReflectance = mix(0.0, mix(u_zoomedOutOceanSpecularIntensity, oceanSpecularIntensity, waveIntensity), maskValue);\n\
    float specular = specularIntensity * surfaceReflectance;\n\
\n\
#ifdef HDR\n\
    specular *= 1.4;\n\
\n\
    float e = 0.2;\n\
    float d = 3.3;\n\
    float c = 1.7;\n\
\n\
    vec3 color = imageryColor.rgb + (c * (vec3(e) + imageryColor.rgb * d) * (diffuseHighlight + nonDiffuseHighlight + specular));\n\
#else\n\
    vec3 color = imageryColor.rgb + diffuseHighlight + nonDiffuseHighlight + specular;\n\
#endif\n\
\n\
    return vec4(color, imageryColor.a);\n\
}\n\
\n\
#endif // #ifdef SHOW_REFLECTIVE_OCEAN\n\
";
