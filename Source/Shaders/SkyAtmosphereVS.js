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
    return "/**\n\
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
 * Modifications made by Analytical Graphics, Inc.\n\
 */\n\
\n\
 // Code:  http://sponeil.net/\n\
 // GPU Gems 2 Article:  http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter16.html\n\
\n\
attribute vec4 position;\n\
\n\
uniform vec4 u_cameraAndRadiiAndDynamicAtmosphereColor; // Camera height, outer radius, inner radius, dynamic atmosphere color flag\n\
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
varying vec3 v_rayleighColor;\n\
varying vec3 v_mieColor;\n\
varying vec3 v_toCamera;\n\
\n\
float scale(float cosAngle)\n\
{\n\
    float x = 1.0 - cosAngle;\n\
    return rayleighScaleDepth  * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));\n\
}\n\
\n\
void main(void)\n\
{\n\
    // Unpack attributes\n\
    float cameraHeight = u_cameraAndRadiiAndDynamicAtmosphereColor.x;\n\
    float outerRadius = u_cameraAndRadiiAndDynamicAtmosphereColor.y;\n\
    float innerRadius = u_cameraAndRadiiAndDynamicAtmosphereColor.z;\n\
\n\
    // Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)\n\
    vec3 positionV3 = position.xyz;\n\
    vec3 ray = positionV3 - czm_viewerPositionWC;\n\
    float far = length(ray);\n\
    ray /= far;\n\
    float atmosphereScale = 1.0 / (outerRadius - innerRadius);\n\
\n\
#ifdef SKY_FROM_SPACE\n\
    // Calculate the closest intersection of the ray with the outer atmosphere (which is the near point of the ray passing through the atmosphere)\n\
    float B = 2.0 * dot(czm_viewerPositionWC, ray);\n\
    float C = cameraHeight * cameraHeight - outerRadius * outerRadius;\n\
    float det = max(0.0, B*B - 4.0 * C);\n\
    float near = 0.5 * (-B - sqrt(det));\n\
\n\
    // Calculate the ray's starting position, then calculate its scattering offset\n\
    vec3 start = czm_viewerPositionWC + ray * near;\n\
    far -= near;\n\
    float startAngle = dot(ray, start) / outerRadius;\n\
    float startDepth = exp(-1.0 / rayleighScaleDepth );\n\
    float startOffset = startDepth*scale(startAngle);\n\
#else // SKY_FROM_ATMOSPHERE\n\
    // Calculate the ray's starting position, then calculate its scattering offset\n\
    vec3 start = czm_viewerPositionWC;\n\
    float height = length(start);\n\
    float depth = exp((atmosphereScale / rayleighScaleDepth ) * (innerRadius - cameraHeight));\n\
    float startAngle = dot(ray, start) / height;\n\
    float startOffset = depth*scale(startAngle);\n\
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
    vec3 lightDir = (u_cameraAndRadiiAndDynamicAtmosphereColor.w > 0.0) ? czm_sunPositionWC - czm_viewerPositionWC : czm_viewerPositionWC;\n\
    lightDir = normalize(lightDir);\n\
\n\
    for(int i=0; i<nSamples; i++)\n\
    {\n\
        float height = length(samplePoint);\n\
        float depth = exp((atmosphereScale / rayleighScaleDepth ) * (innerRadius - height));\n\
        float fLightAngle = dot(lightDir, samplePoint) / height;\n\
        float fCameraAngle = dot(ray, samplePoint) / height;\n\
        float fScatter = (startOffset + depth*(scale(fLightAngle) - scale(fCameraAngle)));\n\
        vec3 attenuate = exp(-fScatter * (InvWavelength * Kr4PI + Km4PI));\n\
        frontColor += attenuate * (depth * scaledLength);\n\
        samplePoint += sampleRay;\n\
    }\n\
\n\
    // Finally, scale the Mie and Rayleigh colors and set up the varying variables for the pixel shader\n\
    v_mieColor = frontColor * KmESun;\n\
    v_rayleighColor = frontColor * (InvWavelength * KrESun);\n\
    v_toCamera = czm_viewerPositionWC - positionV3;\n\
    gl_Position = czm_modelViewProjection * position;\n\
}\n\
";
});