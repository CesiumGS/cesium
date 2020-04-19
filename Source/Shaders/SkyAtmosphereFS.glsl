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

 // Code:  http://sponeil.net/
 // GPU Gems 2 Article:  https://developer.nvidia.com/gpugems/GPUGems2/gpugems2_chapter16.html

varying vec3 v_rayleighColor;
varying vec3 v_mieColor;
varying vec3 v_toCamera;
varying vec3 v_positionWC;

void calculateFinalColor(vec3 positionWC, vec3 toCamera, vec3 lightDirection, vec3 rayleighColor, vec3 mieColor)
{
    // Extra normalize added for Android
    float cosAngle = dot(lightDirection, normalize(toCamera)) / length(toCamera);
    float rayleighPhase = 0.75 * (1.0 + cosAngle * cosAngle);
    float miePhase = 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + cosAngle * cosAngle) / pow(1.0 + g2 - 2.0 * g * cosAngle, 1.5);

    vec3 rgb = rayleighPhase * rayleighColor + miePhase * mieColor;

    if (rgb.b > 1000000.0)
    {
        // Discard colors that exceed some large number value to prevent against NaN's from the exponent calculation below
        gl_FragColor = vec4(0.0);
        return;
    }

    const float exposure = 2.0;
    vec3 rgbExposure = vec3(1.0) - exp(-exposure * rgb);

#ifndef HDR
    rgb = rgbExposure;
#endif

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

    float outerRadius = u_radiiAndDynamicAtmosphereColor.x;
    float innerRadius = u_radiiAndDynamicAtmosphereColor.y;
    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;

    // Alter alpha based on how close the viewer is to the ground (1.0 = on ground, 0.0 = at edge of atmosphere)
    float atmosphereAlpha = clamp((outerRadius - length(positionWC)) / (outerRadius - innerRadius), 0.0, 1.0);

    // Alter alpha based on time of day (0.0 = night , 1.0 = day)
    float nightAlpha = (lightEnum != 0.0) ? clamp(dot(normalize(positionWC), lightDirection), 0.0, 1.0) : 1.0;
    atmosphereAlpha *= pow(nightAlpha, 0.5);

    gl_FragColor = vec4(rgb, mix(clamp(rgbExposure.b, 0.0, 1.0), 1.0, atmosphereAlpha) * smoothstep(0.0, 1.0, czm_morphTime));
}

void main (void)
{
    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;
    vec3 lightDirection = getLightDirection(lightEnum, v_positionWC);
    calculateFinalColor(v_positionWC, v_toCamera, lightDirection, v_rayleighColor, v_mieColor);
}
