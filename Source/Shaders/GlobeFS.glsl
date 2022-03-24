uniform vec4 u_initialColor;

#if TEXTURE_UNITS > 0
uniform sampler2D u_dayTextures[TEXTURE_UNITS];
uniform vec4 u_dayTextureTranslationAndScale[TEXTURE_UNITS];
uniform bool u_dayTextureUseWebMercatorT[TEXTURE_UNITS];

#ifdef APPLY_ALPHA
uniform float u_dayTextureAlpha[TEXTURE_UNITS];
#endif

#ifdef APPLY_DAY_NIGHT_ALPHA
uniform float u_dayTextureNightAlpha[TEXTURE_UNITS];
uniform float u_dayTextureDayAlpha[TEXTURE_UNITS];
#endif

#ifdef APPLY_SPLIT
uniform float u_dayTextureSplit[TEXTURE_UNITS];
#endif

#ifdef APPLY_BRIGHTNESS
uniform float u_dayTextureBrightness[TEXTURE_UNITS];
#endif

#ifdef APPLY_CONTRAST
uniform float u_dayTextureContrast[TEXTURE_UNITS];
#endif

#ifdef APPLY_HUE
uniform float u_dayTextureHue[TEXTURE_UNITS];
#endif

#ifdef APPLY_SATURATION
uniform float u_dayTextureSaturation[TEXTURE_UNITS];
#endif

#ifdef APPLY_GAMMA
uniform float u_dayTextureOneOverGamma[TEXTURE_UNITS];
#endif

#ifdef APPLY_IMAGERY_CUTOUT
uniform vec4 u_dayTextureCutoutRectangles[TEXTURE_UNITS];
#endif

#ifdef APPLY_COLOR_TO_ALPHA
uniform vec4 u_colorsToAlpha[TEXTURE_UNITS];
#endif

uniform vec4 u_dayTextureTexCoordsRectangle[TEXTURE_UNITS];
#endif

#ifdef SHOW_REFLECTIVE_OCEAN
uniform sampler2D u_waterMask;
uniform vec4 u_waterMaskTranslationAndScale;
uniform float u_zoomedOutOceanSpecularIntensity;
#endif

#ifdef SHOW_OCEAN_WAVES
uniform sampler2D u_oceanNormalMap;
#endif

#if defined(ENABLE_DAYNIGHT_SHADING) || defined(GROUND_ATMOSPHERE)
uniform vec2 u_lightingFadeDistance;
#endif

#ifdef TILE_LIMIT_RECTANGLE
uniform vec4 u_cartographicLimitRectangle;
#endif

#ifdef GROUND_ATMOSPHERE
uniform vec2 u_nightFadeDistance;
#endif

#ifdef ENABLE_CLIPPING_PLANES
uniform highp sampler2D u_clippingPlanes;
uniform mat4 u_clippingPlanesMatrix;
uniform vec4 u_clippingPlanesEdgeStyle;
#endif

#if defined(GROUND_ATMOSPHERE) || defined(FOG) && defined(DYNAMIC_ATMOSPHERE_LIGHTING) && (defined(ENABLE_VERTEX_LIGHTING) || defined(ENABLE_DAYNIGHT_SHADING))
uniform float u_minimumBrightness;
#endif

#ifdef COLOR_CORRECT
uniform vec3 u_hsbShift; // Hue, saturation, brightness
#endif

#ifdef HIGHLIGHT_FILL_TILE
uniform vec4 u_fillHighlightColor;
#endif

#ifdef TRANSLUCENT
uniform vec4 u_frontFaceAlphaByDistance;
uniform vec4 u_backFaceAlphaByDistance;
uniform vec4 u_translucencyRectangle;
#endif

#ifdef UNDERGROUND_COLOR
uniform vec4 u_undergroundColor;
uniform vec4 u_undergroundColorAlphaByDistance;
#endif

#ifdef ENABLE_VERTEX_LIGHTING
uniform float u_lambertDiffuseMultiplier;
#endif

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec3 v_textureCoordinates;
varying vec3 v_normalMC;
varying vec3 v_normalEC;

#ifdef APPLY_MATERIAL
varying float v_height;
varying float v_slope;
varying float v_aspect;
#endif

#if defined(FOG) || defined(GROUND_ATMOSPHERE) || defined(UNDERGROUND_COLOR) || defined(TRANSLUCENT)
varying float v_distance;
#endif

#if defined(GROUND_ATMOSPHERE) || defined(FOG)
varying vec3 v_atmosphereRayleighColor;
varying vec3 v_atmosphereMieColor;
varying float v_atmosphereOpacity;
#endif

#if defined(UNDERGROUND_COLOR) || defined(TRANSLUCENT)
float interpolateByDistance(vec4 nearFarScalar, float distance)
{
    float startDistance = nearFarScalar.x;
    float startValue = nearFarScalar.y;
    float endDistance = nearFarScalar.z;
    float endValue = nearFarScalar.w;
    float t = clamp((distance - startDistance) / (endDistance - startDistance), 0.0, 1.0);
    return mix(startValue, endValue, t);
}
#endif

#if defined(UNDERGROUND_COLOR) || defined(TRANSLUCENT) || defined(APPLY_MATERIAL)
vec4 alphaBlend(vec4 sourceColor, vec4 destinationColor)
{
    return sourceColor * vec4(sourceColor.aaa, 1.0) + destinationColor * (1.0 - sourceColor.a);
}
#endif

#ifdef TRANSLUCENT
bool inTranslucencyRectangle()
{
    return
        v_textureCoordinates.x > u_translucencyRectangle.x &&
        v_textureCoordinates.x < u_translucencyRectangle.z &&
        v_textureCoordinates.y > u_translucencyRectangle.y &&
        v_textureCoordinates.y < u_translucencyRectangle.w;
}
#endif

vec4 sampleAndBlend(
    vec4 previousColor,
    sampler2D textureToSample,
    vec2 tileTextureCoordinates,
    vec4 textureCoordinateRectangle,
    vec4 textureCoordinateTranslationAndScale,
    float textureAlpha,
    float textureNightAlpha,
    float textureDayAlpha,
    float textureBrightness,
    float textureContrast,
    float textureHue,
    float textureSaturation,
    float textureOneOverGamma,
    float split,
    vec4 colorToAlpha,
    float nightBlend)
{
    // This crazy step stuff sets the alpha to 0.0 if this following condition is true:
    //    tileTextureCoordinates.s < textureCoordinateRectangle.s ||
    //    tileTextureCoordinates.s > textureCoordinateRectangle.p ||
    //    tileTextureCoordinates.t < textureCoordinateRectangle.t ||
    //    tileTextureCoordinates.t > textureCoordinateRectangle.q
    // In other words, the alpha is zero if the fragment is outside the rectangle
    // covered by this texture.  Would an actual 'if' yield better performance?
    vec2 alphaMultiplier = step(textureCoordinateRectangle.st, tileTextureCoordinates);
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;

    alphaMultiplier = step(vec2(0.0), textureCoordinateRectangle.pq - tileTextureCoordinates);
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;

#if defined(APPLY_DAY_NIGHT_ALPHA) && defined(ENABLE_DAYNIGHT_SHADING)
    textureAlpha *= mix(textureDayAlpha, textureNightAlpha, nightBlend);
#endif

    vec2 translation = textureCoordinateTranslationAndScale.xy;
    vec2 scale = textureCoordinateTranslationAndScale.zw;
    vec2 textureCoordinates = tileTextureCoordinates * scale + translation;
    vec4 value = texture2D(textureToSample, textureCoordinates);
    vec3 color = value.rgb;
    float alpha = value.a;

#ifdef APPLY_COLOR_TO_ALPHA
    vec3 colorDiff = abs(color.rgb - colorToAlpha.rgb);
    colorDiff.r = max(max(colorDiff.r, colorDiff.g), colorDiff.b);
    alpha = czm_branchFreeTernary(colorDiff.r < colorToAlpha.a, 0.0, alpha);
#endif

#if !defined(APPLY_GAMMA)
    vec4 tempColor = czm_gammaCorrect(vec4(color, alpha));
    color = tempColor.rgb;
    alpha = tempColor.a;
#else
    color = pow(color, vec3(textureOneOverGamma));
#endif

#ifdef APPLY_SPLIT
    float splitPosition = czm_imagerySplitPosition;
    // Split to the left
    if (split < 0.0 && gl_FragCoord.x > splitPosition) {
       alpha = 0.0;
    }
    // Split to the right
    else if (split > 0.0 && gl_FragCoord.x < splitPosition) {
       alpha = 0.0;
    }
#endif

#ifdef APPLY_BRIGHTNESS
    color = mix(vec3(0.0), color, textureBrightness);
#endif

#ifdef APPLY_CONTRAST
    color = mix(vec3(0.5), color, textureContrast);
#endif

#ifdef APPLY_HUE
    color = czm_hue(color, textureHue);
#endif

#ifdef APPLY_SATURATION
    color = czm_saturation(color, textureSaturation);
#endif

    float sourceAlpha = alpha * textureAlpha;
    float outAlpha = mix(previousColor.a, 1.0, sourceAlpha);
    outAlpha += sign(outAlpha) - 1.0;

    vec3 outColor = mix(previousColor.rgb * previousColor.a, color, sourceAlpha) / outAlpha;

    // When rendering imagery for a tile in multiple passes,
    // some GPU/WebGL implementation combinations will not blend fragments in
    // additional passes correctly if their computation includes an unmasked
    // divide-by-zero operation,
    // even if it's not in the output or if the output has alpha zero.
    //
    // For example, without sanitization for outAlpha,
    // this renders without artifacts:
    //   if (outAlpha == 0.0) { outColor = vec3(0.0); }
    //
    // but using czm_branchFreeTernary will cause portions of the tile that are
    // alpha-zero in the additional pass to render as black instead of blending
    // with the previous pass:
    //   outColor = czm_branchFreeTernary(outAlpha == 0.0, vec3(0.0), outColor);
    //
    // So instead, sanitize against divide-by-zero,
    // store this state on the sign of outAlpha, and correct on return.

    return vec4(outColor, max(outAlpha, 0.0));
}

vec3 colorCorrect(vec3 rgb) {
#ifdef COLOR_CORRECT
    // Convert rgb color to hsb
    vec3 hsb = czm_RGBToHSB(rgb);
    // Perform hsb shift
    hsb.x += u_hsbShift.x; // hue
    hsb.y = clamp(hsb.y + u_hsbShift.y, 0.0, 1.0); // saturation
    hsb.z = hsb.z > czm_epsilon7 ? hsb.z + u_hsbShift.z : 0.0; // brightness
    // Convert shifted hsb back to rgb
    rgb = czm_HSBToRGB(hsb);
#endif
    return rgb;
}

vec4 computeDayColor(vec4 initialColor, vec3 textureCoordinates, float nightBlend);
vec4 computeWaterColor(vec3 positionEyeCoordinates, vec2 textureCoordinates, mat3 enuToEye, vec4 imageryColor, float specularMapValue, float fade);

const float fExposure = 2.0;

vec3 computeEllipsoidPosition()
{
    float mpp = czm_metersPerPixel(vec4(0.0, 0.0, -czm_currentFrustum.x, 1.0), 1.0);
    vec2 xy = gl_FragCoord.xy / czm_viewport.zw * 2.0 - vec2(1.0);
    xy *= czm_viewport.zw * mpp * 0.5;

    vec3 direction = normalize(vec3(xy, -czm_currentFrustum.x));
    czm_ray ray = czm_ray(vec3(0.0), direction);

    vec3 ellipsoid_center = czm_view[3].xyz;

    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid_center, czm_ellipsoidInverseRadii);

    vec3 ellipsoidPosition = czm_pointAlongRay(ray, intersection.start);
    return (czm_inverseView * vec4(ellipsoidPosition, 1.0)).xyz;
}

void main()
{
#ifdef TILE_LIMIT_RECTANGLE
    if (v_textureCoordinates.x < u_cartographicLimitRectangle.x || u_cartographicLimitRectangle.z < v_textureCoordinates.x ||
        v_textureCoordinates.y < u_cartographicLimitRectangle.y || u_cartographicLimitRectangle.w < v_textureCoordinates.y)
        {
            discard;
        }
#endif

#ifdef ENABLE_CLIPPING_PLANES
    float clipDistance = clip(gl_FragCoord, u_clippingPlanes, u_clippingPlanesMatrix);
#endif

#if defined(SHOW_REFLECTIVE_OCEAN) || defined(ENABLE_DAYNIGHT_SHADING) || defined(HDR)
    vec3 normalMC = czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0));   // normalized surface normal in model coordinates
    vec3 normalEC = czm_normal3D * normalMC;                                         // normalized surface normal in eye coordiantes
#endif

#if defined(APPLY_DAY_NIGHT_ALPHA) && defined(ENABLE_DAYNIGHT_SHADING)
    float nightBlend = 1.0 - clamp(czm_getLambertDiffuse(czm_lightDirectionEC, normalEC) * 5.0, 0.0, 1.0);
#else
    float nightBlend = 0.0;
#endif

    // The clamp below works around an apparent bug in Chrome Canary v23.0.1241.0
    // where the fragment shader sees textures coordinates < 0.0 and > 1.0 for the
    // fragments on the edges of tiles even though the vertex shader is outputting
    // coordinates strictly in the 0-1 range.
    vec4 color = computeDayColor(u_initialColor, clamp(v_textureCoordinates, 0.0, 1.0), nightBlend);

#ifdef SHOW_TILE_BOUNDARIES
    if (v_textureCoordinates.x < (1.0/256.0) || v_textureCoordinates.x > (255.0/256.0) ||
        v_textureCoordinates.y < (1.0/256.0) || v_textureCoordinates.y > (255.0/256.0))
    {
        color = vec4(1.0, 0.0, 0.0, 1.0);
    }
#endif

#if defined(ENABLE_DAYNIGHT_SHADING) || defined(GROUND_ATMOSPHERE)
    float cameraDist;
    if (czm_sceneMode == czm_sceneMode2D)
    {
        cameraDist = max(czm_frustumPlanes.x - czm_frustumPlanes.y, czm_frustumPlanes.w - czm_frustumPlanes.z) * 0.5;
    }
    else if (czm_sceneMode == czm_sceneModeColumbusView)
    {
        cameraDist = -czm_view[3].z;
    }
    else
    {
        cameraDist = length(czm_view[3]);
    }
    float fadeOutDist = u_lightingFadeDistance.x;
    float fadeInDist = u_lightingFadeDistance.y;
    if (czm_sceneMode != czm_sceneMode3D) {
        vec3 radii = czm_ellipsoidRadii;
        float maxRadii = max(radii.x, max(radii.y, radii.z));
        fadeOutDist -= maxRadii;
        fadeInDist -= maxRadii;
    }
    float fade = clamp((cameraDist - fadeOutDist) / (fadeInDist - fadeOutDist), 0.0, 1.0);
#else
    float fade = 0.0;
#endif

#ifdef SHOW_REFLECTIVE_OCEAN
    vec2 waterMaskTranslation = u_waterMaskTranslationAndScale.xy;
    vec2 waterMaskScale = u_waterMaskTranslationAndScale.zw;
    vec2 waterMaskTextureCoordinates = v_textureCoordinates.xy * waterMaskScale + waterMaskTranslation;
    waterMaskTextureCoordinates.y = 1.0 - waterMaskTextureCoordinates.y;

    float mask = texture2D(u_waterMask, waterMaskTextureCoordinates).r;

    if (mask > 0.0)
    {
        mat3 enuToEye = czm_eastNorthUpToEyeCoordinates(v_positionMC, normalEC);

        vec2 ellipsoidTextureCoordinates = czm_ellipsoidWgs84TextureCoordinates(normalMC);
        vec2 ellipsoidFlippedTextureCoordinates = czm_ellipsoidWgs84TextureCoordinates(normalMC.zyx);

        vec2 textureCoordinates = mix(ellipsoidTextureCoordinates, ellipsoidFlippedTextureCoordinates, czm_morphTime * smoothstep(0.9, 0.95, normalMC.z));

        color = computeWaterColor(v_positionEC, textureCoordinates, enuToEye, color, mask, fade);
    }
#endif

#ifdef APPLY_MATERIAL
    czm_materialInput materialInput;
    materialInput.st = v_textureCoordinates.st;
    materialInput.normalEC = normalize(v_normalEC);
    materialInput.positionToEyeEC = -v_positionEC;
    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(v_positionMC, normalize(v_normalEC));     
    materialInput.slope = v_slope;
    materialInput.height = v_height;
    materialInput.aspect = v_aspect;
    czm_material material = czm_getMaterial(materialInput);
    vec4 materialColor = vec4(material.diffuse, material.alpha);
    color = alphaBlend(materialColor, color);
#endif

#ifdef ENABLE_VERTEX_LIGHTING
    float diffuseIntensity = clamp(czm_getLambertDiffuse(czm_lightDirectionEC, normalize(v_normalEC)) * u_lambertDiffuseMultiplier + 0.3, 0.0, 1.0);
    vec4 finalColor = vec4(color.rgb * czm_lightColor * diffuseIntensity, color.a);
#elif defined(ENABLE_DAYNIGHT_SHADING)
    float diffuseIntensity = clamp(czm_getLambertDiffuse(czm_lightDirectionEC, normalEC) * 5.0 + 0.3, 0.0, 1.0);
    diffuseIntensity = mix(1.0, diffuseIntensity, fade);
    vec4 finalColor = vec4(color.rgb * czm_lightColor * diffuseIntensity, color.a);
#else
    vec4 finalColor = color;
#endif

#ifdef ENABLE_CLIPPING_PLANES
    vec4 clippingPlanesEdgeColor = vec4(1.0);
    clippingPlanesEdgeColor.rgb = u_clippingPlanesEdgeStyle.rgb;
    float clippingPlanesEdgeWidth = u_clippingPlanesEdgeStyle.a;

    if (clipDistance < clippingPlanesEdgeWidth)
    {
        finalColor = clippingPlanesEdgeColor;
    }
#endif

#ifdef HIGHLIGHT_FILL_TILE
    finalColor = vec4(mix(finalColor.rgb, u_fillHighlightColor.rgb, u_fillHighlightColor.a), finalColor.a);
#endif

#if defined(DYNAMIC_ATMOSPHERE_LIGHTING_FROM_SUN)
    vec3 atmosphereLightDirection = czm_sunDirectionWC;
#else
    vec3 atmosphereLightDirection = czm_lightDirectionWC;
#endif

#if defined(GROUND_ATMOSPHERE) || defined(FOG)
    if (!czm_backFacing())
    {
        AtmosphereColor atmosphereColor;
        vec3 positionWC;

        // When the camera is far away (camera distance > nightFadeOutDistance), the scattering is computed in the fragment shader.
        // Otherwise, the scattering is computed in the vertex shader.
        #ifndef PER_FRAGMENT_GROUND_ATMOSPHERE
            atmosphereColor.rayleigh = v_atmosphereRayleighColor;
            atmosphereColor.mie = v_atmosphereMieColor;
            atmosphereColor.opacity = v_atmosphereOpacity;
            positionWC = v_positionMC;            
        #else
            bool dynamicLighting = false;
            #if defined(DYNAMIC_ATMOSPHERE_LIGHTING) && (defined(ENABLE_DAYNIGHT_SHADING) || defined(ENABLE_VERTEX_LIGHTING))
                dynamicLighting = true;
            #endif

            positionWC = computeEllipsoidPosition();
            atmosphereColor = computeGroundAtmosphereFromSpace(positionWC, dynamicLighting, atmosphereLightDirection);
        #endif

        atmosphereColor.rayleigh = colorCorrect(atmosphereColor.rayleigh);
        atmosphereColor.mie = colorCorrect(atmosphereColor.mie);

        vec4 groundAtmosphereColor = computeFinalColor(positionWC, atmosphereLightDirection, atmosphereColor.rayleigh, atmosphereColor.mie, atmosphereColor.opacity);

        // Fog is applied to tiles selected for fog, close to the Eartth.
        #ifdef FOG
            vec3 fogColor = groundAtmosphereColor.rgb;
            
            // If there is lighting, apply that to the fog.
            #if defined(DYNAMIC_ATMOSPHERE_LIGHTING) && (defined(ENABLE_VERTEX_LIGHTING) || defined(ENABLE_DAYNIGHT_SHADING))
                float darken = clamp(dot(normalize(czm_viewerPositionWC), atmosphereLightDirection), u_minimumBrightness, 1.0);
                fogColor *= darken;                
            #endif

            #ifndef HDR
                fogColor = vec3(1.0) - exp(-fExposure * fogColor);
            #endif

            #ifdef HDR
                const float modifier = 0.15;
                finalColor = vec4(czm_fog(v_distance, finalColor.rgb, fogColor.rgb, modifier), finalColor.a);
            #else
                finalColor = vec4(czm_fog(v_distance, finalColor.rgb, fogColor.rgb), finalColor.a);
            #endif
        #else
            #ifndef HDR
                groundAtmosphereColor.rgb = vec3(1.0) - exp(-fExposure * groundAtmosphereColor.rgb);
            #endif
            
            float transmittance = (1.0 - groundAtmosphereColor.a);
            vec3 finalAtmosphereColor = finalColor.rgb * transmittance + groundAtmosphereColor.rgb;
            finalColor.rgb = mix(finalColor.rgb, finalAtmosphereColor, fade);
        #endif
    }
#endif

#ifdef UNDERGROUND_COLOR
    if (czm_backFacing())
    {
        float distanceFromEllipsoid = max(czm_eyeHeight, 0.0);
        float distance = max(v_distance - distanceFromEllipsoid, 0.0);
        float blendAmount = interpolateByDistance(u_undergroundColorAlphaByDistance, distance);
        vec4 undergroundColor = vec4(u_undergroundColor.rgb, u_undergroundColor.a * blendAmount);
        finalColor = alphaBlend(undergroundColor, finalColor);
    }
#endif

#ifdef TRANSLUCENT
    if (inTranslucencyRectangle())
    {
      vec4 alphaByDistance = gl_FrontFacing ? u_frontFaceAlphaByDistance : u_backFaceAlphaByDistance;
      finalColor.a *= interpolateByDistance(alphaByDistance, v_distance);
    }
#endif
    
    gl_FragColor =  finalColor;
}


#ifdef SHOW_REFLECTIVE_OCEAN

float waveFade(float edge0, float edge1, float x)
{
    float y = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return pow(1.0 - y, 5.0);
}

float linearFade(float edge0, float edge1, float x)
{
    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

// Based on water rendering by Jonas Wagner:
// http://29a.ch/2012/7/19/webgl-terrain-rendering-water-fog

// low altitude wave settings
const float oceanFrequencyLowAltitude = 825000.0;
const float oceanAnimationSpeedLowAltitude = 0.004;
const float oceanOneOverAmplitudeLowAltitude = 1.0 / 2.0;
const float oceanSpecularIntensity = 0.5;

// high altitude wave settings
const float oceanFrequencyHighAltitude = 125000.0;
const float oceanAnimationSpeedHighAltitude = 0.008;
const float oceanOneOverAmplitudeHighAltitude = 1.0 / 2.0;

vec4 computeWaterColor(vec3 positionEyeCoordinates, vec2 textureCoordinates, mat3 enuToEye, vec4 imageryColor, float maskValue, float fade)
{
    vec3 positionToEyeEC = -positionEyeCoordinates;
    float positionToEyeECLength = length(positionToEyeEC);

    // The double normalize below works around a bug in Firefox on Android devices.
    vec3 normalizedPositionToEyeEC = normalize(normalize(positionToEyeEC));

    // Fade out the waves as the camera moves far from the surface.
    float waveIntensity = waveFade(70000.0, 1000000.0, positionToEyeECLength);

#ifdef SHOW_OCEAN_WAVES
    // high altitude waves
    float time = czm_frameNumber * oceanAnimationSpeedHighAltitude;
    vec4 noise = czm_getWaterNoise(u_oceanNormalMap, textureCoordinates * oceanFrequencyHighAltitude, time, 0.0);
    vec3 normalTangentSpaceHighAltitude = vec3(noise.xy, noise.z * oceanOneOverAmplitudeHighAltitude);

    // low altitude waves
    time = czm_frameNumber * oceanAnimationSpeedLowAltitude;
    noise = czm_getWaterNoise(u_oceanNormalMap, textureCoordinates * oceanFrequencyLowAltitude, time, 0.0);
    vec3 normalTangentSpaceLowAltitude = vec3(noise.xy, noise.z * oceanOneOverAmplitudeLowAltitude);

    // blend the 2 wave layers based on distance to surface
    float highAltitudeFade = linearFade(0.0, 60000.0, positionToEyeECLength);
    float lowAltitudeFade = 1.0 - linearFade(20000.0, 60000.0, positionToEyeECLength);
    vec3 normalTangentSpace =
        (highAltitudeFade * normalTangentSpaceHighAltitude) +
        (lowAltitudeFade * normalTangentSpaceLowAltitude);
    normalTangentSpace = normalize(normalTangentSpace);

    // fade out the normal perturbation as we move farther from the water surface
    normalTangentSpace.xy *= waveIntensity;
    normalTangentSpace = normalize(normalTangentSpace);
#else
    vec3 normalTangentSpace = vec3(0.0, 0.0, 1.0);
#endif

    vec3 normalEC = enuToEye * normalTangentSpace;

    const vec3 waveHighlightColor = vec3(0.3, 0.45, 0.6);

    // Use diffuse light to highlight the waves
    float diffuseIntensity = czm_getLambertDiffuse(czm_lightDirectionEC, normalEC) * maskValue;
    vec3 diffuseHighlight = waveHighlightColor * diffuseIntensity * (1.0 - fade);

#ifdef SHOW_OCEAN_WAVES
    // Where diffuse light is low or non-existent, use wave highlights based solely on
    // the wave bumpiness and no particular light direction.
    float tsPerturbationRatio = normalTangentSpace.z;
    vec3 nonDiffuseHighlight = mix(waveHighlightColor * 5.0 * (1.0 - tsPerturbationRatio), vec3(0.0), diffuseIntensity);
#else
    vec3 nonDiffuseHighlight = vec3(0.0);
#endif

    // Add specular highlights in 3D, and in all modes when zoomed in.
    float specularIntensity = czm_getSpecular(czm_lightDirectionEC, normalizedPositionToEyeEC, normalEC, 10.0);
    float surfaceReflectance = mix(0.0, mix(u_zoomedOutOceanSpecularIntensity, oceanSpecularIntensity, waveIntensity), maskValue);
    float specular = specularIntensity * surfaceReflectance;

#ifdef HDR
    specular *= 1.4;

    float e = 0.2;
    float d = 3.3;
    float c = 1.7;

    vec3 color = imageryColor.rgb + (c * (vec3(e) + imageryColor.rgb * d) * (diffuseHighlight + nonDiffuseHighlight + specular));
#else
    vec3 color = imageryColor.rgb + diffuseHighlight + nonDiffuseHighlight + specular;
#endif

    return vec4(color, imageryColor.a);
}

#endif // #ifdef SHOW_REFLECTIVE_OCEAN
