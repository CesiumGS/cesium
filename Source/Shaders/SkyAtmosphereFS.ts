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
 * Modifications made by Analytical Graphics, Inc.
 */
//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef COLOR_CORRECT\n\
uniform vec3 u_hsbShift;\n\
#endif\n\
uniform vec4 u_cameraAndRadiiAndDynamicAtmosphereColor;\n\
const float g = -0.95;\n\
const float g2 = g * g;\n\
varying vec3 v_rayleighColor;\n\
varying vec3 v_mieColor;\n\
varying vec3 v_toCamera;\n\
varying vec3 v_positionEC;\n\
void main (void)\n\
{\n\
float cosAngle = dot(czm_sunDirectionWC, normalize(v_toCamera)) / length(v_toCamera);\n\
float rayleighPhase = 0.75 * (1.0 + cosAngle * cosAngle);\n\
float miePhase = 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + cosAngle * cosAngle) / pow(1.0 + g2 - 2.0 * g * cosAngle, 1.5);\n\
const float exposure = 2.0;\n\
vec3 rgb = rayleighPhase * v_rayleighColor + miePhase * v_mieColor;\n\
rgb = vec3(1.0) - exp(-exposure * rgb);\n\
#ifdef COLOR_CORRECT\n\
vec3 hsb = czm_RGBToHSB(rgb);\n\
hsb.x += u_hsbShift.x;\n\
hsb.y = clamp(hsb.y + u_hsbShift.y, 0.0, 1.0);\n\
hsb.z = hsb.z > czm_epsilon7 ? hsb.z + u_hsbShift.z : 0.0;\n\
rgb = czm_HSBToRGB(hsb);\n\
#endif\n\
float atmosphereAlpha = clamp((u_cameraAndRadiiAndDynamicAtmosphereColor.y - u_cameraAndRadiiAndDynamicAtmosphereColor.x) / (u_cameraAndRadiiAndDynamicAtmosphereColor.y - u_cameraAndRadiiAndDynamicAtmosphereColor.z), 0.0, 1.0);\n\
float nightAlpha = (u_cameraAndRadiiAndDynamicAtmosphereColor.w > 0.0) ? clamp(dot(normalize(czm_viewerPositionWC), normalize(czm_sunPositionWC)), 0.0, 1.0) : 1.0;\n\
atmosphereAlpha *= pow(nightAlpha, 0.5);\n\
gl_FragColor = vec4(rgb, mix(rgb.b, 1.0, atmosphereAlpha) * smoothstep(0.0, 1.0, czm_morphTime));\n\
}\n\
";
});