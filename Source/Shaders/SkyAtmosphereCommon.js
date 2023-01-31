/**
 * @license
 * Copyright (c) 2000-2005, Sean O'Neil (s_p_oneil@hotmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * * Neither the name of the project nor the names of its contributors may be
 *   used to endorse or promote products derived from this software without
 *   specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Modifications made by Cesium GS, Inc.
 */
//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * @license\n\
 * Copyright (c) 2000-2005, Sean O'Neil (s_p_oneil@hotmail.com)\n\
 * All rights reserved.\n\
 *\n\
 * Redistribution and use in source and binary forms, with or without\n\
 * modification, are permitted provided that the following conditions\n\
 * are met:\n\
 *\n\
 * * Redistributions of source code must retain the above copyright notice,\n\
 *   this list of conditions and the following disclaimer.\n\
 * * Redistributions in binary form must reproduce the above copyright notice,\n\
 *   this list of conditions and the following disclaimer in the documentation\n\
 *   and/or other materials provided with the distribution.\n\
 * * Neither the name of the project nor the names of its contributors may be\n\
 *   used to endorse or promote products derived from this software without\n\
 *   specific prior written permission.\n\
 *\n\
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\"\n\
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\n\
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n\
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE\n\
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\n\
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\n\
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\n\
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\n\
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n\
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\
 *\n\
 * Modifications made by Cesium GS, Inc.\n\
 */\n\
\n\
 // Code:  http://sponeil.net/\n\
 // GPU Gems 2 Article:  https://developer.nvidia.com/gpugems/GPUGems2/gpugems2_chapter16.html\n\
\n\
const float Kr = 0.0025;\n\
const float Kr4PI = Kr * 4.0 * czm_pi;\n\
const float Km = 0.0015;\n\
const float Km4PI = Km * 4.0 * czm_pi;\n\
const float ESun = 15.0;\n\
const float KmESun = Km * ESun;\n\
const float KrESun = Kr * ESun;\n\
const vec3 InvWavelength = vec3(\n\
    5.60204474633241,  // Red = 1.0 / Math.pow(0.650, 4.0)\n\
    9.473284437923038, // Green = 1.0 / Math.pow(0.570, 4.0)\n\
    19.643802610477206); // Blue = 1.0 / Math.pow(0.475, 4.0)\n\
const float rayleighScaleDepth = 0.25;\n\
\n\
const int nSamples = 2;\n\
const float fSamples = 2.0;\n\
\n\
const float g = -0.95;\n\
const float g2 = g * g;\n\
\n\
#ifdef COLOR_CORRECT\n\
uniform vec3 u_hsbShift; // Hue, saturation, brightness\n\
#endif\n\
\n\
uniform vec3 u_radiiAndDynamicAtmosphereColor; // outer radius, inner radius, dynamic atmosphere color flag\n\
\n\
float scale(float cosAngle)\n\
{\n\
    float x = 1.0 - cosAngle;\n\
    return rayleighScaleDepth  * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));\n\
}\n\
\n\
vec3 getLightDirection(vec3 positionWC)\n\
{\n\
    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;\n\
    vec3 lightDirection =\n\
        positionWC * float(lightEnum == 0.0) +\n\
        czm_lightDirectionWC * float(lightEnum == 1.0) +\n\
        czm_sunDirectionWC * float(lightEnum == 2.0);\n\
    return normalize(lightDirection);\n\
}\n\
\n\
void calculateRayScatteringFromSpace(in vec3 positionWC, in vec3 ray, in float innerRadius, in float outerRadius, inout float far, out vec3 start, out float startOffset)\n\
{\n\
    // Calculate the closest intersection of the ray with the outer atmosphere (which is the near point of the ray passing through the atmosphere)\n\
    float cameraHeight = length(positionWC);\n\
    float B = 2.0 * dot(positionWC, ray);\n\
    float C = cameraHeight * cameraHeight - outerRadius * outerRadius;\n\
    float det = max(0.0, B * B - 4.0 * C);\n\
    float near = 0.5 * (-B - sqrt(det));\n\
\n\
    // Calculate the ray's starting position, then calculate its scattering offset\n\
    start = positionWC + ray * near;\n\
    far -= near;\n\
    float startAngle = dot(ray, start) / outerRadius;\n\
    float startDepth = exp(-1.0 / rayleighScaleDepth);\n\
    startOffset = startDepth * scale(startAngle);\n\
}\n\
\n\
void calculateRayScatteringFromGround(in vec3 positionWC, in vec3 ray, in float atmosphereScale, in float innerRadius, out vec3 start, out float startOffset)\n\
{\n\
    // Calculate the ray's starting position, then calculate its scattering offset\n\
    float cameraHeight = length(positionWC);\n\
    start = positionWC;\n\
    float height = length(start);\n\
    float depth = exp((atmosphereScale / rayleighScaleDepth ) * (innerRadius - cameraHeight));\n\
    float startAngle = dot(ray, start) / height;\n\
    startOffset = depth*scale(startAngle);\n\
}\n\
\n\
czm_raySegment rayEllipsoidIntersection(czm_ray ray, vec3 inverseRadii)\n\
{\n\
    vec3 o = inverseRadii * (czm_inverseView * vec4(ray.origin, 1.0)).xyz;\n\
    vec3 d = inverseRadii * (czm_inverseView * vec4(ray.direction, 0.0)).xyz;\n\
\n\
    float a = dot(d, d);\n\
    float b = dot(d, o);\n\
    float c = dot(o, o) - 1.0;\n\
    float discriminant = b * b - a * c;\n\
    if (discriminant < 0.0)\n\
    {\n\
        return czm_emptyRaySegment;\n\
    }\n\
    discriminant = sqrt(discriminant);\n\
    float t1 = (-b - discriminant) / a;\n\
    float t2 = (-b + discriminant) / a;\n\
\n\
    if (t1 < 0.0 && t2 < 0.0)\n\
    {\n\
        return czm_emptyRaySegment;\n\
    }\n\
\n\
    if (t1 < 0.0 && t2 >= 0.0)\n\
    {\n\
        t1 = 0.0;\n\
    }\n\
\n\
    return czm_raySegment(t1, t2);\n\
}\n\
\n\
vec3 getAdjustedPosition(vec3 positionWC, float innerRadius)\n\
{\n\
  // Adjust the camera position so that atmosphere color looks the same wherever the eye height is the same\n\
  float cameraHeight = czm_eyeHeight + innerRadius;\n\
  return normalize(positionWC) * cameraHeight;\n\
}\n\
\n\
vec3 getTranslucentPosition(vec3 positionWC, vec3 outerPositionWC, float innerRadius, out bool intersectsEllipsoid)\n\
{\n\
    vec3 directionWC = normalize(outerPositionWC - positionWC);\n\
    vec3 directionEC = czm_viewRotation * directionWC;\n\
    czm_ray viewRay = czm_ray(vec3(0.0), directionEC);\n\
    czm_raySegment raySegment = rayEllipsoidIntersection(viewRay, czm_ellipsoidInverseRadii);\n\
    intersectsEllipsoid = raySegment.start >= 0.0;\n\
\n\
    if (intersectsEllipsoid)\n\
    {\n\
        return positionWC + raySegment.stop * directionWC;\n\
    }\n\
\n\
    return getAdjustedPosition(positionWC, innerRadius);\n\
}\n\
\n\
void calculateMieColorAndRayleighColor(vec3 outerPositionWC, out vec3 mieColor, out vec3 rayleighColor)\n\
{\n\
    // Unpack attributes\n\
    float outerRadius = u_radiiAndDynamicAtmosphereColor.x;\n\
    float innerRadius = u_radiiAndDynamicAtmosphereColor.y;\n\
\n\
#ifdef GLOBE_TRANSLUCENT\n\
    bool intersectsEllipsoid = false;\n\
    vec3 startPositionWC = getTranslucentPosition(czm_viewerPositionWC, outerPositionWC, innerRadius, intersectsEllipsoid);\n\
#else\n\
    vec3 startPositionWC = getAdjustedPosition(czm_viewerPositionWC, innerRadius);\n\
#endif\n\
\n\
    vec3 lightDirection = getLightDirection(startPositionWC);\n\
\n\
    // Get the ray from the start position to the outer position and its length (which is the far point of the ray passing through the atmosphere)\n\
    vec3 ray = outerPositionWC - startPositionWC;\n\
    float far = length(ray);\n\
    ray /= far;\n\
\n\
    float atmosphereScale = 1.0 / (outerRadius - innerRadius);\n\
\n\
    vec3 start;\n\
    float startOffset;\n\
\n\
#ifdef SKY_FROM_SPACE\n\
#ifdef GLOBE_TRANSLUCENT\n\
    if (intersectsEllipsoid)\n\
    {\n\
        calculateRayScatteringFromGround(startPositionWC, ray, atmosphereScale, innerRadius, start, startOffset);\n\
    }\n\
    else\n\
    {\n\
        calculateRayScatteringFromSpace(startPositionWC, ray, innerRadius, outerRadius, far, start, startOffset);\n\
    }\n\
#else\n\
    calculateRayScatteringFromSpace(startPositionWC, ray, innerRadius, outerRadius, far, start, startOffset);\n\
#endif\n\
#else\n\
    calculateRayScatteringFromGround(startPositionWC, ray, atmosphereScale, innerRadius, start, startOffset);\n\
#endif\n\
\n\
    // Initialize the scattering loop variables\n\
    float sampleLength = far / fSamples;\n\
    float scaledLength = sampleLength * atmosphereScale;\n\
    vec3 sampleRay = ray * sampleLength;\n\
    vec3 samplePoint = start + sampleRay * 0.5;\n\
\n\
    // Now loop through the sample rays\n\
    vec3 frontColor = vec3(0.0, 0.0, 0.0);\n\
\n\
    for (int i = 0; i<nSamples; i++)\n\
    {\n\
        float height = length(samplePoint);\n\
        float depth = exp((atmosphereScale / rayleighScaleDepth ) * (innerRadius - height));\n\
        float fLightAngle = dot(lightDirection, samplePoint) / height;\n\
        float fCameraAngle = dot(ray, samplePoint) / height;\n\
        float fScatter = (startOffset + depth*(scale(fLightAngle) - scale(fCameraAngle)));\n\
        vec3 attenuate = exp(-fScatter * (InvWavelength * Kr4PI + Km4PI));\n\
        frontColor += attenuate * (depth * scaledLength);\n\
        samplePoint += sampleRay;\n\
    }\n\
\n\
    // Finally, scale the Mie and Rayleigh colors and set up the varying variables for the pixel shader\n\
    mieColor = frontColor * KmESun;\n\
    rayleighColor = frontColor * (InvWavelength * KrESun);\n\
\n\
    // Cap mie and rayleigh colors to prevent NaNs when vertex interpolation happens\n\
    mieColor = min(mieColor, vec3(10000000.0));\n\
    rayleighColor = min(rayleighColor, vec3(10000000.0));\n\
}\n\
\n\
vec4 calculateFinalColor(vec3 positionWC, vec3 toCamera, vec3 lightDirection, vec3 mieColor, vec3 rayleighColor)\n\
{\n\
    // Extra normalize added for Android\n\
    float cosAngle = dot(lightDirection, normalize(toCamera)) / length(toCamera);\n\
    float rayleighPhase = 0.75 * (1.0 + cosAngle * cosAngle);\n\
    float miePhase = 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + cosAngle * cosAngle) / pow(1.0 + g2 - 2.0 * g * cosAngle, 1.5);\n\
\n\
    vec3 rgb = rayleighPhase * rayleighColor + miePhase * mieColor;\n\
\n\
    const float exposure = 2.0;\n\
    vec3 rgbExposure = vec3(1.0) - exp(-exposure * rgb);\n\
\n\
#ifndef HDR\n\
    rgb = rgbExposure;\n\
#endif\n\
\n\
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
\n\
    float outerRadius = u_radiiAndDynamicAtmosphereColor.x;\n\
    float innerRadius = u_radiiAndDynamicAtmosphereColor.y;\n\
    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;\n\
\n\
    float cameraHeight = czm_eyeHeight + innerRadius;\n\
\n\
    // Alter alpha based on how close the viewer is to the ground (1.0 = on ground, 0.0 = at edge of atmosphere)\n\
    float atmosphereAlpha = clamp((outerRadius - cameraHeight) / (outerRadius - innerRadius), 0.0, 1.0);\n\
\n\
    // Alter alpha based on time of day (0.0 = night , 1.0 = day)\n\
    float nightAlpha = (lightEnum != 0.0) ? clamp(dot(normalize(positionWC), lightDirection), 0.0, 1.0) : 1.0;\n\
    atmosphereAlpha *= pow(nightAlpha, 0.5);\n\
\n\
    vec4 finalColor = vec4(rgb, mix(clamp(rgbExposure.b, 0.0, 1.0), 1.0, atmosphereAlpha) * smoothstep(0.0, 1.0, czm_morphTime));\n\
\n\
    if (mieColor.b > 1.0)\n\
    {\n\
        // Fade atmosphere below the ellipsoid. As the camera zooms further away from the ellipsoid draw\n\
        // a larger atmosphere ring to cover empty space of lower LOD globe tiles.\n\
        float strength = mieColor.b;\n\
        float minDistance = outerRadius;\n\
        float maxDistance = outerRadius * 3.0;\n\
        float maxStrengthLerp = 1.0 - clamp((maxDistance - cameraHeight) / (maxDistance - minDistance), 0.0, 1.0);\n\
        float maxStrength = mix(100.0, 10000.0, maxStrengthLerp);\n\
        strength = min(strength, maxStrength);\n\
        float alpha = 1.0 - (strength / maxStrength);\n\
        finalColor.a = alpha;\n\
    }\n\
\n\
    return finalColor;\n\
}\n\
";
